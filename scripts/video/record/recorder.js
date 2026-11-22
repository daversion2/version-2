/**
 * In-page recorder for brief-driven training videos (see .claude/skills/training-video,
 * "From a brief"). Injected into the Studio tab with the Chrome DevTools MCP:
 *
 *   evaluate_script({ sourcePath: "scripts/training/record/recorder.js" })   → "installed"
 *
 * It draws a fake cursor (CDP clicks have none) with a click ripple, performs actions by
 * visible text instead of snapshot uids (which go stale on every re-render), and logs a
 * timestamped mark for every action. Marks are what turn a recording into an edit plan
 * without anyone reading contact sheets: `cut.mjs` maps each plan step to its mark.
 *
 * Every action takes a `label` (the plan step's `mark`) and returns `{ ok, … }`; on
 * `ok: false` nothing was clicked and `candidates` says what was on screen instead.
 *
 *   __rec.start()                                   at t = 0 of the screencast
 *   __rec.click("New", { label: "02-new", waitFor: "Create a Collection" })
 *   __rec.type({ field: "Name" }, "All Invoices", { label: "05-name" })
 *   __rec.check({ row: "Sales Meeting" }, { label: "03-pick-1" })     hidden-until-hover checkboxes
 *   __rec.point({ text: "High-Value Invoices" }, { label: "01-dynamic", hold: 2500 })
 *   __rec.hold(3000, "06-result")                   dwell on a result
 *   __rec.aim(target, { label }) … real click … __rec.done(label, { waitFor })
 *   __rec.export()                                  → { t0, marks, rects } (save with evaluate_script filePath)
 *   __rec.locate(target, { label })                 stills mode: where the step's highlight goes
 *   __rec.cursor(false)                             stills mode: no fake cursor in screenshots
 *
 * Targets: a string (visible text), or `{ text }`, `{ field }` (form control by its label,
 * aria-label or placeholder), `{ row, checkbox: true }`, `{ sel }` (CSS), `{ x, y }`;
 * add `role` ("tab", "menuitem", "option"…) when a text appears twice — a tab and the
 * sidebar link of the same name — `nth` to pick among equal matches, and `within`
 * (text of a container) to scope.
 * Marks persist in sessionStorage, so a full page load keeps them — but the overlay
 * itself must be re-injected after one (SPA navigation keeps it).
 */
() => {
    const KEY = "__rec_state";
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const norm = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/\*$/, "").trim();
    const load = () => {
        try {
            return JSON.parse(sessionStorage.getItem(KEY)) ?? { t0: null, marks: [] };
        } catch {
            return { t0: null, marks: [] };
        }
    };
    const save = () => {
        try {
            sessionStorage.setItem(KEY, JSON.stringify(state));
        } catch {
            /* private mode: marks still live in memory for this page */
        }
    };
    const state = window.__rec?.state ?? load();

    // ---- cursor overlay -----------------------------------------------------------
    const cursor = () => {
        let c = document.getElementById("__rec_cursor");
        if (c) return c;
        c = document.createElement("div");
        c.id = "__rec_cursor";
        c.style.cssText =
            "position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;" +
            "transition:transform .55s cubic-bezier(.4,0,.2,1);transform:translate(800px,450px)";
        c.innerHTML =
            '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.4 21.3 L14.2 20 L11.3 13.6 L17.5 13.6 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
        document.documentElement.appendChild(c);
        if (!document.getElementById("__rec_style")) {
            const st = document.createElement("style");
            st.id = "__rec_style";
            st.textContent =
                "@keyframes __rec_ripple{from{transform:translate(-50%,-50%) scale(.3);opacity:.85}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}" +
                ".__rec_ripple{position:fixed;width:44px;height:44px;border-radius:50%;background:rgba(80,70,229,.35);border:2px solid rgba(80,70,229,.9);pointer-events:none;z-index:2147483646;animation:__rec_ripple .6s ease-out forwards}";
            document.documentElement.appendChild(st);
        }
        return c;
    };
    let pos = { x: 800, y: 450 };
    const moveTo = async (x, y, travel = 650) => {
        const far = Math.hypot(x - pos.x, y - pos.y) > 4;
        pos = { x, y };
        cursor().style.transform = `translate(${x - 3}px,${y - 2}px)`;
        if (far) await sleep(travel);
    };
    const ripple = (x, y) => {
        const r = document.createElement("div");
        r.className = "__rec_ripple";
        r.style.left = `${x}px`;
        r.style.top = `${y}px`;
        document.documentElement.appendChild(r);
        setTimeout(() => r.remove(), 700);
    };
    // Real mouse input (a DevTools click) moves the overlay too.
    if (!window.__rec) {
        document.addEventListener("mousemove", (e) => e.isTrusted && moveTo(e.clientX, e.clientY, 0), true);
        document.addEventListener("pointerdown", (e) => e.isTrusted && ripple(e.clientX, e.clientY), true);
    }

    // ---- marks ----------------------------------------------------------------------
    const open = {};
    const markStart = (label) => {
        if (!label) return;
        open[label] = Date.now();
    };
    const markEnd = (label, extra = {}) => {
        if (!label) return;
        state.marks.push({ label, start: open[label] ?? Date.now(), end: Date.now(), ...extra });
        delete open[label];
        save();
    };

    // ---- finding things -------------------------------------------------------------
    const visible = (el) => {
        if (!el || !el.isConnected) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
    };
    const INTERACTIVE =
        "button,a,input,textarea,select,label,[role=button],[role=tab],[role=menuitem],[role=option],[role=switch],[role=checkbox],[role=combobox],[role=link],[role=row],tr,[tabindex]";
    /** The scope to search: the top open dialog if there is one (modals cover the page). */
    const scopeFor = (within) => {
        if (within) {
            // Prefer a match inside an open dialog (the page behind often repeats its title).
            const leaves = leafMatches(document.body, within);
            const c = leaves.find((l) => l.closest("[role=dialog]")) ?? leaves[0];
            return c?.closest("[role=dialog],[role=menu],form,section,tr,[role=row],li") ?? c?.parentElement?.parentElement ?? document.body;
        }
        // Only real popups: tooltips are also rendered as poppers and must not capture the search.
        const dialogs = [...document.querySelectorAll("[role=dialog],[role=menu],[role=listbox],[data-radix-popper-content-wrapper]")].filter((d) => {
            if (!visible(d) || d.querySelector("[role=tooltip]") || d.getAttribute("role") === "tooltip") return false;
            const r = d.getBoundingClientRect();
            return r.width * r.height > 120 * 60 && d.querySelector("button,a,input,textarea,[role=option],[role=menuitem],[tabindex]");
        });
        return dialogs.length ? dialogs : [document.body];
    };
    const ownText = (el) => norm(el.innerText ?? el.textContent);
    /** Elements whose text matches, innermost first: exact, then prefix, then substring. */
    const leafMatches = (root, text) => {
        const want = norm(text).toLowerCase();
        const roots = Array.isArray(root) ? root : [root];
        // textContent first (cheap), so innerText/layout only runs on plausible hits.
        const all = roots
            .flatMap((r) => [...r.querySelectorAll("*")])
            .filter((el) => norm(el.textContent).toLowerCase().includes(want) || norm(el.getAttribute("aria-label")).toLowerCase() === want)
            .filter(visible);
        const rank = (el) => {
            const t = ownText(el).toLowerCase();
            const aria = norm(el.getAttribute("aria-label")).toLowerCase();
            if (t === want || aria === want) return 0;
            if (t.startsWith(want)) return 1;
            if (t.includes(want)) return 2;
            return 9;
        };
        const hits = all.map((el) => ({ el, r: rank(el) })).filter((h) => h.r < 9);
        if (!hits.length) return [];
        const best = Math.min(...hits.map((h) => h.r));
        // Innermost: drop any hit that contains another hit of the same rank.
        const same = hits.filter((h) => h.r === best).map((h) => h.el);
        return same.filter((el) => !same.some((o) => o !== el && el.contains(o)));
    };
    const fieldControl = (roots, name) => {
        const want = norm(name).toLowerCase();
        const list = Array.isArray(roots) ? roots : [roots];
        for (const root of list) {
            const controls = [...root.querySelectorAll("input,textarea,select,[role=switch],[role=combobox],[contenteditable=true]")].filter(visible);
            const direct = controls.find(
                (c) => norm(c.getAttribute("aria-label")).toLowerCase() === want || norm(c.getAttribute("placeholder")).toLowerCase() === want,
            );
            if (direct) return direct;
            for (const lab of leafMatches(root, name)) {
                const forId = lab.closest("label")?.htmlFor;
                if (forId && document.getElementById(forId)) return document.getElementById(forId);
                let box = lab;
                for (let i = 0; i < 4 && box; i++, box = box.parentElement) {
                    const c = [...box.querySelectorAll("input,textarea,select,[role=switch],[role=combobox],[contenteditable=true]")].find(visible);
                    if (c) return c;
                }
            }
        }
        return null;
    };
    /** Search the open popup first; if it has no match (a non-modal panel), the page. */
    const resolve = async (target) => {
        const first = await resolveIn(target, false);
        if (first.el || first.point) return first;
        const again = await resolveIn(target, true);
        return again.el || again.point ? again : first;
    };
    const resolveIn = async (target, wholePage) => {
        const t = typeof target === "string" ? { text: target } : target ?? {};
        if (t.x !== undefined) return { point: { x: t.x, y: t.y } };
        const scope = wholePage && !t.within ? [document.body] : scopeFor(t.within);
        let el = null;
        if (t.sel) el = [...(Array.isArray(scope) ? scope : [scope]).flatMap((s) => [...s.querySelectorAll(t.sel)])].filter(visible)[t.nth ?? 0];
        else if (t.field) el = fieldControl(scope, t.field);
        else if (t.row) {
            const leaf = leafMatches(scope, t.row)[t.nth ?? 0];
            const row = leaf?.closest("tr,[role=row]") ?? leaf?.parentElement;
            if (row && t.checkbox) {
                // Row checkboxes are often hidden until the row is hovered.
                for (const type of ["pointerover", "pointerenter", "mouseover", "mouseenter"]) row.dispatchEvent(new MouseEvent(type, { bubbles: true }));
                await sleep(150);
                const box = row.querySelector("input[type=checkbox],[role=checkbox]");
                if (box && visible(box)) return { el: box };
                const r = row.getBoundingClientRect();
                return { el: box ?? row, point: { x: r.left + 20, y: r.top + r.height / 2 } };
            }
            el = row;
        } else if (t.text) {
            // `role` narrows equal texts (a "Prompts" tab vs the "Prompts" nav link).
            const leaves = leafMatches(scope, t.text).filter((l) => !t.role || l.closest(`[role=${t.role}]`));
            const leaf = leaves[t.nth ?? 0];
            if (leaf && t.role) {
                el = leaf.closest(`[role=${t.role}]`);
                return el ? { el } : { candidates: candidates(scope) };
            }
            el = leaf ? leaf.closest(INTERACTIVE) ?? leaf : null;
            if (el && !visible(el)) el = leaf;
        }
        if (!el) return { candidates: candidates(scope) };
        return { el };
    };
    const candidates = (scope) =>
        (Array.isArray(scope) ? scope : [scope])
            .flatMap((s) => [...s.querySelectorAll("button,a,[role=tab],[role=menuitem],[role=option],label")])
            .filter(visible)
            .map((e) => ownText(e) || e.getAttribute("aria-label"))
            .filter(Boolean)
            .slice(0, 40);
    const centre = (found) => {
        if (found.point) return found.point;
        found.el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const r = found.el.getBoundingClientRect();
        // Aim near the start of wide things (rows, long buttons): that's where a person clicks.
        return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2 };
    };

    // ---- waiting --------------------------------------------------------------------
    const waitUntil = async (opts) => {
        const deadline = Date.now() + (opts.timeout ?? 15000);
        const ok = () => {
            const text = document.body.innerText;
            if (opts.waitFor && ![].concat(opts.waitFor).some((w) => text.includes(w))) return false;
            if (opts.waitGone && [].concat(opts.waitGone).some((w) => text.includes(w))) return false;
            return true;
        };
        while (!ok()) {
            if (Date.now() > deadline) return false;
            await sleep(150);
        }
        return true;
    };

    // ---- actions --------------------------------------------------------------------
    const fire = (el, x, y) => {
        const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, view: window };
        const p = { ...base, pointerId: 1, pointerType: "mouse", isPrimary: true };
        el.dispatchEvent(new PointerEvent("pointerover", p));
        el.dispatchEvent(new MouseEvent("mouseover", base));
        el.dispatchEvent(new PointerEvent("pointerdown", { ...p, buttons: 1 }));
        el.dispatchEvent(new MouseEvent("mousedown", { ...base, buttons: 1 }));
        if (typeof el.focus === "function") el.focus({ preventScroll: true });
        el.dispatchEvent(new PointerEvent("pointerup", p));
        el.dispatchEvent(new MouseEvent("mouseup", base));
        el.dispatchEvent(new MouseEvent("click", base));
    };
    const finish = async (label, opts, extra) => {
        const waited = opts.waitFor || opts.waitGone ? await waitUntil(opts) : true;
        if (opts.hold) await sleep(opts.hold);
        markEnd(label, extra);
        return { ok: waited, label, ...(waited ? {} : { error: `timed out waiting for ${JSON.stringify(opts.waitFor ?? opts.waitGone)}` }) };
    };

    const api = {
        state,
        version: 2,
        /** Call right after screencast_start: t = 0 of the recording. Clears old marks. */
        start() {
            state.t0 = Date.now();
            state.marks = [];
            save();
            cursor();
            return { ok: true, t0: state.t0 };
        },
        async point(target, opts = {}) {
            const found = await resolve(target);
            if (!found.el && !found.point) return { ok: false, label: opts.label, error: "not found", candidates: found.candidates };
            markStart(opts.label);
            const { x, y } = centre(found);
            await moveTo(x, y);
            return finish(opts.label, { hold: 1500, ...opts });
        },
        async click(target, opts = {}) {
            const found = await resolve(target);
            if (!found.el && !found.point) return { ok: false, label: opts.label, error: "not found", candidates: found.candidates };
            markStart(opts.label);
            const { x, y } = centre(found);
            await moveTo(x, y);
            await sleep(250);
            ripple(x, y);
            const el = found.el ?? document.elementFromPoint(x, y);
            fire(el, x, y);
            return finish(opts.label, { hold: 600, ...opts });
        },
        async check(target, opts = {}) {
            return api.click({ ...(typeof target === "string" ? { row: target } : target), checkbox: true }, opts);
        },
        async type(target, text, opts = {}) {
            const found = await resolve(target);
            if (!found.el) return { ok: false, label: opts.label, error: "not found", candidates: found.candidates };
            markStart(opts.label);
            const el = found.el;
            const { x, y } = centre(found);
            await moveTo(x, y);
            ripple(x, y);
            fire(el, x, y);
            await sleep(200);
            const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (!setter || !("value" in el)) {
                markEnd(opts.label);
                return { ok: false, label: opts.label, error: "not a text input — use aim/done with type_text" };
            }
            let value = opts.clear === false ? el.value : "";
            setter.call(el, value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            // Visible typing, but never more than ~3 s however long the text is.
            const per = Math.max(8, Math.min(1000 / (opts.cps ?? 22), 3000 / Math.max(1, text.length)));
            for (const ch of text) {
                value += ch;
                setter.call(el, value);
                el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
                await sleep(per);
            }
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return finish(opts.label, { hold: 500, ...opts });
        },
        /** Dwell on what's on screen (a result, a dialog) with no action. */
        async hold(ms, label) {
            markStart(label);
            await sleep(ms);
            markEnd(label);
            return { ok: true, label };
        },
        /** For controls synthetic events can't drive (code editors, native pickers):
         * aim and start the mark here, do the real click/type_text with DevTools, then done(). */
        async aim(target, opts = {}) {
            const found = await resolve(target);
            if (!found.el && !found.point) return { ok: false, label: opts.label, error: "not found", candidates: found.candidates };
            markStart(opts.label);
            const { x, y } = centre(found);
            await moveTo(x, y);
            return { ok: true, label: opts.label, x, y };
        },
        async done(label, opts = {}) {
            return finish(label, { hold: 600, ...opts });
        },
        /** Stills mode: remember where `target` is for step `label` (or take `opts.box`, or with
         * `opts.union: [targetA, targetB]` the box around several), so the still rendered from
         * the screenshot taken next can highlight it. `target` null = no highlight (a whole-
         * screen still). Returns the box in CSS px of the 1600×900 viewport. */
        async locate(target, opts = {}) {
            state.rects = state.rects ?? {};
            if (opts.union && !opts.box) {
                const boxes = [];
                for (const t of opts.union) {
                    const f = await resolve(t);
                    if (f.el) boxes.push(f.el.getBoundingClientRect());
                }
                if (boxes.length) {
                    const x = Math.min(...boxes.map((b) => b.left)), y = Math.min(...boxes.map((b) => b.top));
                    opts = { ...opts, box: { x: Math.round(x - 8), y: Math.round(y - 8), w: Math.round(Math.max(...boxes.map((b) => b.right)) - x + 16), h: Math.round(Math.max(...boxes.map((b) => b.bottom)) - y + 16) } };
                }
            }
            let box = opts.box ?? null; // an explicit {x,y,w,h}, e.g. a region spanning several controls
            if (target && !box) {
                const found = await resolve(target);
                if (!found.el && !found.point) return { ok: false, label: opts.label, error: "not found", candidates: found.candidates };
                if (found.el) {
                    found.el.scrollIntoView({ block: "nearest", inline: "nearest" });
                    const r = found.el.getBoundingClientRect();
                    box = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
                } else box = { x: found.point.x - 20, y: found.point.y - 20, w: 40, h: 40 };
                if (opts.pad !== 0) {
                    const p = opts.pad ?? 6;
                    box = { x: box.x - p, y: box.y - p, w: box.w + 2 * p, h: box.h + 2 * p };
                }
            }
            state.rects[opts.label] = { box, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, at: Date.now() };
            save();
            return { ok: true, label: opts.label, box };
        },
        /** Show or hide the fake cursor (hide it for stills: the render draws its own). */
        cursor(on = true) {
            const c = cursor();
            c.style.display = on ? "" : "none";
            return { ok: true, cursor: on };
        },
        moveTo,
        marks: () => state.marks,
        export: () => ({ t0: state.t0, marks: state.marks, rects: state.rects ?? {}, url: location.href }),
    };
    window.__rec = api;
    cursor();
    return state.t0 ? `installed (recording since ${new Date(state.t0).toISOString()}, ${state.marks.length} marks)` : "installed";
}

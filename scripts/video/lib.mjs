/**
 * Pure helpers for the Neuro-Nudge video pipeline (.claude/skills/neuro-video).
 *
 * Everything here is deterministic and free of I/O so it can be tested with
 * `node --test scripts/video/`; the scripts beside it do the ffmpeg, simulator and
 * file work and call into this module for the decisions.
 */

/** The output frame: portrait 9:16. */
export const STAGE = { w: 1080, h: 1920 };
/** The band under the phone that holds the burned-in captions. */
export const CAPTION_BAND = 290;
const FRAME_TOP = 56;

const round2 = (n) => Math.round(n * 100) / 100;

/** "Log a Meal (quick)" → "log-a-meal-quick". */
export function slugify(name) {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "video";
}

/** Seconds → `m:ss` (or `h:mm:ss`). */
export function formatTimestamp(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Seconds → VTT `hh:mm:ss.mmm`. */
export function vttTime(seconds) {
    const v = Math.max(0, seconds);
    const h = Math.floor(v / 3600);
    const m = Math.floor((v % 3600) / 60);
    const s = v % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

/** Section start times in the finished cut, from the engine's sync report. */
export function sectionStarts(syncReport) {
    const starts = {};
    let t = 0;
    for (const s of syncReport.sections ?? []) {
        starts[s.id] = round2(t);
        t += s.total;
    }
    return starts;
}

/** Split narration into sentences for captions. */
export function sentences(text) {
    return (
        String(text)
            .replace(/\s+/g, " ")
            .trim()
            // A period inside a word or number ("3.5", "e.g") doesn't end a sentence.
            .match(/(?:[^.!?]|[.!?](?=\w))+(?:[.!?]+["')\]]?|$)/g)
            ?.map((s) => s.trim())
            .filter(Boolean) ?? []
    );
}

/** Start of a phrase in Whisper word times; case/punctuation-insensitive, first four letters per word. */
export function phraseStart(words, phrase) {
    const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const target = phrase.split(/\s+/).map(norm).filter(Boolean);
    if (!target.length) return null;
    for (let i = 0; i < words.length; i++) {
        let ok = true;
        for (let k = 0; k < target.length; k++) {
            if (!words[i + k] || !norm(words[i + k].w).startsWith(target[k].slice(0, 4))) {
                ok = false;
                break;
            }
        }
        if (ok) return words[i].s;
    }
    return null;
}

/**
 * Break a sentence into caption-sized chunks (two short lines on a phone). Prefers to
 * break after punctuation once a chunk is at least half full; never splits a word.
 */
export function captionChunks(sentence, max = 58) {
    const chunks = [];
    let cur = "";
    for (const word of String(sentence).trim().split(/\s+/).filter(Boolean)) {
        const next = cur ? `${cur} ${word}` : word;
        if (next.length > max && cur) {
            chunks.push(cur);
            cur = word;
        } else cur = next;
        if (cur.length >= max / 2 && /[,;:]$/.test(cur)) {
            chunks.push(cur);
            cur = "";
        }
    }
    if (cur) chunks.push(cur);
    // No stranded last words ("with it."): borrow from the chunk before.
    while (chunks.length > 1 && chunks.at(-1).length < 12) {
        const prev = chunks.at(-2).split(" ");
        if (prev.length < 2) break;
        const moved = prev.pop();
        chunks[chunks.length - 2] = prev.join(" ");
        chunks[chunks.length - 1] = `${moved} ${chunks.at(-1)}`;
    }
    return chunks;
}

/**
 * Caption cues for the finished video, written from the narration script (so names are
 * spelled right) and timed from Whisper's word times of the generated audio.
 *
 * `sections`: `[{ offset, text, words, duration }]`: `offset` is when the section's audio
 * starts in the cut, `words` its word times, `duration` the audio length. A sentence whose
 * start can't be found is placed proportionally, so one mismatch never breaks the file.
 * Each sentence's time is shared across its chunks by character count.
 */
export function captionCues(sections) {
    const cues = [];
    for (const sec of sections) {
        const list = sentences(sec.text);
        const totalChars = list.reduce((a, s) => a + s.length, 0) || 1;
        let charsBefore = 0;
        let searchFrom = 0;
        const starts = list.map((s) => {
            const proportional = (charsBefore / totalChars) * sec.duration;
            charsBefore += s.length;
            const probe = s.split(/\s+/).slice(0, 3).join(" ");
            const later = sec.words.filter((w) => w.s >= searchFrom);
            const found = phraseStart(later, probe);
            const at = found ?? Math.max(searchFrom, proportional);
            searchFrom = at + 0.01;
            return at;
        });
        list.forEach((s, i) => {
            const start = sec.offset + starts[i];
            const end = sec.offset + (i + 1 < list.length ? starts[i + 1] : sec.duration);
            if (end <= start) return;
            const chunks = captionChunks(s);
            const chars = chunks.reduce((a, c) => a + c.length, 0);
            let t = start;
            chunks.forEach((text, k) => {
                const next = k === chunks.length - 1 ? end : t + ((end - start) * text.length) / chars;
                cues.push({ start: t, end: next, text });
                t = next;
            });
        });
    }
    return cues;
}

/** WebVTT for a list of cues. */
export function cuesToVtt(cues) {
    return ["WEBVTT", ...cues.map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`)].join("\n\n") + "\n";
}

/**
 * The image sequence that plays the captions over the video: `[{ cue, duration }]`, with
 * `cue: null` for the gaps. Times are absolute, so rounding never accumulates into drift.
 */
export function captionTimeline(cues, total) {
    const out = [];
    let t = 0;
    cues.forEach((c, i) => {
        const start = Math.max(t, c.start);
        const end = Math.min(total, c.end);
        if (end <= start) return;
        if (start > t) out.push({ cue: null, duration: round3(start - t) });
        out.push({ cue: i, duration: round3(end - start) });
        t = end;
    });
    if (total > t) out.push({ cue: null, duration: round3(total - t) });
    return out;
}
const round3 = (n) => Math.round(n * 1000) / 1000;

// ---- plans ---------------------------------------------------------------------

const planWords = (s) =>
    String(s)
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

/** Where `phrase` starts in `text`, as a word index, or -1. */
function phraseIndex(text, phrase, from = 0) {
    const t = planWords(text);
    const p = planWords(phrase);
    if (!p.length) return -1;
    for (let i = from; i <= t.length - p.length; i++) if (p.every((w, k) => t[i + k] === w)) return i;
    return -1;
}

/**
 * Check a plan (content/videos/<slug>/plan.json) before capture. Returns human-readable
 * problems; empty means it's capturable.
 *
 * Each section needs an id, a label, narration and steps; every step a unique `mark`;
 * a later step's `sync` must appear in the narration, in step order. A `then: "tap"` step
 * needs a `target` to tap.
 */
export function validatePlan(plan) {
    const problems = [];
    if (!plan?.title) problems.push("plan has no title");
    if (!plan?.sections?.length) return [...problems, "plan has no sections"];
    const marks = new Set();
    const ids = new Set();
    for (const sec of plan.sections) {
        const where = `section ${sec.id ?? "?"}`;
        if (!sec.id) problems.push("a section has no id");
        else if (ids.has(sec.id)) problems.push(`${where}: duplicate section id`);
        ids.add(sec.id);
        if (!sec.label) problems.push(`${where}: no label`);
        if (!sec.narration?.trim()) problems.push(`${where}: no narration`);
        if (!sec.steps?.length) {
            problems.push(`${where}: no steps`);
            continue;
        }
        let cursor = 0;
        sec.steps.forEach((step, i) => {
            if (!step.mark) problems.push(`${where} step ${i + 1}: no mark`);
            else if (marks.has(step.mark)) problems.push(`${where}: duplicate mark "${step.mark}"`);
            marks.add(step.mark);
            if (step.then === "tap" && !step.target?.text && !step.target?.id) {
                problems.push(`${where} step "${step.mark}": then "tap" needs a target with text or id`);
            }
            if (i === 0) {
                if (step.sync) problems.push(`${where} step "${step.mark}": the first step needs no sync (its clip starts the section)`);
                return;
            }
            if (!step.sync) return; // plays straight after the previous clip
            const at = phraseIndex(sec.narration ?? "", step.sync, cursor);
            if (at < 0) {
                const anywhere = phraseIndex(sec.narration ?? "", step.sync) >= 0;
                problems.push(`${where} step "${step.mark}": sync "${step.sync}" ${anywhere ? "is out of order in" : "is not in"} the narration`);
            } else cursor = at + 1;
        });
    }
    return problems;
}

/**
 * Turn a plan and rec.json into revoice.json sections of still clips:
 * `{ still, box, kind, zoom, prev, from, notes, sync }`, or `{ diagram, from, to, sync }`.
 *
 * `rec` is `{ device: { w, h, scale }, rects: { <mark>: { box: {x,y,w,h} | null } } }`, boxes
 * in device points. `prev` is the previous still, so each clip cross-fades from it; `from`
 * is where that still's camera ended, so the next clip moves on instead of snapping back.
 * `kind` defaults to "click" with a box and "none" without. A step with no recorded rect
 * is reported in `missing`.
 */
export function planToStills(plan, rec) {
    const rects = rec.rects ?? {};
    const missing = [];
    let prev = null;
    let prevCam = null;
    const sections = plan.sections.map((sec) => {
        const clips = [];
        sec.steps.forEach((step, i) => {
            if (step.diagram) {
                const clip = { diagram: step.diagram };
                if (step.from !== undefined) clip.from = step.from;
                if (step.to !== undefined) clip.to = step.to;
                if (i > 0 && step.sync) clip.sync = step.sync;
                clips.push(clip);
                prev = null;
                prevCam = null;
                return;
            }
            const r = rects[step.mark];
            if (!r) {
                missing.push(step.mark);
                return;
            }
            const still = `stills/${step.mark}.png`;
            const clip = { still, kind: step.kind ?? (r.box ? "click" : "none") };
            if (r.box) clip.box = [r.box.x, r.box.y, r.box.w, r.box.h];
            if (step.zoom && step.zoom > 1) clip.zoom = step.zoom;
            if (step.tags?.length || step.arrows?.length) clip.notes = { tags: step.tags ?? [], arrows: step.arrows ?? [] };
            if (prev) clip.prev = prev;
            if (prev && prevCam) clip.from = prevCam;
            if (i > 0 && step.sync) clip.sync = step.sync;
            clips.push(clip);
            prev = still;
            prevCam = clip.box ? { box: clip.box, ...(clip.zoom ? { zoom: clip.zoom } : {}), kind: clip.kind, ...(clip.notes ? { notes: clip.notes } : {}) } : null;
        });
        if (clips[0]?.sync) delete clips[0].sync;
        return { id: sec.id, label: sec.label, narration: sec.narration, clips, ...(sec.tail !== undefined ? { tail: sec.tail } : {}) };
    });
    return { revoice: { title: plan.title, mode: "stills", device: rec.device, sections }, missing };
}

/**
 * Where the phone screen sits on the 9:16 stage: as large as fits above the caption band,
 * centred. An iPhone screen is taller than 9:16, so height is normally the limit.
 */
export function frameLayout(device) {
    const maxW = STAGE.w - 64;
    const maxH = STAGE.h - CAPTION_BAND - FRAME_TOP;
    const s = Math.min(maxW / device.w, maxH / device.h);
    const w = Math.round(device.w * s);
    const h = Math.round(device.h * s);
    return { x: Math.round((STAGE.w - w) / 2), y: FRAME_TOP + Math.round((maxH - h) / 2), w, h };
}

// ---- maestro hierarchy ---------------------------------------------------------

/** "[10,20][110,64]" → { x: 10, y: 20, w: 100, h: 44 }, or null. */
export function parseBounds(bounds) {
    const m = /^\[(-?[\d.]+),(-?[\d.]+)\]\[(-?[\d.]+),(-?[\d.]+)\]$/.exec(String(bounds ?? "").trim());
    if (!m) return null;
    const [x1, y1, x2, y2] = m.slice(1).map(Number);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** `maestro hierarchy` output → the parsed tree. Tolerates log lines before the JSON. */
export function parseHierarchy(output) {
    const text = String(output);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("no JSON in maestro hierarchy output");
    return JSON.parse(text.slice(start, end + 1));
}

/** Every node with bounds, in document order: `{ text, id, box }`. */
export function flattenHierarchy(root) {
    const out = [];
    const walk = (n) => {
        const a = n?.attributes ?? {};
        const box = parseBounds(a.bounds);
        if (box) {
            out.push({
                // iOS keeps labels in accessibilityText; `text` holds only system chrome.
                labels: [a.accessibilityText, a.text, a.hintText, a.value].filter(Boolean),
                id: a["resource-id"] || "",
                box,
            });
        }
        (n?.children ?? []).forEach(walk);
    };
    walk(root);
    return out;
}

/**
 * The screen size in points, from the screenshot's pixels: the node at the origin whose
 * size is the screenshot divided by a whole scale. Falls back to @3x.
 */
export function deviceSize(nodes, px) {
    for (const scale of [3, 2]) {
        const w = px.w / scale;
        const h = px.h / scale;
        if (nodes.some((n) => n.box.x === 0 && n.box.y === 0 && Math.abs(n.box.w - w) < 1 && Math.abs(n.box.h - h) < 1)) {
            return { w, h, scale };
        }
    }
    return { w: px.w / 3, h: px.h / 3, scale: 3 };
}

const isOnScreen = (b, device) => b.w > 0 && b.h > 0 && b.x < device.w && b.y < device.h && b.x + b.w > 0 && b.y + b.h > 0;

/** Clip a box to the screen, after padding it so the ring doesn't sit on the control. */
export function padBox(b, device, pad = 4) {
    const x = Math.max(0, b.x - pad);
    const y = Math.max(0, b.y - pad);
    return { x, y, w: Math.min(device.w, b.x + b.w + pad) - x, h: Math.min(device.h, b.y + b.h + pad) - y };
}

/**
 * Find a control. `target` is `{ text?, id?, index?, pad? }`, or `{ union: [t1, t2] }` for a
 * region. `text` and `id` are full-string regexes, the same rule as Maestro's selectors,
 * so a plan can use one selector for the highlight and the tap (iOS labels often gain a
 * leading comma: use ".*Reps"). The smallest visible match wins, because wrappers repeat a
 * child's label; `index` picks the nth visible match in document order instead.
 */
export function findControl(nodes, target, device) {
    if (target.union) {
        const parts = target.union.map((t) => findControl(nodes, t, device));
        const bad = parts.find((p) => !p.box);
        if (bad) return bad;
        const x = Math.min(...parts.map((p) => p.box.x));
        const y = Math.min(...parts.map((p) => p.box.y));
        const x2 = Math.max(...parts.map((p) => p.box.x + p.box.w));
        const y2 = Math.max(...parts.map((p) => p.box.y + p.box.h));
        return { box: { x, y, w: x2 - x, h: y2 - y } };
    }
    const textRe = target.text ? new RegExp(`^(?:${target.text})$`, "s") : null;
    const idRe = target.id ? new RegExp(`^(?:${target.id})$`) : null;
    const hits = nodes.filter(
        (n) => isOnScreen(n.box, device) && (!textRe || n.labels.some((l) => textRe.test(l))) && (!idRe || idRe.test(n.id)) && (textRe || idRe),
    );
    if (!hits.length) {
        const candidates = [...new Set(nodes.filter((n) => isOnScreen(n.box, device)).flatMap((n) => n.labels))].slice(0, 40);
        return { box: null, candidates };
    }
    const hit = target.index !== undefined ? hits[target.index] : [...hits].sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0];
    if (!hit) return { box: null, candidates: hits.flatMap((n) => n.labels) };
    return { box: padBox(hit.box, device, target.pad ?? 4) };
}

// ---- brand ---------------------------------------------------------------------

/**
 * CSS variables for the scenes, read from src/constants/theme.ts so a brand change
 * reaches the videos. The redesign's `dark` (the look everyone has) wins over the classic one.
 */
export function themeTokens(themeSource) {
    const block = (name) => new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\}`).exec(themeSource)?.[1] ?? "";
    const hex = (src, key) => new RegExp(`\\b${key}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(src)?.[1];
    const colors = block("Colors");
    const redesign = block("REDESIGN");
    const need = { primary: hex(colors, "primary"), accent: hex(colors, "secondary"), white: hex(colors, "white"), ink: hex(redesign, "dark") ?? hex(colors, "dark"), gray: hex(redesign, "gray") ?? hex(colors, "gray") };
    const missing = Object.entries(need).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`theme.ts: could not read ${missing.join(", ")}`);
    const font = /secondary:\s*'([^']+)'/.exec(block("Fonts"))?.[1] ?? "Avenir";
    const vars = Object.entries(need).map(([k, v]) => `  --${k}: ${v};`).join("\n");
    return `/* Generated from src/constants/theme.ts by revoice.mjs. Do not edit. */
:root {
${vars}
  --sans: "${font}", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}
html, body { margin: 0; padding: 0; width: ${STAGE.w}px; height: ${STAGE.h}px; overflow: hidden; background: var(--primary); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
#stage { position: absolute; left: 0; top: 0; width: ${STAGE.w}px; height: ${STAGE.h}px; overflow: hidden; background: var(--primary); }
`;
}

// ---- publishing ----------------------------------------------------------------

const START = "// <publish:start>";
const END = "// <publish:end>";

/**
 * Add or replace (by id) an entry in src/data/tutorials.ts, between its publish markers.
 * Entries are one JSON object per line, sorted by id, so diffs stay one line each.
 */
export function upsertTutorial(source, entry) {
    const a = source.indexOf(START);
    const b = source.indexOf(END);
    if (a < 0 || b < a) throw new Error("tutorials.ts: publish markers not found");
    const lineStart = source.lastIndexOf("\n", a) + 1;
    const indent = source.slice(lineStart, a);
    const body = source.slice(a + START.length, b);
    const entries = body
        .split("\n")
        .map((l) => l.trim().replace(/,$/, ""))
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((e) => e.id !== entry.id);
    entries.push(entry);
    entries.sort((x, y) => x.id.localeCompare(y.id));
    const lines = entries.map((e) => `${indent}${JSON.stringify(e)},\n`).join("");
    return `${source.slice(0, a + START.length)}\n${lines}${indent}${source.slice(b)}`;
}

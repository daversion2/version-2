/**
 * Pure helpers for the training-video pipeline (see .claude/skills/training-video).
 *
 * Everything here is deterministic and free of I/O so it can be unit-tested
 * (test/training-pipeline.test.ts); the scripts beside it do the ffmpeg, file and
 * engine work and call into this module for the decisions.
 */

/** "Content Basics (trimmed)" → "content-basics-trimmed". */
export function slugify(name) {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "video";
}

/** Seconds → `m:ss` (or `h:mm:ss`). Matches transcript.ts so lesson text and the
 * player's transcript read the same. */
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

function parseVttTime(stamp) {
    return stamp
        .replace(",", ".")
        .split(":")
        .map(Number)
        .reduce((total, part) => total * 60 + part, 0);
}

/**
 * Choose where to cut a raw recording.
 *
 * - **start**: `lead` seconds before the first speech, so the first word isn't clipped
 *   (Zoom recordings open on ~10–15 s of dead air while the presenter leaves full screen).
 * - **end**: just before the first picture change after the last speech (Zoom's closing
 *   name card), but never more than `tailMax` after the last word, and at least `tailMin`
 *   after it so the last word can ring out.
 *
 * `speech` is a list of `{start, end}` non-silent spans, `sceneChanges` the times of hard
 * picture changes; both in source seconds.
 */
export function pickTrim({ speech, sceneChanges = [], duration, lead = 0.5, tailMin = 0.8, tailMax = 2.5 }) {
    if (!speech.length) return { start: 0, end: duration };
    const firstSpeech = speech[0].start;
    const lastSpeech = speech[speech.length - 1].end;
    const start = Math.max(0, firstSpeech - lead);
    const card = sceneChanges.find((t) => t > lastSpeech + 0.2);
    let end = lastSpeech + tailMax;
    if (card !== undefined) end = Math.min(end, Math.max(lastSpeech + tailMin, card - 0.1));
    return { start: round2(start), end: round2(Math.min(duration, end)) };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Invert silencedetect's silent spans into speech spans over `[0, duration]`. */
export function speechSpans(silences, duration) {
    const spans = [];
    let cursor = 0;
    for (const { start, end } of silences) {
        if (start > cursor + 0.05) spans.push({ start: cursor, end: start });
        cursor = Math.max(cursor, end ?? duration);
    }
    if (cursor < duration - 0.05) spans.push({ start: cursor, end: duration });
    return spans;
}

/**
 * Shift a WebVTT file so it lines up with a trimmed cut: every cue moves `offset`
 * seconds earlier, cues wholly outside `[offset, end]` are dropped, the rest clamped.
 * Optional `replacements` fix systematic mishearings (`[["Vertigia", "Vertesia"]]`).
 */
export function shiftVtt(vtt, offset, end = Infinity, replacements = []) {
    const blocks = vtt.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split(/\n{2,}/);
    const out = ["WEBVTT"];
    let n = 0;
    const cueRe = /^((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})(.*)$/;
    for (const block of blocks) {
        const lines = block.split("\n");
        const at = lines.findIndex((l) => cueRe.test(l.trim()));
        if (at < 0) continue;
        const [, a, b] = cueRe.exec(lines[at].trim());
        const s = parseVttTime(a);
        const e = parseVttTime(b);
        if (e <= offset || s >= end) continue;
        let text = lines.slice(at + 1).join("\n");
        for (const [from, to] of replacements) text = text.split(from).join(to);
        out.push(`${++n}\n${vttTime(Math.max(0, s - offset))} --> ${vttTime(Math.min(end, e) - offset)}\n${text}`);
    }
    return out.join("\n\n") + "\n";
}

/** A paragraph that is a single-paragraph callout blockquote: `> **Tip:** …`. */
const CALLOUT_RE = /^> \*\*(Tip|Note|Warning|Caution):\*\*\s+/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Lift callout paragraphs (`> **Tip:** text`) out of text blocks into their own blocks
 * with `callout` set, so a lesson written as plain markdown gets the editor's callout
 * panels. Paragraphs inside fenced code are never touched. Ids are left empty for
 * `withStableIds` to mint.
 */
export function liftCallouts(blocks) {
    const out = [];
    for (const block of blocks) {
        if (block.kind !== "text" || block.callout) {
            out.push(block);
            continue;
        }
        const paragraphs = splitParagraphs(block.text);
        if (!paragraphs.some((p) => p.callout)) {
            out.push(block);
            continue;
        }
        let pending = [];
        const flush = () => {
            if (pending.length) out.push({ id: "", kind: "text", text: pending.join("\n\n") });
            pending = [];
        };
        for (const p of paragraphs) {
            if (!p.callout) {
                pending.push(p.text);
                continue;
            }
            flush();
            const m = CALLOUT_RE.exec(p.text);
            const body = p.text
                .slice(m[0].length)
                .split("\n")
                .map((l) => l.replace(/^>\s?/, ""))
                .join("\n");
            out.push({ id: "", kind: "text", text: body, callout: m[1].toLowerCase() });
        }
        flush();
    }
    return out;
}

/** Split markdown into blank-line-separated paragraphs, keeping fenced code whole. */
function splitParagraphs(text) {
    const paragraphs = [];
    let current = [];
    let fence = null;
    const flush = () => {
        if (current.length) {
            const t = current.join("\n");
            paragraphs.push({ text: t, callout: !fence && CALLOUT_RE.test(t) && t.split("\n").every((l) => l.startsWith(">")) });
        }
        current = [];
    };
    for (const line of text.split("\n")) {
        const f = FENCE_RE.exec(line);
        if (fence) {
            current.push(line);
            if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = null;
            continue;
        }
        if (f) {
            fence = f[1];
            current.push(line);
            continue;
        }
        if (line.trim() === "") flush();
        else current.push(line);
    }
    flush();
    return paragraphs;
}

/**
 * Resolve section timestamp markers in lesson markdown. A line `↪ [[03]]` points the
 * reader at section 03 of the finished video; with `starts` (section id → seconds) it
 * becomes `↪ 1:24 in the video`, and without (no video yet, or an unknown id) the
 * marker line is removed so no learner sees a dangling pointer.
 */
export function resolveTimestamps(markdown, starts) {
    return markdown.replace(/^↪ \[\[([\w-]+)\]\][^\n]*\n?(\n)?/gm, (whole, id, blank) => {
        const at = starts?.[id];
        if (at === undefined) return "";
        return `↪ ${formatTimestamp(at)} in the video\n${blank ?? ""}`;
    });
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

/** Start of a phrase in Whisper word times; same matching rule as the engine's
 * words.mjs (case/punctuation-insensitive, first four letters per word). */
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
 * Captions for the finished video, built from the narration script (so names are
 * spelled right — Whisper hears "Vertesia" a dozen ways) and timed from Whisper's word
 * times of the generated audio.
 *
 * `sections`: `[{ offset, text, words, duration }]`, where `offset` is when the
 * section's audio starts in the cut, `words` its Whisper word times (relative to the
 * section audio) and `duration` the audio length. Each sentence becomes a cue starting
 * where its first words are heard; a sentence whose start can't be found is placed
 * proportionally by character count, so one mismatch never breaks the file.
 */
export function captionsFromNarration(sections) {
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
            if (end > start) cues.push({ start, end, text: s });
        });
    }
    return ["WEBVTT", ...cues.map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`)].join("\n\n") + "\n";
}

// ---- brief-driven videos: plan + recorded marks → edit plan ------------------------

const words4 = (s) =>
    String(s)
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

/** Where `phrase` starts in `text`, as a word index (punctuation/case-insensitive), or -1. */
function phraseIndex(text, phrase, from = 0) {
    const t = words4(text);
    const p = words4(phrase);
    if (!p.length) return -1;
    for (let i = from; i <= t.length - p.length; i++) if (p.every((w, k) => t[i + k] === w)) return i;
    return -1;
}

/**
 * Check a brief-driven plan (training_videos/<slug>/plan.json) before recording.
 * Returns human-readable problems; empty means it's recordable.
 *
 * Each section needs an id, a label, narration and steps; every step a unique `mark`;
 * every step after a section's first a `sync` phrase that appears in the narration, in
 * step order (the engine cuts to the step's footage when that phrase is spoken). A
 * first step's `sync` is pointless — its clip starts with the section anyway.
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
 * Turn a plan and the recorder's marks into revoice.json sections, plus screenshot
 * suggestions for the lesson.
 *
 * `rec` is the recorder's export: `{ t0, marks: [{ label, start, end }] }` (epoch ms,
 * t0 = the screencast's first frame). `offset` is prep's cut start, so times land in
 * trimmed.mp4. Each step becomes one clip, from `pre` s before its action to `after` s
 * past its end (the action's own wait/hold is inside the mark) — so however long the
 * agent paused between actions, the pause never reaches the cut. A retaken step uses
 * its last mark. Steps with `shot` yield `{ name, t, crop }` taken just after the action.
 */
export function planToRevoice(plan, rec, { offset = 0, duration = Infinity } = {}) {
    const last = new Map();
    for (const m of rec.marks ?? []) last.set(m.label, m);
    const at = (ms) => (ms - rec.t0) / 1000 - offset;
    const missing = [];
    const shots = [];
    const sections = plan.sections.map((sec) => {
        const clips = [];
        sec.steps.forEach((step, i) => {
            const m = last.get(step.mark);
            if (!m) {
                missing.push(step.mark);
                return;
            }
            const clip = {
                in: round2(Math.max(0, at(m.start) - (step.pre ?? 0.3))),
                out: round2(Math.min(duration, at(m.end) + (step.after ?? 0.8))),
            };
            if (step.speed && step.speed !== 1) clip.speed = step.speed;
            if (i > 0 && step.sync) clip.sync = step.sync;
            if (clip.out > clip.in) clips.push(clip);
            if (step.shot) {
                const name = typeof step.shot === "string" ? step.shot : step.mark.replace(/^\d+-/, "");
                shots.push({ name: slugify(name), t: round2(Math.min(duration - 0.1, at(m.end) + 0.3)), crop: step.crop ?? "content" });
            }
        });
        // A section whose first step was lost must not open on a synced clip.
        if (clips[0]?.sync) delete clips[0].sync;
        return { id: sec.id, label: sec.label, narration: sec.narration, clips, ...(sec.tail !== undefined ? { tail: sec.tail } : {}) };
    });
    return { revoice: { title: plan.title, sections }, shots, missing };
}

/**
 * Stills mode (plan.mode === "stills"): each step is a screenshot `stills/<mark>.png` taken
 * during the take, with the box the recorder `locate`d for it. Returns revoice.json sections
 * whose clips are still clips — `{ still, box, kind, zoom, prev, sync }` — rendered by
 * revoice.mjs through the training-still scene, plus lesson screenshots for `shot` steps.
 *
 * `prev` is the previous step's still (across sections too) so each still cross-fades from
 * the last; the first still of the video has none. `from` is where that still's camera, ring,
 * cursor and callouts ended (`{ box, zoom?, kind?, notes? }`, only when it had a box), so the next clip moves
 * on from there instead of snapping back to the full screen. `kind` defaults to "click" when the
 * step has a box, "none" without; `zoom` to 1 (none). A step with no recorded rect has no
 * screenshot to show and is reported in `missing`.
 */
export function planToStills(plan, rec) {
    const rects = rec.rects ?? {};
    const missing = [];
    const shots = [];
    let prev = null;
    let prevCam = null;
    const sections = plan.sections.map((sec) => {
        const clips = [];
        sec.steps.forEach((step, i) => {
            if (step.diagram) {
                // A full-screen diagram scene (diagrams/<name>.html), or a time window of one:
                // no screenshot, so nothing to cross-fade from or into.
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
            // Terminal stills have nothing to click: ring only, no cursor or ripple.
            const clip = { still, kind: step.kind ?? (!r.box ? "none" : step.terminal || r.terminal ? "look" : "click") };
            if (r.box) clip.box = [r.box.x, r.box.y, r.box.w, r.box.h];
            if (step.zoom && step.zoom > 1) clip.zoom = step.zoom;
            if (step.tags?.length || step.arrows?.length) clip.notes = { tags: step.tags ?? [], arrows: step.arrows ?? [] };
            if (prev) clip.prev = prev;
            if (prev && prevCam) clip.from = prevCam;
            if (i > 0 && step.sync) clip.sync = step.sync;
            clips.push(clip);
            prev = still;
            prevCam = clip.box ? { box: clip.box, ...(clip.zoom ? { zoom: clip.zoom } : {}), kind: clip.kind, ...(clip.notes ? { notes: clip.notes } : {}) } : null;
            if (step.shot) {
                const name = typeof step.shot === "string" ? step.shot : step.mark.replace(/^\d+-/, "");
                shots.push({ name: slugify(name), still, crop: step.crop ?? "content" });
            }
        });
        if (clips[0]?.sync) delete clips[0].sync;
        return { id: sec.id, label: sec.label, narration: sec.narration, clips, ...(sec.tail !== undefined ? { tail: sec.tail } : {}) };
    });
    return { revoice: { title: plan.title, mode: "stills", sections }, shots, missing };
}

#!/usr/bin/env node
/**
 * Re-voice a prepped training video: same picture, polished narration, brand intro and
 * silent outro. Drives the Vertesia video engine (~/.claude/skills/vertesia-video-engine)
 * rather than reimplementing it — narration (ElevenLabs, with the "Vertesia"
 * pronunciation check), word timing and voice-synced assembly all come from there.
 *
 *   node scripts/training/revoice.mjs <slug> [--version V2] [--steps cut,tts,assemble,captions]
 *
 * Input: training_videos/<slug>/revoice.json
 *   {
 *     "title": "Content Basics",
 *     "sections": [
 *       { "id": "01", "label": "The content object model",
 *         "narration": "In this short video, we'll look at …",
 *         "clips": [ { "in": 0, "out": 39.5 },
 *                    { "in": 39.5, "out": 52, "speed": 1.5, "sync": "Here we're in an empty project" } ],
 *         "tail": 0.6 }
 *     ]
 *   }
 * A clip is either footage — `{ in, out, speed?, sync? }`, seconds in trimmed.mp4 — or, in
 * stills mode, a still — `{ still, box?, kind?, zoom?, prev?, sync? }`, rendered from a
 * screenshot (see renderStill). Clip times are seconds in trimmed.mp4. A clip's `sync` phrase (first words as spoken in
 * the narration) is where it starts; the clip before it is trimmed or held on its last
 * frame to meet it. `speed` > 1 speeds a window up (waits, typing).
 *
 * Output, in training_videos/<slug>/:
 *   video/          the engine project (narration in vo/, edit list in script/edl.json)
 *   final.mp4       intro + re-voiced sections + outro, 1080p
 *   final.vtt       captions written from the narration script, timed to the audio
 *
 * Every step is cached: unchanged narration is not re-voiced (the engine keys on text),
 * unchanged windows are not re-cut, the outro is rendered once.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captionsFromNarration, formatTimestamp, sectionStarts } from "./lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SKILLS = process.env.VERTESIA_VIDEO_SKILLS ?? join(homedir(), ".claude", "skills");
const ENGINE = join(SKILLS, "vertesia-video-engine");
const BRAND = join(SKILLS, "vertesia-video-brand");
const EDITOR_CONFIG = join(homedir(), ".vertesia-video-editor", "config.json");
const INTRO_USE_TO = 7.4; // brand.json intro_clip.use_to: the animation is 8 s, the last 0.6 s is a fade we don't want
const FPS = 30; // the engine's output rate

const args = process.argv.slice(2);
const opt = (k, d) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : d;
};
const slug = args[0];
const dir = join(ROOT, "training_videos", slug ?? "");
const steps = new Set(opt("steps", "cut,tts,assemble,captions").split(","));
const planFile = join(dir, "revoice.json");
const usesFootage = existsSync(planFile) && JSON.parse(readFileSync(planFile, "utf8")).sections.some((s) => s.clips.some((c) => !c.still && !c.diagram));
if (!slug || !existsSync(planFile) || (usesFootage && !existsSync(join(dir, "trimmed.mp4")))) {
    console.error("usage: node scripts/training/revoice.mjs <slug> [--version V2] [--steps …]   (needs revoice.json, and trimmed.mp4 unless every clip is a still)");
    process.exit(1);
}
if (!existsSync(join(ENGINE, "assemble.mjs"))) {
    console.error(`Vertesia video engine not found at ${ENGINE} (set VERTESIA_VIDEO_SKILLS to the folder holding vertesia-video-*)`);
    process.exit(1);
}

const plan = JSON.parse(readFileSync(join(dir, "revoice.json"), "utf8"));
const project = join(dir, "video");
const readJSON = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
const writeJSON = (p, o) => {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(o, null, 2) + "\n");
};
// Run engine scripts from inside the project once it exists (the engine finds its project
// from the cwd); before that — scaffolding — from the video's folder.
const node = (script, a) =>
    execFileSync(process.execPath, [join(ENGINE, script), ...a], { stdio: "inherit", cwd: existsSync(project) ? project : dir });
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);

// ---- engine project -----------------------------------------------------------
if (!existsSync(join(project, "project.json"))) {
    // scaffold.mjs makes the new project the editor's "current project"; put the user's back.
    const before = readJSON(EDITOR_CONFIG, null);
    node("scaffold.mjs", [project, "--name", plan.title ?? slug, "--type", "other", "--design", "vertesia-generic", "--mechanic", "edl"]);
    if (before) {
        const after = readJSON(EDITOR_CONFIG, before);
        after.current_project = before.current_project;
        writeJSON(EDITOR_CONFIG, after);
    }
}
const projectJson = readJSON(join(project, "project.json"), {});
if (opt("version") && projectJson.version !== opt("version")) {
    projectJson.version = opt("version");
    writeJSON(join(project, "project.json"), projectJson);
}
const version = projectJson.version ?? "V1";

// ---- narration ----------------------------------------------------------------
writeJSON(join(project, "script", "narration.json"), {
    cues: plan.sections.map((s) => ({ id: s.id, text: s.narration.trim() })),
});

// ---- footage windows ----------------------------------------------------------
const clipsDir = join(project, "scenes", "assets", "clips");
const clipManifestPath = join(clipsDir, "manifest.json");
const clipManifest = readJSON(clipManifestPath, {});
const clipFile = (sec, i) => `scenes/assets/clips/${sec.id}-${String(i).padStart(2, "0")}.mp4`;
/**
 * Stills mode: render one step — the screenshot with its highlight, cursor and camera move —
 * through scripts/training/assets/training-still.html. The clip is ~2 s; the engine holds
 * its last frame for as long as the narration stays on the step. Cached on the clip's
 * settings, the screenshots' size and mtime and the template, so a retaken screenshot or an
 * edited template re-renders.
 */
function renderStill(c, rel) {
    const stamp = (p) => {
        const st = statSync(join(dir, p));
        return `${st.size}:${Math.round(st.mtimeMs)}`;
    };
    const tplText = readFileSync(join(ROOT, "scripts", "training", "assets", "training-still.html"), "utf8");
    const key = JSON.stringify({ ...c, sync: undefined, img: stamp(c.still), prevImg: c.prev ? stamp(c.prev) : null, tpl: createHash("sha1").update(tplText).digest("hex") });
    if (clipManifest[rel] === key && existsSync(join(project, rel))) return;
    const scenes = join(project, "scenes");
    mkdirSync(join(scenes, "assets", "stills"), { recursive: true });
    const tpl = join(ROOT, "scripts", "training", "assets", "training-still.html");
    if (!existsSync(join(scenes, "training-still.html")) || readFileSync(join(scenes, "training-still.html"), "utf8") !== readFileSync(tpl, "utf8")) {
        copyFileSync(tpl, join(scenes, "training-still.html"));
    }
    const asset = (p) => {
        const name = p.replace(/^stills\//, "");
        copyFileSync(join(dir, p), join(scenes, "assets", "stills", name));
        return `assets/stills/${name}`;
    };
    const q = new URLSearchParams({ img: asset(c.still), kind: c.kind ?? "none" });
    if (c.prev) q.set("prev", asset(c.prev));
    if (c.box) q.set("box", c.box.join(","));
    if (c.zoom) q.set("zoom", String(c.zoom));
    if (c.from) q.set("from", JSON.stringify(c.from));
    if (c.notes) q.set("notes", JSON.stringify(c.notes));
    const outBase = join(project, "renders", "stills", rel.replace(/^.*\//, "").replace(/\.mp4$/, ""));
    mkdirSync(dirname(outBase), { recursive: true });
    node("render.mjs", [join(scenes, "training-still.html"), outBase, "--query", q.toString()]);
    copyFileSync(`${outBase}.mp4`, join(project, rel));
    clipManifest[rel] = key;
    console.log(`still ${rel}  ${c.still}${c.box ? ` box ${c.box.join(",")}` : ""}${c.zoom ? ` ×${c.zoom}` : ""}`);
}

/**
 * A full-screen diagram scene, training_videos/<slug>/diagrams/<name>.html (a branded GSAP
 * scene, same contract as the engine's scenes). Rendered once per name to
 * scenes/assets/diagrams/<name>.mp4 and cached on the HTML's hash; each step that uses it
 * plays a window (`from`/`to`) of that render, so a diagram can build in stages cued to
 * narration phrases.
 */
const renderedDiagrams = new Set();
function renderDiagram(name) {
    if (renderedDiagrams.has(name)) return;
    renderedDiagrams.add(name);
    const src = join(dir, "diagrams", `${name}.html`);
    const html = readFileSync(src, "utf8");
    const rel = `scenes/assets/diagrams/${name}.mp4`;
    const key = JSON.stringify({ diagram: createHash("sha1").update(html).digest("hex") });
    if (clipManifest[rel] === key && existsSync(join(project, rel))) return;
    const scenes = join(project, "scenes");
    writeFileSync(join(scenes, `diagram-${name}.html`), html);
    const outBase = join(project, "renders", "diagrams", name);
    mkdirSync(dirname(outBase), { recursive: true });
    node("render.mjs", [join(scenes, `diagram-${name}.html`), outBase]);
    mkdirSync(join(project, "scenes", "assets", "diagrams"), { recursive: true });
    copyFileSync(`${outBase}.mp4`, join(project, rel));
    clipManifest[rel] = key;
    console.log(`diagram ${rel}`);
}
const diagramFile = (name) => `scenes/assets/diagrams/${name}.mp4`;

if (steps.has("cut")) {
    mkdirSync(clipsDir, { recursive: true });
    for (const sec of plan.sections) {
        sec.clips.forEach((c, i) => {
            const rel = clipFile(sec, i);
            if (c.diagram) return renderDiagram(c.diagram);
            if (c.still) return renderStill(c, rel);
            const key = JSON.stringify({ in: c.in, out: c.out, speed: c.speed ?? 1 });
            if (clipManifest[rel] === key && existsSync(join(project, rel))) return;
            const speed = c.speed ?? 1;
            // Full frame, no plate: the picture must look exactly like the recording.
            ff([
                "-ss", String(c.in), "-to", String(c.out), "-i", join(dir, "trimmed.mp4"), "-an",
                "-vf", `setpts=PTS/${speed},scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=${FPS},format=yuv420p`,
                "-c:v", "libx264", "-crf", "16", "-preset", "fast", join(project, rel),
            ]);
            clipManifest[rel] = key;
            console.log(`cut ${rel}  ${c.in}–${c.out}s${speed !== 1 ? ` ×${speed}` : ""}`);
        });
    }
    writeJSON(clipManifestPath, clipManifest);

    // Brand intro, and the silent outro rendered once from scripts/training/assets.
    copyFileSync(join(BRAND, "intro", "vertesia-logo-intro.mp4"), join(project, "scenes", "assets", "intro.mp4"));
    const outroSrc = join(ROOT, "scripts", "training", "assets", "training-outro.html");
    const outroScene = join(project, "scenes", "training-outro.html");
    const outroRender = join(project, "renders", "1080", "training-outro.mp4");
    const changed = !existsSync(outroScene) || readFileSync(outroScene, "utf8") !== readFileSync(outroSrc, "utf8");
    if (changed) copyFileSync(outroSrc, outroScene);
    if (changed || !existsSync(outroRender)) node("render.mjs", [outroScene, join(project, "renders", "1080", "training-outro")]);
}

// ---- edit list ----------------------------------------------------------------
writeJSON(join(project, "script", "edl.json"), {
    vo_lead: 0.4,
    // No dips between sections: it is one continuous screen recording, and a flash of
    // stage colour at every section boundary would make it look edited.
    xfade: 0,
    sections: [
        { id: "00-intro", vo: null, tail: 0, audio_from_clip: true, clips: [{ type: "video", file: "scenes/assets/intro.mp4", to: INTRO_USE_TO }] },
        ...plan.sections.map((sec) => ({
            id: sec.id,
            vo: sec.id,
            tail: sec.tail ?? 0.6,
            clips: sec.clips.map((c, i) => ({
                type: "video",
                file: c.diagram ? diagramFile(c.diagram) : clipFile(sec, i),
                ...(c.diagram && c.from !== undefined ? { from: c.from } : {}),
                ...(c.diagram && c.to !== undefined ? { to: c.to } : {}),
                ...(i > 0 && c.sync ? { sync: c.sync, anticipate: c.anticipate ?? 0.25 } : {}),
            })),
        })),
        { id: "99-outro", vo: null, tail: 0, clips: [{ type: "anim", file: "training-outro" }] },
    ],
});

// ---- narration audio, assembly ------------------------------------------------
if (steps.has("tts")) node("tts.mjs", ["--project", project]);
if (steps.has("assemble")) {
    node("assemble.mjs", ["--project", project, "--scale", "1"]);
    copyFileSync(join(project, "out", `${version}-1080p.mp4`), join(dir, "final.mp4"));
}

// ---- captions -----------------------------------------------------------------
const report = readJSON(join(project, "work", "sync-report.json"), null);
if (steps.has("captions") && report) {
    const starts = sectionStarts(report);
    const sections = plan.sections.map((sec) => {
        const words = readJSON(join(project, "vo", `${sec.id}.words.json`), { words: [] }).words;
        const mp3 = join(project, "vo", `${sec.id}.mp3`);
        const duration = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).toString().trim();
        return { offset: starts[sec.id] + 0.4, text: sec.narration, words, duration };
    });
    writeFileSync(join(dir, "final.vtt"), captionsFromNarration(sections));
}

const mp3Duration = (id) => {
    const mp3 = join(project, "vo", `${id}.mp3`);
    if (!existsSync(mp3)) return null;
    return +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).toString().trim();
};
if (report) {
    const notFound = report.syncs.filter((s) => s.status === "NOT FOUND");
    const total = report.total;
    console.log(`\nfinal.mp4: ${formatTimestamp(Math.round(total))} (${version})`);
    // Per section: how long the picture runs on after the voice stops (silent footage —
    // speed up or trim the last window), and how much footage the sync points cut away
    // (a clip is trimmed when the next one's phrase is spoken; a lot here means the
    // narration moves on faster than the recording did, so speed that window up instead).
    for (const s of report.sections) {
        const sec = plan.sections.find((p) => p.id === s.id);
        if (!sec) {
            console.log(`  ${s.id.padEnd(10)} ${s.total.toFixed(1).padStart(6)}s`);
            continue;
        }
        // Still clips are held as long as the voice needs, so only footage clips count here.
        const footage = sec.clips.reduce((a, c) => a + (c.still || c.diagram ? 0 : (c.out - c.in) / (c.speed ?? 1)), 0);
        const voice = mp3Duration(sec.id) ?? 0;
        const quiet = s.total - 0.4 - voice - (sec.tail ?? 0.6);
        const skipped = Math.max(0, footage - s.total);
        const notes = [quiet > 2.5 && footage > 0 && `${quiet.toFixed(1)}s silent at the end`, skipped > 3 && `${skipped.toFixed(1)}s of footage cut at sync points`].filter(Boolean);
        console.log(`  ${s.id.padEnd(10)} ${s.total.toFixed(1).padStart(6)}s   voice ${voice.toFixed(1).padStart(5)}s${notes.length ? `  ← ${notes.join("; ")}` : ""}  ${sec.label ?? ""}`);
    }
    if (notFound.length) console.log(`!! sync phrases not heard in the narration: ${notFound.map((s) => `${s.section} "${s.sync}"`).join("; ")}`);
}

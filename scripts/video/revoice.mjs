#!/usr/bin/env node
/**
 * Build a portrait tutorial from its stills: narration, voice-synced cut, Neuro-Nudge
 * intro and outro, burned-in captions.
 *
 *   node scripts/video/revoice.mjs <slug> [--draft] [--version V2] [--steps cut,tts,assemble,captions]
 *
 * Input: content/videos/<slug>/revoice.json (from cut.mjs). A clip is a still,
 * `{ still, box?, kind?, zoom?, prev?, from?, notes?, sync? }`, or a diagram,
 * `{ diagram, from?, to?, sync? }`. A clip's `sync` phrase is where it starts; the clip
 * before it is held on its last frame to meet it.
 *
 * --draft voices with the cheaper model, to check timing before paying for the real one.
 *
 * Output, in content/videos/<slug>/:
 *   video/       the engine project (narration in vo/, edit list in script/edl.json)
 *   final.mp4    1080×1920, captions burned in
 *   final.vtt    the same captions as text
 *
 * Every step is cached: unchanged narration is not re-voiced, unchanged stills are not re-rendered.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { captionCues, cuesToVtt, formatTimestamp, frameLayout, sectionStarts, themeTokens } from "./lib.mjs";
import { ENGINE_DIR, ROOT, VIDEO_DIR, args, flag, opt, probe, readJSON, videoDir, writeJSON } from "./engine/common.mjs";

const VALUE_FLAGS = new Set(["--version", "--steps"]);
const slug = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
const dir = videoDir(slug);
const steps = new Set(opt("steps", "cut,tts,assemble,captions").split(","));
if (!slug || !existsSync(join(dir, "revoice.json"))) {
    console.error("usage: node scripts/video/revoice.mjs <slug> [--draft] [--version V2] [--steps …]   (needs revoice.json)");
    process.exit(1);
}
if (!existsSync(join(ENGINE_DIR, "node_modules", "playwright"))) {
    console.error("Engine not installed. Run: npm install --prefix scripts/video/engine");
    process.exit(1);
}

const plan = JSON.parse(readFileSync(join(dir, "revoice.json"), "utf8"));
if (!plan.device) {
    console.error("revoice.json has no device size: rerun cut.mjs --force");
    process.exit(1);
}
const project = join(dir, "video");
const scenes = join(project, "scenes");
const engine = (script, a) => execFileSync(process.execPath, [join(ENGINE_DIR, script), ...a], { stdio: "inherit", cwd: project });
const sha = (s) => createHash("sha1").update(s).digest("hex");

// ---- engine project ------------------------------------------------------------
for (const d of ["script", "scenes/assets/clips", "scenes/assets/stills", "scenes/assets/diagrams", "vo", "renders/stills", "renders/cards", "out", "work"]) {
    mkdirSync(join(project, d), { recursive: true });
}
if (!existsSync(join(scenes, "node_modules"))) symlinkSync(join(ENGINE_DIR, "node_modules"), join(scenes, "node_modules"));
copyFileSync(join(ENGINE_DIR, "lib.js"), join(scenes, "lib.js"));
const tokens = themeTokens(readFileSync(join(ROOT, "src", "constants", "theme.ts"), "utf8"));
writeFileSync(join(scenes, "tokens.css"), tokens);
for (const f of ["still.html", "intro.html", "outro.html", "caption.html"]) copyFileSync(join(VIDEO_DIR, "assets", f), join(scenes, f));
const logo = join(scenes, "assets", "logo.png");
if (!existsSync(logo)) execFileSync("sips", ["-Z", "1000", join(ROOT, "assets", "Neuro-Nudge_Logo_Blue.png"), "--out", logo], { stdio: "ignore" });

const projectJson = readJSON(join(project, "project.json"), { name: plan.title ?? slug, version: "V1" });
if (opt("version")) projectJson.version = opt("version");
writeJSON(join(project, "project.json"), projectJson);
const version = projectJson.version;

writeJSON(join(project, "script", "narration.json"), { cues: plan.sections.map((s) => ({ id: s.id, text: s.narration.trim() })) });

// ---- scenes --------------------------------------------------------------------
const manifestPath = join(scenes, "assets", "clips", "manifest.json");
const manifest = readJSON(manifestPath, {});
const clipFile = (sec, i) => `scenes/assets/clips/${sec.id}-${String(i).padStart(2, "0")}.mp4`;
const frame = frameLayout(plan.device);
const style = sha(tokens);

function renderStill(c, rel) {
    const stamp = (p) => {
        const st = statSync(join(dir, p));
        return `${st.size}:${Math.round(st.mtimeMs)}`;
    };
    const key = JSON.stringify({ ...c, sync: undefined, img: stamp(c.still), prevImg: c.prev ? stamp(c.prev) : null, tpl: sha(readFileSync(join(scenes, "still.html"))), style, frame, device: plan.device });
    if (manifest[rel] === key && existsSync(join(project, rel))) return;
    const asset = (p) => {
        const name = p.replace(/^stills\//, "");
        copyFileSync(join(dir, p), join(scenes, "assets", "stills", name));
        return `assets/stills/${name}`;
    };
    const q = new URLSearchParams({ img: asset(c.still), kind: c.kind ?? "none", frame: `${frame.x},${frame.y},${frame.w},${frame.h}`, device: `${plan.device.w},${plan.device.h}` });
    if (c.prev) q.set("prev", asset(c.prev));
    if (c.box) q.set("box", c.box.join(","));
    if (c.zoom) q.set("zoom", String(c.zoom));
    if (c.from) q.set("from", JSON.stringify(c.from));
    if (c.notes) q.set("notes", JSON.stringify(c.notes));
    const outBase = join(project, "renders", "stills", rel.replace(/^.*\//, "").replace(/\.mp4$/, ""));
    engine("render.mjs", [join(scenes, "still.html"), outBase, "--query", q.toString()]);
    copyFileSync(`${outBase}.mp4`, join(project, rel));
    manifest[rel] = key;
}

/** A full-screen diagram, <slug>/diagrams/<name>.html: rendered once, played in windows. */
const rendered = new Set();
const diagramFile = (name) => `scenes/assets/diagrams/${name}.mp4`;
function renderDiagram(name) {
    if (rendered.has(name)) return;
    rendered.add(name);
    const html = readFileSync(join(dir, "diagrams", `${name}.html`), "utf8");
    const rel = diagramFile(name);
    const key = JSON.stringify({ diagram: sha(html), style });
    if (manifest[rel] === key && existsSync(join(project, rel))) return;
    writeFileSync(join(scenes, `diagram-${name}.html`), html);
    const outBase = join(project, "renders", "stills", `diagram-${name}`);
    engine("render.mjs", [join(scenes, `diagram-${name}.html`), outBase]);
    copyFileSync(`${outBase}.mp4`, join(project, rel));
    manifest[rel] = key;
}

/** The intro and outro, cached on their template, the theme and (for the intro) the title. */
function renderCard(name, query) {
    const rel = `renders/cards/${name}.mp4`;
    const key = JSON.stringify({ tpl: sha(readFileSync(join(scenes, `${name}.html`))), style, query });
    if (manifest[rel] === key && existsSync(join(project, rel))) return;
    engine("render.mjs", [join(scenes, `${name}.html`), join(project, rel.replace(/\.mp4$/, "")), ...(query ? ["--query", query] : [])]);
    manifest[rel] = key;
}

if (steps.has("cut")) {
    for (const sec of plan.sections) {
        sec.clips.forEach((c, i) => {
            if (c.diagram) renderDiagram(c.diagram);
            else renderStill(c, clipFile(sec, i));
        });
    }
    renderCard("intro", new URLSearchParams({ title: plan.title ?? "" }).toString());
    renderCard("outro", "");
    writeJSON(manifestPath, manifest);
}

// ---- edit list -----------------------------------------------------------------
const VO_LEAD = 0.4;
writeJSON(join(project, "script", "edl.json"), {
    vo_lead: VO_LEAD,
    sections: [
        { id: "00-intro", vo: null, tail: 0, clips: [{ file: "renders/cards/intro.mp4" }] },
        ...plan.sections.map((sec) => ({
            id: sec.id,
            vo: sec.id,
            tail: sec.tail ?? 0.6,
            clips: sec.clips.map((c, i) => ({
                file: c.diagram ? diagramFile(c.diagram) : clipFile(sec, i),
                ...(c.diagram && c.from !== undefined ? { from: c.from } : {}),
                ...(c.diagram && c.to !== undefined ? { to: c.to } : {}),
                ...(i > 0 && c.sync ? { sync: c.sync, anticipate: c.anticipate ?? 0.25 } : {}),
            })),
        })),
        { id: "99-outro", vo: null, tail: 0, clips: [{ file: "renders/cards/outro.mp4" }] },
    ],
});

// ---- narration, assembly, captions ---------------------------------------------
if (steps.has("tts")) engine("tts.mjs", ["--project", project, ...(flag("draft") ? ["--draft"] : [])]);
const cutFile = join(project, "out", `${version}-clean.mp4`);
if (steps.has("assemble")) engine("assemble.mjs", ["--project", project, "--out", cutFile]);

const report = readJSON(join(project, "work", "sync-report.json"), null);
if (steps.has("captions") && report) {
    const starts = sectionStarts(report);
    const cues = captionCues(
        plan.sections.map((sec) => ({
            offset: starts[sec.id] + VO_LEAD,
            text: sec.narration,
            words: readJSON(join(project, "vo", `${sec.id}.words.json`), { words: [] }).words,
            duration: probe(join(project, "vo", `${sec.id}.mp3`)),
        })),
    );
    writeFileSync(join(dir, "final.vtt"), cuesToVtt(cues));
    const cuesFile = join(project, "work", "cues.json");
    mkdirSync(dirname(cuesFile), { recursive: true });
    writeJSON(cuesFile, cues);
    engine("burn.mjs", [cutFile, cuesFile, join(dir, "final.mp4"), scenes]);
}

if (report) {
    console.log(`\nfinal.mp4: ${formatTimestamp(Math.round(report.total))} (${version}${flag("draft") ? ", draft voice" : ""})`);
    for (const s of report.sections) {
        const sec = plan.sections.find((p) => p.id === s.id);
        console.log(`  ${s.id.padEnd(10)} ${s.total.toFixed(1).padStart(6)}s  ${sec?.label ?? ""}`);
    }
    const notFound = report.syncs.filter((s) => s.status === "NOT FOUND");
    if (notFound.length) console.log(`!! sync phrases not heard in the narration: ${notFound.map((s) => `${s.section} "${s.sync}"`).join("; ")}`);
}

#!/usr/bin/env node
/**
 * Frames and screenshots from a prepped recording (training_videos/<slug>/trimmed.mp4).
 *
 *   node scripts/training/shots.mjs <slug> --grab 30,76,88     full-res frames to choose from
 *   node scripts/training/shots.mjs <slug>                     crop the chosen screenshots
 *
 * `--grab` writes frames/t<sec>.png and frames/check.jpg (the grabs tiled two across,
 * labelled only by order) so they can be looked at in one read.
 *
 * Without `--grab` it reads lesson/shots.json:
 *   [{ "name": "create-type-dialog", "t": 76, "crop": "dialog" | "content" | "app" | "full" | [x, y, w, h] }]
 * and writes lesson/screenshots/NN-<name>.png (NN = position in the list) plus
 * lesson/screenshots/check.jpg. Crops are in 1920×1080 coordinates and scaled to the
 * recording's real size. Presets assume a Chrome window like the Content Basics one:
 *   full     the whole frame
 *   app      drop the browser chrome (tabs, address bar, bookmarks) — top 122 px
 *   content  drop the chrome and the Vertesia left nav — what a learner needs to see
 *   dialog   the centre of the screen, where Studio's modal dialogs open
 * Brief-driven recordings use PAGE_PRESETS instead (same names). Always look at check.jpg: a preset is a starting point, not a guarantee.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const slug = args[0];
const dir = join(ROOT, "training_videos", slug ?? "");
const video = join(dir, "trimmed.mp4");
// Stills mode has no recording: shots.json entries carry `still` (a PNG) instead of `t`.
const stillsMode = existsSync(join(dir, "plan.json")) && JSON.parse(readFileSync(join(dir, "plan.json"), "utf8")).mode === "stills";
if (!slug || (!stillsMode && !existsSync(video))) {
    console.error("usage: node scripts/training/shots.mjs <slug> [--grab t1,t2,…]   (run prep.mjs first)");
    process.exit(1);
}
const PRESETS = {
    full: [0, 0, 1920, 1080],
    app: [0, 122, 1920, 958],
    content: [250, 160, 1670, 920],
    dialog: [540, 330, 840, 520],
};
/** DevTools screencasts (brief-driven recordings: a plan.json beside them, no audio) are of the page
 * alone at 1600×900: no browser chrome, Studio's header is 48 px and its nav 293 px wide
 * in 1920×1080 coordinates. */
const PAGE_PRESETS = {
    full: [0, 0, 1920, 1080],
    app: [0, 0, 1920, 1080],
    content: [293, 48, 1627, 1032],
    dialog: [480, 160, 960, 760],
};
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const probeSize = (f) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f])
    .toString()
    .trim()
    .split(",")
    .map(Number);
const [vw, vh] = stillsMode ? [1920, 1080] : execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", video])
    .toString()
    .trim()
    .split(",")
    .map(Number);
// A screencast has no audio track (Zoom recordings always do), and brief-driven ones have a plan.json.
const hasAudio = stillsMode ? false : execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", video]).toString().trim() !== "";
const presets = existsSync(join(dir, "plan.json")) || !hasAudio ? PAGE_PRESETS : PRESETS;
const sx = vw / 1920;
const sy = vh / 1080;

/** Tile images two across into one jpg for review. */
function montage(files, outFile) {
    if (!files.length) return;
    const inputs = files.flatMap((f) => ["-i", f]);
    const scaled = files.map((_, i) => `[${i}:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2:color=gray[s${i}]`);
    const cells = files.map((_, i) => `[s${i}]`).join("");
    const layout = files.map((_, i) => `${(i % 2) * 960}_${Math.floor(i / 2) * 540}`).join("|");
    const graph = files.length === 1 ? `${scaled[0]};[s0]null[out]` : `${scaled.join(";")};${cells}xstack=inputs=${files.length}:layout=${layout}:fill=gray[out]`;
    ff([...inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "3", outFile]);
}

const grab = args[args.indexOf("--grab") + 1];
if (args.includes("--grab")) {
    mkdirSync(join(dir, "frames"), { recursive: true });
    const files = grab.split(",").map((t) => {
        const f = join(dir, "frames", `t${t}.png`);
        ff(["-ss", t, "-i", video, "-frames:v", "1", f]);
        return f;
    });
    montage(files, join(dir, "frames", "check.jpg"));
    console.log(files.map((f) => f.replace(`${ROOT}/`, "")).join("\n"));
    console.log(`review: training_videos/${slug}/frames/check.jpg (left→right, top→bottom = order given)`);
    process.exit(0);
}

const shots = JSON.parse(readFileSync(join(dir, "lesson", "shots.json"), "utf8"));
const outDir = join(dir, "lesson", "screenshots");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const files = shots.map((shot, i) => {
    const [x, y, w, h] = Array.isArray(shot.crop) ? shot.crop : presets[shot.crop ?? "content"];
    if (w === undefined) throw new Error(`unknown crop "${shot.crop}" for ${shot.name}`);
    const f = join(outDir, `${String(i + 1).padStart(2, "0")}-${shot.name}.png`);
    if (shot.still) {
        // Crops are in 1920×1080 coordinates; the PNG is the page at 2× (e.g. 3200×1800).
        const [iw, ih] = probeSize(join(dir, shot.still));
        const crop = [w * (iw / 1920), h * (ih / 1080), x * (iw / 1920), y * (ih / 1080)].map((n) => Math.round(n / 2) * 2).join(":");
        ff(["-i", join(dir, shot.still), "-vf", `crop=${crop}`, f]);
        return f;
    }
    const crop = [w * sx, h * sy, x * sx, y * sy].map((n) => Math.round(n / 2) * 2).join(":");
    ff(["-ss", String(shot.t), "-i", video, "-frames:v", "1", "-vf", `crop=${crop}`, f]);
    return f;
});
montage(files, join(outDir, "check.jpg"));
console.log(files.map((f) => f.replace(`${ROOT}/`, "")).join("\n"));
console.log(`review: training_videos/${slug}/lesson/screenshots/check.jpg`);

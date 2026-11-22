#!/usr/bin/env node
/**
 * Step 1 of the training-video pipeline: trim a raw recording and get it ready to read.
 *
 *   node scripts/training/prep.mjs "Content Basics" [--vtt <file>] [--start 13.5] [--end 371.5] [--force]
 *
 * Looks for `training_videos/<name>.mp4` and a caption file beside it (`<name>*.vtt`),
 * and writes everything into `training_videos/<slug>/`:
 *   trimmed.mp4   the recording with the opening dead air and closing name card cut
 *   trimmed.vtt   the captions shifted to match (with known mishearings fixed)
 *   sheets/       contact sheets, one frame every 8 s, 12 to a sheet
 *   prep.json     the cut points, how they were chosen, and durations
 *
 * Cut points come from silence detection (where speech starts and stops) plus scene
 * detection (Zoom's closing name card); `--start`/`--end` override either. Re-running is
 * cheap: nothing is re-encoded unless the cut points change or `--force` is passed.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pickTrim, shiftVtt, slugify, speechSpans } from "./lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VIDEOS = join(ROOT, "training_videos");
/** Systematic caption mishearings, fixed in the shifted transcript. Extend as found. */
const REPLACEMENTS = [
    ["Invertigia", "in Vertesia"],
    ["Vertigia", "Vertesia"],
    ["Vertizia", "Vertesia"],
    ["Vertesio", "Vertesia"],
];

const args = process.argv.slice(2);
const opt = (k) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
};
const name = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && args[i - 1] !== "--force"));
if (!name) {
    console.error('usage: node scripts/training/prep.mjs "<recording name>" [--vtt file] [--start s] [--end s] [--force]');
    process.exit(1);
}

const run = (cmd, a) => execFileSync(cmd, a, { maxBuffer: 64 * 1024 * 1024 }).toString();
/** ffmpeg's analysis filters report on stderr. */
const ffmpegLog = (a) => spawnSync("ffmpeg", ["-hide_banner", ...a], { maxBuffer: 64 * 1024 * 1024 }).stderr.toString();
const duration = (f) => +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim();

// ---- locate inputs ----------------------------------------------------------
const source = [join(VIDEOS, `${name}.mp4`), resolve(name)].find((p) => p.endsWith(".mp4") && existsSync(p));
if (!source) {
    console.error(`No recording at training_videos/${name}.mp4`);
    process.exit(1);
}
const stem = basename(source, ".mp4");
const vtt =
    opt("vtt") ??
    readdirSync(dirname(source))
        .filter((f) => f.toLowerCase().endsWith(".vtt") && f.startsWith(stem) && !f.includes("(trimmed)"))
        .map((f) => join(dirname(source), f))[0];
const slug = slugify(stem);
const out = join(VIDEOS, slug);
mkdirSync(join(out, "sheets"), { recursive: true });

// ---- choose cut points ------------------------------------------------------
const total = duration(source);
const silenceLog = ffmpegLog(["-i", source, "-af", "silencedetect=noise=-35dB:d=0.6", "-vn", "-f", "null", "-"]);
const silences = [];
for (const line of silenceLog.split("\n")) {
    const s = /silence_start: ([\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) silences.push({ start: +s[1] });
    if (e && silences.length) silences[silences.length - 1].end = +e[1];
}
const speech = speechSpans(silences, total).filter((s) => s.end - s.start > 0.25);
// Scene changes only matter after the last words (the name card), so scan from just before them.
const tailFrom = Math.max(0, (speech.at(-1)?.end ?? total) - 2);
const sceneLog = ffmpegLog(["-ss", String(tailFrom), "-i", source, "-vf", "select='gt(scene,0.2)',showinfo", "-an", "-f", "null", "-"]);
const sceneChanges = [...sceneLog.matchAll(/pts_time:([\d.]+)/g)].map((m) => tailFrom + +m[1]);

const auto = pickTrim({ speech, sceneChanges, duration: total });
const start = opt("start") !== undefined ? +opt("start") : auto.start;
const end = opt("end") !== undefined ? +opt("end") : auto.end;

// ---- trim, captions, sheets -------------------------------------------------
const prepPath = join(out, "prep.json");
const previous = existsSync(prepPath) ? JSON.parse(readFileSync(prepPath, "utf8")) : null;
const trimmed = join(out, "trimmed.mp4");
const unchanged = previous && previous.start === start && previous.end === end && existsSync(trimmed);
if (!unchanged || args.includes("--force")) {
    console.log(`trimming ${start.toFixed(2)}s → ${end.toFixed(2)}s …`);
    run("ffmpeg", [
        "-v", "error", "-y", "-ss", String(start), "-to", String(end), "-i", source,
        "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", trimmed,
    ]);
    rmSync(join(out, "sheets"), { recursive: true, force: true });
    mkdirSync(join(out, "sheets"), { recursive: true });
    run("ffmpeg", ["-v", "error", "-y", "-i", trimmed, "-vf", "fps=1/8,scale=960:-1,tile=3x4", join(out, "sheets", "sheet_%02d.jpg")]);
}
if (vtt) writeFileSync(join(out, "trimmed.vtt"), shiftVtt(readFileSync(vtt, "utf8"), start, end, REPLACEMENTS));

const trimmedDuration = duration(trimmed);
const sheets = readdirSync(join(out, "sheets")).filter((f) => f.endsWith(".jpg")).sort();
const prep = {
    source: source.replace(`${ROOT}/`, ""),
    captions: vtt ? vtt.replace(`${ROOT}/`, "") : null,
    slug,
    start,
    end,
    chosen: {
        start: opt("start") !== undefined ? "override" : `0.5 s before first speech (${speech[0]?.start.toFixed(2)} s)`,
        end: opt("end") !== undefined ? "override" : `last speech ends ${speech.at(-1)?.end.toFixed(2)} s; picture changes at ${sceneChanges.filter((t) => t > (speech.at(-1)?.end ?? 0)).map((t) => t.toFixed(2)).join(", ") || "none"}`,
    },
    source_duration: +total.toFixed(2),
    duration: +trimmedDuration.toFixed(2),
    // fps=1/8 samples mid-interval: frame k of the cut is at ≈ 8k + 4 s.
    sheets: sheets.map((f, i) => ({ file: `sheets/${f}`, first_frame_at: i * 12 * 8 + 4, every: 8, layout: "3 across × 4 down" })),
};
writeFileSync(prepPath, JSON.stringify(prep, null, 2) + "\n");
console.log(JSON.stringify(prep, null, 2));
if (!vtt) console.warn("!! no .vtt found beside the recording; pass --vtt <file> or the breakdown has only the picture to go on");

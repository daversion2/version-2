// Burn captions into a video. Homebrew's ffmpeg has neither `subtitles` nor `drawtext`, so
// each cue is rendered to a transparent PNG in the browser and the PNGs play as one
// overlay track, timed by an ffconcat list.
// usage: node burn.mjs <in.mp4> <cues.json> <out.mp4> <scenes dir>
import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CAPTION_BAND, STAGE, captionTimeline } from "../lib.mjs";
import { FPS, ff, probe } from "./common.mjs";

const [input, cuesFile, output, scenes] = process.argv.slice(2).map((p) => resolve(p));
const cues = JSON.parse(readFileSync(cuesFile, "utf8"));
const dir = `${output}_captions`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: STAGE.w, height: CAPTION_BAND } });
await page.goto(pathToFileURL(join(scenes, "caption.html")).href);
await page.evaluate(() => document.fonts.ready);
const shot = async (text, file) => {
  await page.evaluate((t) => window.setCaption(t), text);
  await page.screenshot({ path: file, type: "png", omitBackground: true });
};
await shot("", join(dir, "blank.png"));
for (let i = 0; i < cues.length; i++) await shot(cues[i].text, join(dir, `c${i}.png`));
await browser.close();

const name = (e) => (e.cue === null ? "blank.png" : `c${e.cue}.png`);
const timeline = captionTimeline(cues, probe(input));
const lines = ["ffconcat version 1.0"];
for (const e of timeline) lines.push(`file ${name(e)}`, `duration ${e.duration}`);
// The concat demuxer ignores the last entry's duration unless the file is repeated.
lines.push(`file ${name(timeline.at(-1))}`);
const list = join(dir, "list.ffconcat");
writeFileSync(list, lines.join("\n") + "\n");

ff(["-i", input, "-f", "concat", "-safe", "0", "-i", list,
  "-filter_complex", `[1:v]fps=${FPS},format=rgba[c];[0:v][c]overlay=0:${STAGE.h - CAPTION_BAND}:eof_action=pass:format=auto,format=yuv420p[v]`,
  "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", String(FPS), "-c:a", "copy", "-movflags", "+faststart", output]);
rmSync(dir, { recursive: true, force: true });
console.log(`burned ${cues.length} captions → ${output}`);

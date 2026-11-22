// Render a scene HTML to a portrait video by seeking its GSAP timeline frame by frame.
// usage: node render.mjs <scene.html> <outBase> [--query "a=1&b=2"] [--still 1.5]
// The scene must set window.tl (paused GSAP timeline) and window.DURATION, and load lib.js (window.seek).
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { FPS, H, W, args, opt } from "./common.mjs";

const VALUE_FLAGS = new Set(["--query", "--still"]);
const [srcArg, outArg] = args.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!srcArg || !outArg) { console.error("usage: node render.mjs <scene.html> <outBase> [--query q] [--still t]"); process.exit(1); }
const query = opt("query", ""), still = opt("still", null);
const src = pathToFileURL(resolve(srcArg)).href + (query ? "?" + query : "");
const outBase = resolve(outArg), frameDir = outBase + "_frames";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(src);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => window.tl && window.DURATION);
const duration = await page.evaluate(() => window.DURATION);

if (still !== null) {
  await page.evaluate((t) => window.seek(t), +still);
  const p = `${outBase}_still_${still}.png`;
  await page.screenshot({ path: p, type: "png" });
  console.log("still:", p);
  await browser.close();
  process.exit(0);
}
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
const frames = Math.round(duration * FPS);
console.log(`${basename(srcArg)}: ${duration}s, ${frames} frames`);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS);
  writeFileSync(`${frameDir}/f${String(i).padStart(5, "0")}.png`, await page.screenshot({ type: "png" }));
}
await browser.close();
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(FPS), "-i", `${frameDir}/f%05d.png`, "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outBase + ".mp4"], { stdio: "inherit" });
if (r.status !== 0) { console.error("ffmpeg failed"); process.exit(1); }
rmSync(frameDir, { recursive: true, force: true });
console.log("wrote", outBase + ".mp4");

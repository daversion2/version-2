// Word-level timestamps for a narration file via whisper.cpp. Cached beside the mp3 as
// <name>.words.json (invalidated by mtime).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whisperModel } from "./common.mjs";

export function wordTimes(mp3) {
  const out = mp3.replace(/\.(mp3|wav|m4a)$/, ".words.json");
  const mtime = Math.round(statSync(mp3).mtimeMs);
  if (existsSync(out)) {
    const j = JSON.parse(readFileSync(out, "utf8"));
    if (j.src_mtime === mtime) return j.words;
  }
  const tmp = mkdtempSync(join(tmpdir(), "nnwords-"));
  const wav = join(tmp, "a.wav"), json = join(tmp, "a");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp3, "-ac", "1", "-ar", "16000", wav]);
  execFileSync("whisper-cli", ["-m", whisperModel(), "-f", wav, "-l", "en", "-np", "-ml", "1", "-sow", "-oj", "-of", json], { stdio: ["ignore", "ignore", "ignore"] });
  const segs = JSON.parse(readFileSync(json + ".json", "utf8")).transcription;
  rmSync(tmp, { recursive: true, force: true });
  const toS = (ts) => { const m = ts.match(/(\d+):(\d+):(\d+)[.,](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000; };
  const words = segs.map((s) => ({ w: s.text.trim(), s: toS(s.timestamps.from), e: toS(s.timestamps.to) })).filter((x) => x.w);
  writeFileSync(out, JSON.stringify({ src_mtime: mtime, words }, null, 1));
  return words;
}

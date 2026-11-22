// Shared helpers for the portrait video engine. Adapted from the Vertesia video engine;
// nothing here reads ~/.vertesia-video-editor/config.json or its stored key.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const ENGINE_DIR = dirname(fileURLToPath(import.meta.url));
export const VIDEO_DIR = resolve(ENGINE_DIR, "..");
export const ROOT = resolve(ENGINE_DIR, "../../..");
export const W = 1080, H = 1920, FPS = 30;

export const args = process.argv.slice(2);
export const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
export const flag = (k) => args.includes("--" + k);

export function readJSON(p, d) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } }
export function writeJSON(p, o) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2) + "\n"); }

/** content/videos/<slug>; NN_VIDEO_ROOT moves it (used for offline test runs). */
export const videoDir = (slug) => join(process.env.NN_VIDEO_ROOT ?? join(ROOT, "content", "videos"), slug ?? "");

/** Load .env.local without overriding what's already set. */
export function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const ff = (a) => execFileSync("ffmpeg", ["-y", "-v", "error", ...a], { stdio: ["ignore", "inherit", "inherit"] });
export const probe = (f) => {
  const d = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  if (!(d > 0)) throw new Error("unreadable: " + f);
  return d;
};

/** The local Whisper model. It is 1.6 GB, so it's used where it already is, never copied. */
export function whisperModel() {
  const cands = [process.env.NN_WHISPER_MODEL, resolve(homedir(), ".vertesia-video-editor/models/ggml-large-v3-turbo.bin")].filter(Boolean);
  const m = cands.find((c) => existsSync(c));
  if (!m) throw new Error("Whisper model not found. Set NN_WHISPER_MODEL to a ggml model file.");
  return m;
}
export const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

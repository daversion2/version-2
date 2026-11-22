// ElevenLabs narration for a project, using the repo's own key and voices.
// usage: node tts.mjs --project <dir> [--draft] [--force]
//   reads script/narration.json {cues:[{id,text}]} → vo/<id>.mp3, vo/manifest.json
// --draft uses the cheaper model from video.config.json, for checking timing.
// A cue is voiced again only when its text, voice or model changed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, VIDEO_DIR, flag, loadEnv, opt, probe, readJSON, writeJSON } from "./common.mjs";

const dir = resolve(opt("project", "."));
loadEnv();
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error("Set ELEVENLABS_API_KEY in .env.local"); process.exit(1); }
const config = JSON.parse(readFileSync(join(VIDEO_DIR, "video.config.json"), "utf8"));
const voices = JSON.parse(readFileSync(join(ROOT, "content", "meditations", "voices.json"), "utf8"));
const voice = voices.find((v) => v.key === config.voice);
if (!voice) { console.error(`voice "${config.voice}" is not in content/meditations/voices.json`); process.exit(1); }
const model = flag("draft") ? config.draft_model : config.model;

const script = readJSON(join(dir, "script/narration.json"), null);
if (!script?.cues) { console.error("script/narration.json not found in", dir); process.exit(1); }
const outDir = join(dir, "vo");
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, "manifest.json");
const manifest = readJSON(manifestPath, {});
const stamp = `${voice.voice_id}|${model}|`;
let total = 0;
for (const cue of script.cues) {
  const p = join(outDir, cue.id + ".mp3");
  if (!flag("force") && manifest[cue.id] === stamp + cue.text && existsSync(p)) {
    console.log(cue.id.padEnd(12), "unchanged");
  } else {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: cue.text, model_id: model, seed: config.seed }),
    });
    if (!res.ok) { console.error("ElevenLabs", res.status, await res.text()); process.exit(1); }
    writeFileSync(p, Buffer.from(await res.arrayBuffer()));
    manifest[cue.id] = stamp + cue.text;
    writeJSON(manifestPath, manifest);
    console.log(cue.id.padEnd(12), `${probe(p).toFixed(2)}s  ${model}`);
  }
  total += probe(p);
}
console.log(`narration ${total.toFixed(1)}s (${voice.name})`);

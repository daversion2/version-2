/**
 * Add a background loop to content/meditations/ambience/, and record where it
 * came from in ambience/sources.json (what made it, the prompt or file, when).
 *
 * Run with one of:
 *   npx tsx scripts/makeAmbience.ts rain --prompt "Gentle steady rain on leaves, no thunder"
 *       ElevenLabs sound generation: a 30s seamless loop. The API key needs
 *       the sound_generation permission.
 *   npx tsx scripts/makeAmbience.ts creek --file ~/Downloads/creek.wav --source "freesound.org/s/12345, CC0"
 *       A recording you have the rights to use commercially. Say where it's from.
 *   npx tsx scripts/makeAmbience.ts brown-noise --noise brown
 *       Generated here with ffmpeg (brown or pink). No licence questions.
 *
 * Then try it under a script: npx tsx scripts/renderMeditation.ts first-sit-5 --ambience rain
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENCE_DIR, AMBIENCE_SOURCES_FILE, ROOT, WORK_DIR, ambiencePath, readJson, writeJson } from './meditationFiles';

interface AmbienceSource {
  made_with: 'elevenlabs' | 'file' | 'ffmpeg-noise';
  detail: string;
  created_at: string;
}

function ffmpeg(args: string[]) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8' });
  if (res.error || res.status !== 0) throw new Error(`ffmpeg failed:\n${(res.stderr ?? res.error?.message ?? '').slice(-2000)}`);
}

const toMp3 = ['-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '256k', '-map_metadata', '-1'];

async function fromPrompt(prompt: string, out: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Set ELEVENLABS_API_KEY in .env.local');
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: prompt, duration_seconds: 30, loop: true, prompt_influence: 0.5 }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 500)}`);
  mkdirSync(WORK_DIR, { recursive: true });
  const tmp = join(WORK_DIR, 'ambience-download.mp3');
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  ffmpeg(['-i', tmp, ...toMp3, out]);
  rmSync(tmp, { force: true });
}

function fromNoise(color: string, out: string) {
  if (color !== 'brown' && color !== 'pink') throw new Error('--noise takes brown or pink');
  // Two independent channels so it sounds wide, rolled off at the top so it's soft.
  const ch = (seed: number) => `anoisesrc=color=${color}:amplitude=0.3:seed=${seed}:duration=30`;
  ffmpeg([
    '-f', 'lavfi', '-i', ch(1528),
    '-f', 'lavfi', '-i', ch(8251),
    '-filter_complex', `[0:a][1:a]amerge=inputs=2,lowpass=f=${color === 'brown' ? 900 : 3000}[out]`,
    '-map', '[out]', ...toMp3, out,
  ]);
}

async function main() {
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const [name, kind, value, sourceFlag, sourceValue] = process.argv.slice(2);
  if (!name || !/^[a-z0-9-]+$/.test(name) || !kind || !value) {
    throw new Error('Usage: makeAmbience.ts <name> --prompt "…" | --file <path> --source "…" | --noise brown|pink');
  }
  mkdirSync(AMBIENCE_DIR, { recursive: true });
  const out = ambiencePath(name);
  let source: AmbienceSource;

  if (kind === '--prompt') {
    await fromPrompt(value, out);
    source = { made_with: 'elevenlabs', detail: value, created_at: new Date().toISOString() };
  } else if (kind === '--file') {
    if (sourceFlag !== '--source' || !sourceValue) {
      throw new Error('Say where a recording came from and its licence: --source "freesound.org/s/12345, CC0"');
    }
    ffmpeg(['-i', value, ...toMp3, out]);
    source = { made_with: 'file', detail: sourceValue, created_at: new Date().toISOString() };
  } else if (kind === '--noise') {
    fromNoise(value, out);
    source = { made_with: 'ffmpeg-noise', detail: `${value} noise`, created_at: new Date().toISOString() };
  } else {
    throw new Error(`Unknown option ${kind}`);
  }

  const sources = existsSync(AMBIENCE_SOURCES_FILE) ? readJson<Record<string, AmbienceSource>>(AMBIENCE_SOURCES_FILE) : {};
  sources[name] = source;
  writeJson(AMBIENCE_SOURCES_FILE, sources);
  console.log(`✓ ${out.replace(`${ROOT}/`, '')}`);
  console.log(`  Try it: npx tsx scripts/renderMeditation.ts first-sit-5 --ambience ${name}`);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

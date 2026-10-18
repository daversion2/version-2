/**
 * The short clips the Compose pickers play: one line from each narrator, and
 * a preview of each background. Bundled with the app (assets/compose/) so they
 * play instantly, offline.
 *
 * Run with: npx tsx scripts/makeComposeSamples.ts
 *
 * Re-run after adding a voice to content/meditations/voices.json or a
 * background to content/meditations/ambience/, then add it to
 * src/data/composeCatalog.ts and the asset map in
 * src/screens/Lab/experiments/compose/components/sampleAssets.ts.
 * Voice lines come from the clip cache when unchanged, so a re-run is cheap.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENCE_DIR, ROOT, VOICES_FILE, readJson, type VoiceEntry } from './meditationFiles';
import { loadEnv, renderScript } from './meditationRender';

const OUT = join(ROOT, 'assets', 'compose');
const SAMPLE_LINE = "Find a comfortable position, and let your breathing settle. There's nothing you need to do right now.";
const PREVIEW_SEC = 10;

function ffmpeg(args: string[]) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`ffmpeg failed:\n${res.stderr.slice(-1500)}`);
}

async function main() {
  loadEnv();
  mkdirSync(OUT, { recursive: true });

  for (const voice of readJson<VoiceEntry[]>(VOICES_FILE)) {
    const source = ['---', `id: sample-${voice.key}`, `title: ${voice.name}`, `voice: ${voice.key}`, '---', '', SAMPLE_LINE, ''].join('\n');
    const full = join(OUT, `voice-${voice.key}.full.mp3`);
    const r = await renderScript({ source, outPath: full, log: false });
    // A phone-speaker preview: mono, small.
    ffmpeg(['-i', full, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', join(OUT, `voice-${voice.key}.mp3`)]);
    rmSync(full);
    console.log(`✓ voice-${voice.key}.mp3 (${r.durationSec.toFixed(1)}s, ${r.charsNew} new chars)`);
  }

  for (const file of readdirSync(AMBIENCE_DIR).filter((f) => f.endsWith('.mp3'))) {
    const key = file.slice(0, -4);
    ffmpeg([
      '-i', join(AMBIENCE_DIR, file),
      '-t', String(PREVIEW_SEC),
      '-af', `loudnorm=I=-26:TP=-3,afade=t=in:d=1,afade=t=out:st=${PREVIEW_SEC - 2}:d=2`,
      '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '64k',
      join(OUT, `bg-${key}.mp3`),
    ]);
    console.log(`✓ bg-${key}.mp3`);
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

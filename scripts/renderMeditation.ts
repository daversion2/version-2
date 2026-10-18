/**
 * Render a curated guided meditation script to an MP3 for the founder to review.
 *
 * Run with: npx tsx scripts/renderMeditation.ts first-sit-5
 *           npx tsx scripts/renderMeditation.ts --all
 *
 * Output goes to content/meditations/out/ (git-ignored). Rendering never
 * approves anything — see approveMeditation.ts. The engine is in
 * meditationRender.ts.
 *
 * Background: `ambience: rain` in a script's front matter mixes
 * content/meditations/ambience/rain.mp3 underneath. To try one without
 * changing the script:
 *           npx tsx scripts/renderMeditation.ts first-sit-5 --ambience rain
 * which writes out/previews/first-sit-5.rain.mp3 — a preview, never approvable.
 */

import { readFileSync } from 'node:fs';
import { totalPauseSec, parseMeditationScript } from '../src/utils/meditation/script';
import {
  ROOT,
  audioPath,
  formatDuration,
  listScriptIds,
  previewPath,
  recordPath,
  scriptPath,
  sha256,
  writeJson,
  type RenderRecord,
  type VoiceConfig,
  VOICE_FILE,
  readJson,
} from './meditationFiles';
import { loadEnv, renderScript } from './meditationRender';

async function render(id: string, ambienceOverride: string | null) {
  const source = readFileSync(scriptPath(id), 'utf8');
  const { meta, segments } = parseMeditationScript(source);
  if (meta.id !== id) throw new Error(`${id}.md says its id is "${meta.id}" — they must match`);

  const out = ambienceOverride ? previewPath(id, ambienceOverride) : audioPath(id);
  const result = await renderScript({ source, outPath: out, ambienceOverride });
  const label = result.ambience ? ` with ${result.ambience}` : '';

  if (ambienceOverride) {
    console.log(`\n✓ Preview: ${meta.title}${label} → ${out.replace(`${ROOT}/`, '')} (${formatDuration(result.durationSec)})`);
    console.log(`  A preview only — to use this background, add \`ambience: ${ambienceOverride}\` to the script and render it.`);
    return;
  }

  const settings = readJson<VoiceConfig>(VOICE_FILE);
  const record: RenderRecord = {
    id,
    title: meta.title,
    script_sha256: sha256(source),
    voice_id: result.voice.voice_id,
    model_id: settings.model_id,
    voice_settings: settings.voice_settings,
    seed: settings.seed,
    ambience: result.ambience,
    duration_sec: Math.round(result.durationSec * 10) / 10,
    rendered_at: new Date().toISOString(),
  };
  writeJson(recordPath(id), record);

  const targetMin = Number(meta.length_min);
  console.log(`\n✓ ${meta.title}${label}, read by ${result.voice.name} → ${out.replace(`${ROOT}/`, '')}`);
  console.log(
    `  ${formatDuration(result.durationSec)} long` +
      (targetMin ? ` (aiming for ${targetMin}:00)` : '') +
      ` — speech ${formatDuration(result.speechSec)}, written pauses ${formatDuration(totalPauseSec(segments))}`,
  );
  console.log(`  characters voiced: ${result.charsNew} new, ${result.charsCached} reused from cache`);
  console.log(`  Not approved. Listen to all of it, then: npx tsx scripts/approveMeditation.ts ${id}`);
}

async function main() {
  loadEnv();
  const [arg, flag, ambienceArg] = process.argv.slice(2);
  if (!arg) throw new Error('Usage: npx tsx scripts/renderMeditation.ts <id> | --all  [--ambience <name>]');
  if (flag && (flag !== '--ambience' || !ambienceArg)) throw new Error('Usage: … <id> --ambience <name>');
  const ids = arg === '--all' ? listScriptIds() : [arg];

  for (const id of ids) {
    console.log(`Rendering ${id}…`);
    await render(id, ambienceArg ?? null);
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

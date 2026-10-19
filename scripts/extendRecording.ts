/**
 * Make a curated recording from an uploaded one: lengthen chosen pauses with
 * the recording's own background ambience, to an exact length.
 *
 * Run with: npx tsx scripts/extendRecording.ts focus-10
 *           npx tsx scripts/extendRecording.ts --all
 *
 * Reads content/meditations/recordings/<id>.json (the recipe — see
 * src/utils/meditation/extend.ts) and writes out/<id>.mp3 plus its render
 * record, ready to listen to and approve with approveMeditation.ts, the same
 * as a written script. The voice and wording are untouched. The ambience
 * that fills each pause is taken from the middle of the listed pauses (clear
 * of breaths and word endings), crossfaded, and drawn from a different stretch
 * each time so it doesn't audibly repeat. Pauses must carry a steady
 * background for this to sound right; a recording with true silence between
 * lines can use plain silence instead — not built, since nothing needs it yet.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { planExtension, type RecordingRecipe } from '../src/utils/meditation/extend';
import { wavDurationSec } from '../src/utils/meditation/render';
import {
  CONTENT_DIR,
  ROOT,
  WORK_DIR,
  audioPath,
  formatDuration,
  listRecordingIds,
  readJson,
  recipePath,
  recordPath,
  sourceSha,
  writeJson,
  type RenderRecord,
} from './meditationFiles';

const CROSSFADE_SEC = 1;
/** Kept clear of each pause's edges when sampling ambience: breaths, word tails. */
const EDGE_SEC = 1;
const W = ['-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le'];

function ffmpeg(args: string[]): string {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`ffmpeg failed:\n${(res.stderr ?? '').slice(-1500)}`);
  return res.stderr ?? '';
}

/** Join files end to end with equal-power crossfades. */
function crossfadeAll(files: string[], out: string) {
  const inputs = files.flatMap((f) => ['-i', f]);
  const chain: string[] = [];
  let last = '0:a';
  for (let i = 1; i < files.length; i++) {
    chain.push(`[${last}][${i}:a]acrossfade=d=${CROSSFADE_SEC}:c1=qsin:c2=qsin[x${i}]`);
    last = `x${i}`;
  }
  ffmpeg([...inputs, '-filter_complex', chain.join(';'), '-map', `[${last}]`, ...W, out]);
}

function extend(id: string) {
  const recipe = readJson<RecordingRecipe>(recipePath(id));
  if (recipe.id !== id) throw new Error(`${id}.json says its id is "${recipe.id}" — they must match`);
  const work = join(WORK_DIR, `extend-${id}-${process.pid}`);
  mkdirSync(work, { recursive: true });
  try {
    const src = join(work, 'src.wav');
    ffmpeg(['-i', join(CONTENT_DIR, recipe.source), ...W, src]);
    const sourceSec = wavDurationSec(src);
    const targetSec = recipe.length_min * 60;
    const { cuts, fills } = planExtension(sourceSec, recipe.extend_pauses, targetSec, CROSSFADE_SEC);

    // The ambience: the quiet middle of every listed pause, crossfaded together,
    // then repeated so any one fill can come from a different stretch of it.
    const middles = [...recipe.extend_pauses]
      .sort((a, b) => a[0] - b[0])
      .map(([s, e], i) => {
        const p = join(work, `mid${i}.wav`);
        ffmpeg(['-ss', (s + EDGE_SEC).toFixed(3), '-to', (e - EDGE_SEC).toFixed(3), '-i', src, ...W, p]);
        return p;
      });
    const bed = join(work, 'bed.wav');
    crossfadeAll(middles, bed);
    const longest = Math.max(...fills);
    const copies = Math.max(2, Math.ceil(longest / Math.max(1, wavDurationSec(bed) - CROSSFADE_SEC)) + 1);
    const bedLong = join(work, 'bed-long.wav');
    crossfadeAll(Array.from({ length: copies }, () => bed), bedLong);
    const bedSec = wavDurationSec(bedLong);

    const pieces: string[] = [];
    let cursor = 0;
    cuts.forEach((cut, i) => {
      const before = join(work, `part${i}.wav`);
      ffmpeg(['-ss', cursor.toFixed(3), '-to', cut.toFixed(3), '-i', src, ...W, before]);
      pieces.push(before);
      const offset = (i * 37) % Math.max(1, bedSec - fills[i] - 1);
      const fill = join(work, `fill${i}.wav`);
      ffmpeg(['-ss', offset.toFixed(3), '-t', fills[i].toFixed(3), '-i', bedLong, ...W, fill]);
      pieces.push(fill);
      cursor = cut;
    });
    const tail = join(work, 'tail.wav');
    ffmpeg(['-ss', cursor.toFixed(3), '-i', src, ...W, tail]);
    pieces.push(tail);

    const joined = join(work, 'joined.wav');
    crossfadeAll(pieces, joined);

    // Two-pass loudness, to sit with the other recordings.
    const target = 'I=-18:TP=-1.5:LRA=11';
    const err = ffmpeg(['-i', joined, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-']);
    const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
    const apply =
      `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
      `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    const out = audioPath(id);
    mkdirSync(join(out, '..'), { recursive: true });
    ffmpeg([
      '-i', joined, '-af', apply, '-ar', '44100', '-map_metadata', '-1',
      '-metadata', `title=${recipe.title}`, '-c:a', 'libmp3lame', '-b:a', '160k', out,
    ]);
    const durationSec = wavDurationSec(joined);

    const record: RenderRecord = {
      id,
      title: recipe.title,
      script_sha256: sourceSha(id),
      voice_id: `uploaded: ${recipe.voice}`,
      model_id: 'uploaded',
      voice_settings: null,
      seed: 0,
      ambience: 'recording',
      duration_sec: Math.round(durationSec * 10) / 10,
      rendered_at: new Date().toISOString(),
    };
    writeJson(recordPath(id), record);

    console.log(`\n✓ ${recipe.title} (${recipe.voice}) → ${out.replace(`${ROOT}/`, '')}`);
    console.log(
      `  ${formatDuration(durationSec)} long, from ${formatDuration(sourceSec)} — ` +
        `${cuts.length} pauses lengthened by ${fills.map((f) => Math.round(f - 2 * CROSSFADE_SEC)).join(', ')}s`,
    );
    console.log(`  Not approved. Listen to all of it, then: npx tsx scripts/approveMeditation.ts ${id}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npx tsx scripts/extendRecording.ts <id> | --all');
  process.exit(1);
}
try {
  for (const id of arg === '--all' ? listRecordingIds() : [arg]) extend(id);
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}


/**
 * Build the Workouts exercise library from free-exercise-db.
 *
 * ⚠ Its photos and instructions are probably copyrighted (scraped, likely from
 * Bodybuilding.com) despite the repo's Unlicense label. Don't ship them; see
 * the first Now item in docs/backlog.md.
 *
 * Run with: npx tsx scripts/importExerciseLibrary.ts
 *
 * Reads content/exercise-library/picks.tsv (what to import and what to call
 * it) and steps-overrides.json, downloads the dataset at a pinned commit, and
 * writes:
 *   - src/data/exerciseLibrary.ts        the exercises and their steps
 *   - src/data/exerciseLibraryImages.ts  require()s for the bundled photos
 *   - assets/exercise-library/<id>_start.jpg / _end.jpg, 440 px wide
 * Photos no longer picked are removed. See content/exercise-library/README.md.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Equipment, ExerciseKind, MuscleGroup } from '../src/types/workouts';

/** The dataset version this library was built from. Bump deliberately. */
const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const RAW = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}`;

const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'content/exercise-library');
const CACHE = join(CONTENT, '.cache');
const ASSETS = join(ROOT, 'assets/exercise-library');
const DATA_FILE = join(ROOT, 'src/data/exerciseLibrary.ts');
const IMAGES_FILE = join(ROOT, 'src/data/exerciseLibraryImages.ts');

const WIDTH = 440;
const QUALITY = 60;

interface Source {
  id: string;
  name: string;
  force: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
}

const MUSCLE: Record<string, MuscleGroup> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  shoulders: 'shoulders',
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abdominals: 'core',
};

const EQUIPMENT: Record<string, Equipment> = {
  barbell: 'barbell',
  'e-z curl bar': 'barbell',
  dumbbell: 'dumbbell',
  kettlebells: 'kettlebell',
  machine: 'machine',
  cable: 'cable',
  'body only': 'bodyweight',
  bands: 'band',
};

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res;
}

/** A photo, downloaded once into the cache. */
async function cachedPhoto(sourceId: string, frame: 0 | 1): Promise<string> {
  const file = join(CACHE, `${sourceId}_${frame}.jpg`);
  if (!existsSync(file)) {
    const res = await fetchOk(`${RAW}/exercises/${encodeURIComponent(sourceId)}/${frame}.jpg`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

function hasCommand(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resize(src: string, dest: string) {
  if (hasCommand('sips')) {
    execFileSync('sips', ['--resampleWidth', String(WIDTH), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), src, '--out', dest], { stdio: 'ignore' });
  } else if (hasCommand('convert')) {
    execFileSync('convert', [src, '-resize', `${WIDTH}x`, '-strip', '-quality', String(QUALITY), '-sampling-factor', '4:2:0', '-interlace', 'JPEG', dest]);
  } else {
    throw new Error('Needs sips (macOS) or ImageMagick to resize photos.');
  }
}

/** The source's steps, minus the closing "Repeat for the recommended…" line. */
const cleanSteps = (steps: string[]): string[] =>
  steps.map((s) => s.trim()).filter((s) => s && !/^repeat (for|to|the|until|as)\b/i.test(s));

const parseOverrides = (field: string | undefined): Record<string, string> =>
  Object.fromEntries((field ?? '').split(/\s+/).filter(Boolean).map((kv) => kv.split('=') as [string, string]));

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(ASSETS, { recursive: true });

  const dataset: Source[] = await (await fetchOk(`${RAW}/dist/exercises.json`)).json();
  const byName = new Map(dataset.map((s) => [s.name, s]));
  const stepOverrides: Record<string, string[]> = JSON.parse(readFileSync(join(CONTENT, 'steps-overrides.json'), 'utf8'));

  const rows = readFileSync(join(CONTENT, 'picks.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.split('\t'));

  const entries: string[] = [];
  const images: string[] = [];
  const keep = new Set<string>();

  for (const [sourceName, id, name, overrideField] of rows) {
    const src = byName.get(sourceName);
    if (!src) throw new Error(`Not in free-exercise-db: "${sourceName}"`);
    const o = parseOverrides(overrideField);
    const muscle = (o.muscle ?? MUSCLE[src.primaryMuscles[0]]) as MuscleGroup;
    if (!muscle) throw new Error(`No muscle group for ${id} (${src.primaryMuscles[0]})`);
    const equipment = (o.equipment ?? EQUIPMENT[src.equipment ?? ''] ?? 'other') as Equipment;
    const kind = (o.kind ??
      (src.force === 'static' ? 'time' : equipment === 'bodyweight' ? 'reps' : 'weight')) as ExerciseKind;
    const steps = stepOverrides[id] ?? cleanSteps(src.instructions);
    if (steps.length === 0) throw new Error(`No steps for ${id}: add them to steps-overrides.json`);
    if (src.images.length < 2) throw new Error(`${id} has no start/end photos in the source`);

    for (const [frame, label] of [
      [0, 'start'],
      [1, 'end'],
    ] as const) {
      const file = `${id}_${label}.jpg`;
      resize(await cachedPhoto(src.id, frame), join(ASSETS, file));
      keep.add(file);
    }

    entries.push(
      `  {\n` +
        `    id: ${JSON.stringify(id)},\n` +
        `    name: ${JSON.stringify(name)},\n` +
        `    kind: '${kind}',\n` +
        `    muscle: '${muscle}',\n` +
        `    equipment: '${equipment}',\n` +
        `    sourceId: ${JSON.stringify(src.id)},\n` +
        `    steps: [\n${steps.map((s) => `      ${JSON.stringify(s)},`).join('\n')}\n    ],\n` +
        `  },`
    );
    images.push(
      `  ${JSON.stringify(id)}: {\n` +
        `    start: require('../../assets/exercise-library/${id}_start.jpg'),\n` +
        `    end: require('../../assets/exercise-library/${id}_end.jpg'),\n` +
        `  },`
    );
  }

  const removed = readdirSync(ASSETS).filter((f) => f.endsWith('.jpg') && !keep.has(f));
  removed.forEach((f) => rmSync(join(ASSETS, f)));

  const header = `// Written by scripts/importExerciseLibrary.ts — don't edit by hand; change\n// content/exercise-library/ and run it again.\n`;
  writeFileSync(
    DATA_FILE,
    header +
      `// From free-exercise-db at ${COMMIT.slice(0, 7)}. Steps are probably copyrighted:\n// see docs/backlog.md before shipping.\n` +
      `import type { LibraryExercise } from '../types/workouts';\n\n` +
      `export const LIBRARY_EXERCISES: LibraryExercise[] = [\n${entries.join('\n')}\n];\n`
  );
  writeFileSync(
    IMAGES_FILE,
    header +
      `import type { ImageSourcePropType } from 'react-native';\n\n` +
      `export const EXERCISE_LIBRARY_IMAGES: Record<string, { start: ImageSourcePropType; end: ImageSourcePropType }> = {\n${images.join('\n')}\n};\n`
  );

  const bytes = [...keep].reduce((n, f) => n + readFileSync(join(ASSETS, f)).length, 0);
  console.log(`${rows.length} exercises, ${keep.size} photos (${(bytes / 1e6).toFixed(1)} MB), ${removed.length} removed.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

/**
 * Shared paths, file helpers and decisions for the exercise demo photo scripts
 * (generateExerciseArt, reviewExerciseArt, approveExerciseArt, publishExerciseArt).
 * See content/exercise-art/README.md.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { BUILT_IN_EXERCISES } from '../src/data/workoutExercises';
import { EXERCISE_DEMOS, PILOT_IDS, type ExerciseDemo } from '../src/data/exerciseDemos';
import type { Exercise } from '../src/types/workouts';
import {
  exerciseStatus,
  finishedPairs,
  livePairs,
  type ArtApprovals,
  type ArtDecision,
  type Candidate,
  type ExerciseState,
  type ExerciseStatus,
} from '../src/utils/exerciseArt/status';

export const ROOT = join(__dirname, '..');
export const ART_DIR = join(ROOT, 'content', 'exercise-art');
/** The picked master athlete photo — committed. */
export const REFERENCE_FILE = join(ART_DIR, 'reference', 'athlete.png');
export const APPROVALS_FILE = join(ART_DIR, 'approvals.json');
export const RUN_LOG = join(ART_DIR, 'runs.jsonl');
/** Candidates and their sidecar JSON — git-ignored. */
export const OUT_DIR = join(ART_DIR, 'out');
export const REFERENCE_OUT_DIR = join(OUT_DIR, 'reference');
/** Pairs set aside by a redo, one folder per redo, kept for comparison — git-ignored. */
export const OLD_DIR = join(OUT_DIR, 'old');
export const POSE_CACHE_DIR = join(ART_DIR, '.cache', 'poses');
/** Approved photos, resized, as the app bundles them. */
export const ASSETS_DIR = join(ROOT, 'assets', 'exercises');
export const IMAGE_MAP_FILE = join(ROOT, 'src', 'data', 'exerciseDemoImages.ts');

const POSE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Written next to every candidate. */
export interface CandidateRecord {
  basis: string;
  model: string;
  prompt: string;
  pose_ref: string | null;
  created_at: string;
}

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const fileSha = (path: string) => (existsSync(path) ? sha256(readFileSync(path)) : null);
export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
export const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
export const rel = (path: string) => relative(ROOT, path);
const now = () => new Date().toISOString();

export function loadEnv() {
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY in .env.local');
}

export const exerciseById = (id: string): Exercise => {
  const ex = BUILT_IN_EXERCISES.find((e) => e.id === id);
  if (!ex) throw new Error(`No built-in exercise "${id}"`);
  return ex;
};

export const demoById = (id: string): ExerciseDemo => {
  const demo = EXERCISE_DEMOS[id];
  if (!demo) throw new Error(`"${id}" has no entry in src/data/exerciseDemos.ts`);
  return demo;
};

/** Every exercise with a spec: the pilot first, then the rest in spec order. */
export const allDemoIds = () => [...PILOT_IDS, ...Object.keys(EXERCISE_DEMOS).filter((id) => !PILOT_IDS.includes(id))];

export const readApprovals = (): ArtApprovals => (existsSync(APPROVALS_FILE) ? readJson(APPROVALS_FILE) : {});

const writeApprovals = (approvals: ArtApprovals) =>
  writeJson(APPROVALS_FILE, Object.fromEntries(Object.entries(approvals).sort(([a], [b]) => a.localeCompare(b))));

export const IMAGE_FILE = /^[\w.-]+\.(png|jpe?g|webp)$/;
export const extFor = (mime: string) => (mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png');
export const mimeFor = (file: string) => (/\.jpe?g$/.test(file) ? 'image/jpeg' : file.endsWith('.webp') ? 'image/webp' : 'image/png');
export const sidecarOf = (imagePath: string) => imagePath.replace(/\.(png|jpe?g|webp)$/, '.json');

/** Every candidate in `dir` whose name is `<prefix>.c<n>.<ext>`. */
export function listCandidates(dir: string, prefix: string): Candidate[] {
  if (!existsSync(dir)) return [];
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.c(\\d+)\\.(png|jpe?g|webp)$`);
  return readdirSync(dir)
    .map((file) => ({ file, m: file.match(pattern) }))
    .filter((x) => x.m)
    .map(({ file, m }) => {
      const path = join(dir, file);
      const record = existsSync(sidecarOf(path)) ? readJson<CandidateRecord>(sidecarOf(path)) : null;
      return { index: Number(m![1]), file, sha256: fileSha(path)!, basis: record?.basis ?? '' };
    })
    .sort((a, b) => a.index - b.index);
}

/** Without extension — the model decides PNG or JPEG. */
export const candidateBase = (id: string, frame: 'start' | 'end', index: number) => join(OUT_DIR, `${id}_${frame}.c${index}`);

export function exerciseState(id: string, approvals = readApprovals()): ExerciseState {
  return {
    hasEnd: !!demoById(id).end,
    reverse: !!demoById(id).reverse,
    starts: listCandidates(OUT_DIR, `${id}_start`),
    ends: listCandidates(OUT_DIR, `${id}_end`),
    reference: fileSha(REFERENCE_FILE),
    decision: approvals[id],
  };
}

export const statusOf = (id: string, approvals = readApprovals()): ExerciseStatus => exerciseStatus(exerciseState(id, approvals));

export const STATUS_LABEL: Record<ExerciseStatus, string> = {
  pending: 'not made yet',
  generated: 'ready for review',
  approved: '✓ approved',
  rejected: '✗ skipped — text only',
  needs_regen: 'redo requested — next run makes fresh pairs',
  waiting: 'waits for the master athlete photo',
};

/** A free-exercise-db pose photo, downloaded once. 0 = start, 1 = end. */
export async function posePhoto(poseRef: string, frame: 'start' | 'end'): Promise<Buffer> {
  const n = frame === 'start' ? 0 : 1;
  const path = join(POSE_CACHE_DIR, `${poseRef}_${n}.jpg`);
  if (existsSync(path)) return readFileSync(path);
  const res = await fetch(`${POSE_URL}/${encodeURIComponent(poseRef)}/${n}.jpg`);
  if (!res.ok) throw new Error(`Pose photo ${poseRef}/${n}.jpg: HTTP ${res.status}`);
  const data = Buffer.from(await res.arrayBuffer());
  mkdirSync(POSE_CACHE_DIR, { recursive: true });
  writeFileSync(path, data);
  return data;
}

// -----------------------------------------------------------------------------
// The founder's decisions. Called by reviewExerciseArt.ts and
// approveExerciseArt.ts, both of which refuse to run without a person at the
// keyboard — nothing else may call these.
// -----------------------------------------------------------------------------

/** Approve pair `index`. Throws if it isn't a finished pair from the current master photo. */
export function approvePair(id: string, index: number) {
  const approvals = readApprovals();
  const pair = finishedPairs(exerciseState(id, approvals)).find((p) => p.index === index);
  if (!pair) throw new Error(`${id}: no finished pair ${index}`);
  const decision: ArtDecision = {
    status: 'approved',
    start: { file: pair.start.file, sha256: pair.start.sha256 },
    ...(pair.end ? { end: { file: pair.end.file, sha256: pair.end.sha256 } } : {}),
    at: now(),
  };
  writeApprovals({ ...approvals, [id]: decision });
}

/** Set every current pair aside (out/old/) and ask for fresh ones, with what was wrong. */
export function requestRedo(id: string, note: string) {
  if (!note.trim()) throw new Error(`${id}: say what was wrong — it goes into the next prompt`);
  const approvals = readApprovals();
  // Its own folder per redo: fresh pairs reuse the freed numbers, so a second
  // redo would otherwise overwrite the first one's files.
  const dir = join(OLD_DIR, `${id}-${now().replace(/[:.]/g, '-')}`);
  mkdirSync(dir, { recursive: true });
  for (const p of livePairs(exerciseState(id, approvals))) {
    for (const c of [p.start, p.end]) {
      if (!c) continue;
      renameSync(join(OUT_DIR, c.file), join(dir, c.file));
      const side = sidecarOf(join(OUT_DIR, c.file));
      if (existsSync(side)) renameSync(side, sidecarOf(join(dir, c.file)));
    }
  }
  writeApprovals({ ...approvals, [id]: { status: 'needs_regen', note: note.trim(), at: now() } });
}

/** No photos for this exercise: the app shows its text description. */
export function skipExercise(id: string, note?: string) {
  const approvals = readApprovals();
  writeApprovals({ ...approvals, [id]: { status: 'rejected', ...(note?.trim() ? { note: note.trim() } : {}), at: now() } });
}

export function clearDecision(id: string) {
  const { [id]: _, ...rest } = readApprovals();
  writeApprovals(rest);
}

/** Make master athlete candidate `index` the reference every photo is made from. */
export function setReference(index: number) {
  const c = listCandidates(REFERENCE_OUT_DIR, 'athlete').find((x) => x.index === index);
  if (!c) throw new Error(`No master athlete candidate c${index}`);
  const src = join(REFERENCE_OUT_DIR, c.file);
  mkdirSync(dirname(REFERENCE_FILE), { recursive: true });
  if (c.file.endsWith('.png')) copyFileSync(src, REFERENCE_FILE);
  else execFileSync('sips', ['-s', 'format', 'png', src, '--out', REFERENCE_FILE], { stdio: 'ignore' });
}

/** Approval is for a person who looked at the photos. */
export function requirePerson() {
  if (!process.stdin.isTTY) throw new Error('This has to be run by a person at the keyboard.');
}

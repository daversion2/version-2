/**
 * Demo data for the Lab mini-apps (Workouts, Meditate), driven by
 * enableDemoData / disableDemoData in ./seedDemoData.ts.
 *
 * Sessions land on the same days as the demo check-ins of the habits linked to
 * each app, so Today, the habit's history and the mini-app all tell one story.
 * With no linked habit there is a fallback schedule, so the app still fills.
 *
 * Reversible the same way as the rest of demo mode: every session carries
 * `is_demo: true`. Workouts also keeps records in their own docs, so on enable
 * they're replayed over real + demo sessions, and on disable rebuilt from the
 * real sessions alone.
 */

import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseRecord,
  LoggedSet,
  SessionBlock,
  Workout,
} from '../types/workouts';
import { CompletedMeditateSession, MeditateMode, SitTechnique } from '../types/meditate';
import type { BreathPatternKey } from '../data/breathPatterns';
import { STARTER_WORKOUTS } from '../data/workoutExercises';
import { fromDisplayWeight, rebuildRecords, sessionVolumeKg } from '../services/workoutMath';
import {
  ensureStarterWorkouts,
  getRecords,
  getWorkoutPrefs,
  listCustomExercises,
  listSessions,
  listWorkouts,
  mergeExerciseLibrary,
  stripUndefined,
} from '../services/labWorkouts';
import { clampMinutes } from '../services/meditateMath';
import { toLocalDateString } from './date';

type Batch = ReturnType<typeof writeBatch>;
export type BatchOp = (batch: Batch) => void;

/** One day a demo session happens on. */
export interface DemoDay {
  /** Days ago. */
  offset: number;
  habitId?: string;
  /** From the check-in's own duration field, when it has one. */
  durationMin?: number;
  /** Meditate only: which mode the linked habit sits in. */
  mode?: MeditateMode;
}

const jitter = (seed: number, mod: number): number => Math.abs((seed * 2654435761) % 4294967296) % mod;

const at = (offset: number, hour: number, minute: number, now: Date): Date => {
  const d = new Date(now);
  d.setDate(d.getDate() - offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

/** Where each starter lift begins (lb) and how much it climbs per two outings. */
const START_LB: Record<string, [number, number]> = {
  'bench-press': [115, 5],
  'overhead-press': [65, 5],
  'incline-db-press': [35, 5],
  deadlift: [185, 10],
  'barbell-row': [95, 5],
  'face-pull': [30, 5],
  'hammer-curl': [25, 5],
  'back-squat': [155, 10],
  'romanian-deadlift': [115, 10],
  'walking-lunge': [25, 5],
  'leg-curl': [70, 5],
  'calf-raise': [90, 10],
};

/** Bodyweight reps / hold seconds at the start, and how many outings per +1. */
const START_BODY: Record<string, [number, number]> = {
  'pull-up': [6, 3],
  dip: [10, 2],
  'push-up': [12, 2],
  plank: [40, 1],
};

/**
 * Fallback when no habit is linked: Mon / Wed / Fri over the window. Weekday is
 * read from the real calendar, so the pattern looks right on any day it's run.
 */
export const fallbackWorkoutDays = (windowDays: number, now: Date): DemoDay[] => {
  const out: DemoDay[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    const weekday = at(offset, 12, 0, now).getDay();
    if (weekday === 1 || weekday === 3 || weekday === 5) out.push({ offset });
  }
  return out;
};

/**
 * Push / Pull / Legs in turn, the weights climbing a step every second time
 * each lift comes round. The last set now and then comes up a rep short, and
 * now and then one long — enough for records to have something to say.
 */
export const buildWorkoutDemo = (
  days: DemoDay[],
  exercisesById: Record<string, Exercise>,
  now: Date,
  realRecords: Record<string, ExerciseRecord> = {}
): CompletedWorkoutSession[] => {
  const outings: Record<string, number> = {};
  const sorted = [...days].sort((a, b) => b.offset - a.offset);
  const sessions: CompletedWorkoutSession[] = sorted.map((day, i) => {
    const plan = STARTER_WORKOUTS[i % STARTER_WORKOUTS.length];
    const started = at(day.offset, 18, 5 + jitter(day.offset, 40), now);
    const durationSec = (day.durationMin ?? 45 + jitter(day.offset * 3, 4) * 5) * 60;
    let clock = 0;
    const tick = () => new Date(started.getTime() + (clock += 140) * 1000).toISOString();

    const blocks: SessionBlock[] = plan.blocks.map((block) => {
      const sets: LoggedSet[] = [];
      for (let round = 0; round < block.rounds; round++) {
        for (const item of block.items) {
          const n = outings[item.exerciseId] ?? 0;
          const seed = day.offset * 31 + round * 7 + item.exerciseId.length;
          const lastSet = round === block.rounds - 1;
          const wobble = lastSet ? [-1, 0, 0, 1][jitter(seed, 4)] : 0;
          const kind = exercisesById[item.exerciseId]?.kind ?? 'weight';
          const base: LoggedSet = { exerciseId: item.exerciseId, round, at: tick() };
          if (kind === 'weight') {
            const [startLb, step] = START_LB[item.exerciseId] ?? [45, 5];
            base.weightKg = fromDisplayWeight(startLb + step * Math.floor(n / 2), 'lb');
            base.reps = Math.max(1, (item.target.reps ?? 8) + wobble);
          } else {
            const [start, every] = START_BODY[item.exerciseId] ?? [10, 2];
            const value = start + Math.floor(n / every) + wobble;
            if (kind === 'time' || kind === 'distance') base.seconds = Math.max(10, value);
            else base.reps = Math.max(1, value);
          }
          sets.push(base);
        }
      }
      block.items.forEach((it) => (outings[it.exerciseId] = (outings[it.exerciseId] ?? 0) + 1));
      return { ...block, plannedRounds: block.rounds, sets, skipped: false, added: false };
    });

    const session: CompletedWorkoutSession = {
      id: `demo_w_${toLocalDateString(started)}`,
      workout_id: plan.id,
      workout_name: plan.name,
      started_at: started.toISOString(),
      finished_at: new Date(started.getTime() + durationSec * 1000).toISOString(),
      duration_sec: durationSec,
      total_sets: blocks.reduce((t, b) => t + b.sets.length, 0),
      total_volume_kg: Math.round(sessionVolumeKg({ blocks }, exercisesById) * 100) / 100,
      blocks,
      prs: [],
      is_demo: true,
    };
    if (day.habitId) session.habit_id = day.habitId;
    return session;
  });

  // PR badges, in order, over whatever records the account already had.
  const { prsBySession } = rebuildRecords(sessions, exercisesById, realRecords);
  return sessions.map((s) => ({ ...s, prs: prsBySession[s.id] ?? [] }));
};

// ---------------------------------------------------------------------------
// Meditate
// ---------------------------------------------------------------------------

const TECHNIQUES: SitTechnique[] = ['breath', 'body_scan', 'breath', 'open'];
const PATTERNS: BreathPatternKey[] = ['box', 'coherent', '478', 'sigh'];

/** Fallback when no habit is linked: most mornings, the odd one missed. */
export const fallbackMeditateDays = (windowDays: number): DemoDay[] => {
  const out: DemoDay[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    if (offset > 1 && jitter(offset * 5 + 3, 4) === 0) continue;
    out.push({ offset, mode: offset % 9 === 4 ? 'nsdr' : offset % 4 === 1 ? 'breathe' : 'sit' });
  }
  return out;
};

/** Sits lengthen over the weeks; breathwork stays short; NSDR is a recording's length. */
export const buildMeditateDemo = (days: DemoDay[], windowDays: number, now: Date): CompletedMeditateSession[] =>
  days.map((day, i) => {
    const mode = day.mode ?? 'sit';
    const progress = (windowDays - day.offset) / windowDays;
    const seed = day.offset * 17 + i;
    const planned =
      day.durationMin ??
      (mode === 'sit' ? 8 + Math.round(progress * 7) : mode === 'breathe' ? 5 : 20);
    const plannedMin = clampMinutes(mode, planned);
    const endedEarly = mode === 'sit' && jitter(seed, 11) === 0;
    const durationSec = endedEarly ? Math.round(plannedMin * 60 * 0.6) : plannedMin * 60;
    const started = at(day.offset, 7, 2 + jitter(seed, 50), now);
    const session: CompletedMeditateSession = {
      id: `demo_m_${toLocalDateString(started)}_${mode}`,
      mode,
      style: mode === 'breathe' ? 'pacer' : 'timer',
      planned_sec: plannedMin * 60,
      duration_sec: durationSec,
      ended_early: endedEarly,
      started_at: started.toISOString(),
      finished_at: new Date(started.getTime() + durationSec * 1000).toISOString(),
      date: toLocalDateString(started),
      is_demo: true,
    };
    if (mode === 'sit') session.technique = TECHNIQUES[seed % TECHNIQUES.length];
    if (mode === 'breathe') session.pattern = PATTERNS[seed % PATTERNS.length];
    if (mode === 'nsdr') session.nsdr_title = 'Yoga Nidra · 20 min';
    if (day.habitId) session.habit_id = day.habitId;
    return session;
  });

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

const WORKOUT_SESSIONS = 'lab_workout_sessions';
const WORKOUT_RECORDS = 'lab_workout_records';
const WORKOUTS = 'lab_workouts';
const MEDITATE_SESSIONS = 'lab_meditate_sessions';

const uniqueBy = <T,>(list: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>();
  return list.filter((t) => (seen.has(key(t)) ? false : (seen.add(key(t)), true)));
};

const exerciseLibrary = async (userId: string): Promise<Record<string, Exercise>> =>
  Object.fromEntries(mergeExerciseLibrary(await listCustomExercises(userId)).map((e) => [e.id, e]));

/** Each workout's last_done_at, from the sessions given — or none. */
const stampWorkouts = (workouts: Workout[], sessions: CompletedWorkoutSession[]): Workout[] =>
  workouts.map((w) => {
    const last = sessions
      .filter((s) => s.workout_id === w.id)
      .reduce<string | undefined>((max, s) => (!max || s.finished_at > max ? s.finished_at : max), undefined);
    const { last_done_at: _old, ...rest } = w;
    return last ? { ...rest, last_done_at: last } : rest;
  });

/**
 * The writes that put Workouts and Meditate demo sessions into the account.
 * Starter workouts are made first if this account never opened Workouts —
 * those are the same ones a first open would make, so they aren't demo data.
 */
export const miniAppDemoOps = async (
  userId: string,
  input: { workoutDays: DemoDay[]; meditateDays: DemoDay[]; windowDays: number; now?: Date }
): Promise<{ ops: BatchOp[]; workoutSessions: number; meditateSessions: number }> => {
  const now = input.now ?? new Date();
  await ensureStarterWorkouts(userId, await getWorkoutPrefs(userId), now);
  const [exercisesById, realSessions, realRecords, workouts] = await Promise.all([
    exerciseLibrary(userId),
    listSessions(userId, 5000),
    getRecords(userId),
    listWorkouts(userId),
  ]);

  // One workout a day at most, and one session per mode a day: two linked
  // habits checked off the same day share the session.
  const workoutDays = uniqueBy(
    input.workoutDays.length ? input.workoutDays : fallbackWorkoutDays(input.windowDays, now),
    (d) => `${d.offset}`
  );
  const meditateDays = uniqueBy(
    input.meditateDays.length ? input.meditateDays : fallbackMeditateDays(input.windowDays),
    (d) => `${d.offset}:${d.mode ?? 'sit'}`
  );
  const workoutSessions = buildWorkoutDemo(workoutDays, exercisesById, now, realRecords);
  const meditateSessions = buildMeditateDemo(meditateDays, input.windowDays, now);
  const { records } = rebuildRecords([...realSessions, ...workoutSessions], exercisesById);

  const ops: BatchOp[] = [
    ...workoutSessions.map((s) => (b: Batch) => b.set(ref(userId, WORKOUT_SESSIONS, s.id), stripUndefined(s))),
    ...meditateSessions.map((s) => (b: Batch) => b.set(ref(userId, MEDITATE_SESSIONS, s.id), stripUndefined(s))),
    ...Object.entries(records).map(([id, r]) => (b: Batch) => b.set(ref(userId, WORKOUT_RECORDS, id), stripUndefined(r))),
    ...stampWorkouts(workouts, [...realSessions, ...workoutSessions]).map(
      (w) => (b: Batch) => b.set(ref(userId, WORKOUTS, w.id), stripUndefined(w))
    ),
  ];
  return { ops, workoutSessions: workoutSessions.length, meditateSessions: meditateSessions.length };
};

/** Deletes the demo sessions. Run before restoreWorkoutsAfterDemo. */
export const miniAppDemoDeleteOps = async (userId: string): Promise<BatchOp[]> => {
  const [w, m] = await Promise.all([
    getDocs(query(col(userId, WORKOUT_SESSIONS), where('is_demo', '==', true))),
    getDocs(query(col(userId, MEDITATE_SESSIONS), where('is_demo', '==', true))),
  ]);
  return [...w.docs, ...m.docs].map((d) => (b: Batch) => b.delete(d.ref));
};

/**
 * After the demo sessions are gone: records rebuilt from the real ones (a
 * record only demo data set is deleted) and each workout's last-done date
 * put back to its last real session.
 */
export const restoreWorkoutsAfterDemoOps = async (userId: string): Promise<BatchOp[]> => {
  const [exercisesById, sessions, oldRecords, workouts] = await Promise.all([
    exerciseLibrary(userId),
    listSessions(userId, 5000),
    getRecords(userId),
    listWorkouts(userId),
  ]);
  const real = sessions.filter((s) => !s.is_demo);
  const { records } = rebuildRecords(real, exercisesById);
  return [
    ...Object.keys(oldRecords)
      .filter((id) => !records[id])
      .map((id) => (b: Batch) => b.delete(ref(userId, WORKOUT_RECORDS, id))),
    ...Object.entries(records).map(([id, r]) => (b: Batch) => b.set(ref(userId, WORKOUT_RECORDS, id), stripUndefined(r))),
    ...stampWorkouts(workouts, real).map((w) => (b: Batch) => b.set(ref(userId, WORKOUTS, w.id), stripUndefined(w))),
  ];
};

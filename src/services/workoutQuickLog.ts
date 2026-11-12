import type { CompletedWorkoutSession, Exercise, ExerciseRecord, SetValues } from '../types/workouts';
import { addLoggedSets, canLogKind, prefillFrom } from './weeklyVolume';
import { addDays } from './homeDashboard';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// LOG, FROM THE WORKOUTS PAGE (2026-11-11).
//
// "I just went for a 20-minute run — add it to my week." Before this it was
// nine taps through Workouts → More → This week → + Add. Now the Workouts
// page has Log beside Start: a sheet led by what you usually log, last time's
// numbers filled in, and "Same" on the top one to save it exactly as last time.
//
// Each quick log is its own session (founder, 2026-11-11), not folded into the
// day's logged sets: its own doc, rated on its own on Today — both ratings,
// back to back, since it happened before it was logged. It's marked
// `logged_sets` so This week, stats and records treat it like sets added there,
// and stamped as already handed to Today so This week never offers to rate it
// again.
// =============================================================================

/** How far back "you usually log" looks. */
export const USUAL_WINDOW_DAYS = 30;
export const USUAL_COUNT = 4;

/**
 * The exercises you do most, for the top of the sheet: ranked by how many
 * different days they were done in the last 30, then by most recent.
 * Only kinds that can be logged this way, and never an archived exercise.
 */
export const usualExercises = (
  sessions: CompletedWorkoutSession[],
  exercisesById: Record<string, Exercise>,
  now: Date,
  limit = USUAL_COUNT
): Exercise[] => {
  const since = addDays(toLocalDateString(now), -(USUAL_WINDOW_DAYS - 1));
  const days: Record<string, Set<string>> = {};
  const latest: Record<string, string> = {};
  for (const s of sessions) {
    for (const b of s.blocks) {
      for (const set of b.sets) {
        const day = toLocalDateString(new Date(set.at));
        if (day < since) continue;
        (days[set.exerciseId] ??= new Set()).add(day);
        if (!latest[set.exerciseId] || set.at > latest[set.exerciseId]) latest[set.exerciseId] = set.at;
      }
    }
  }
  return Object.keys(days)
    .map((id) => exercisesById[id])
    .filter((e): e is Exercise => !!e && !e.archived_at && canLogKind(e.kind))
    .sort((a, b) => days[b.id].size - days[a.id].size || latest[b.id].localeCompare(latest[a.id]))
    .slice(0, limit);
};

export interface LastTime {
  values: SetValues;
  /** Sets of it in that session. */
  count: number;
  /** When the last set was done. */
  at: string;
}

/** What "Same" repeats: the last set's numbers, as many sets as that session had. Null if never done. */
export const lastTimeFor = (sessions: CompletedWorkoutSession[], exercise: Exercise): LastTime | null => {
  let at: string | undefined;
  let sessionId: string | undefined;
  for (const s of sessions) {
    for (const b of s.blocks) {
      for (const set of b.sets) {
        if (set.exerciseId === exercise.id && (!at || set.at > at)) {
          at = set.at;
          sessionId = s.id;
        }
      }
    }
  }
  if (!at || !sessionId) return null;
  const session = sessions.find((s) => s.id === sessionId)!;
  const count = session.blocks.reduce((n, b) => n + b.sets.filter((x) => x.exerciseId === exercise.id).length, 0);
  return { values: prefillFrom(sessions, exercise), count: Math.max(1, count), at };
};

/**
 * One quick log as its own session: `count` sets of one exercise, done just
 * now. Cardio's minutes become the session's length, so Today's "How long?"
 * opens on them; anything else leaves the length to Today's sheet.
 */
export const quickLogSession = (opts: {
  id: string;
  exercise: Exercise;
  values: SetValues;
  count: number;
  records: Record<string, ExerciseRecord>;
  exercisesById: Record<string, Exercise>;
  now: Date;
}): { session: CompletedWorkoutSession; record: ExerciseRecord } => {
  const { id, exercise, now } = opts;
  const at = now.toISOString();
  const base: CompletedWorkoutSession = {
    id,
    workout_name: exercise.name,
    started_at: at,
    finished_at: at,
    duration_sec: 0,
    total_sets: 0,
    total_volume_kg: 0,
    blocks: [],
    prs: [],
    logged_sets: true,
    quick_log: true,
    // Handed straight to Today to be rated: This week has nothing left to ask.
    checkin_asked_at: at,
    checkin_sent_at: at,
  };
  const { session, record } = addLoggedSets({
    existing: base,
    exercise,
    values: opts.values,
    count: opts.count,
    records: opts.records,
    exercisesById: opts.exercisesById,
    now,
  });
  const seconds =
    exercise.kind === 'cardio' ? session.blocks.reduce((n, b) => n + b.sets.reduce((t, s) => t + (s.seconds ?? 0), 0), 0) : 0;
  const started = new Date(now.getTime() - seconds * 1000).toISOString();
  return { session: { ...session, duration_sec: seconds, started_at: started }, record };
};

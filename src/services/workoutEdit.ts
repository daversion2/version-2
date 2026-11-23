import type {
  CompletedWorkoutSession,
  Exercise,
  ExerciseRecord,
  LoggedSet,
  PersonalRecord,
  SetValues,
  WeightUnit,
} from '../types/workouts';
import { rebuildRecords, recordLines } from './workoutMath';
import { canRemoveSet, editSet, removeSet, replaceSession, withTotals } from './weeklyVolume';

// =============================================================================
// EDITING A FINISHED WORKOUT (founder, 2026-11-23): its sets, its length, or
// the whole session. A session's day and its ratings are deliberately not
// editable: moving a day changes goals and streaks, and a rating is an answer
// given in the moment.
// =============================================================================

export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 600;

const exerciseIdsIn = (session: Pick<CompletedWorkoutSession, 'blocks'> | null | undefined): string[] =>
  session ? session.blocks.flatMap((b) => b.sets.map((s) => s.exerciseId)) : [];

const samePrs = (a: PersonalRecord[], b: PersonalRecord[]): boolean => {
  const key = (pr: PersonalRecord) => `${pr.exerciseId}|${pr.type}|${pr.value}|${pr.previous}|${pr.weightKg ?? ''}`;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.length === right.length && left.every((k, i) => k === right[i]);
};

/**
 * An edit or delete, worked through everything it affects: the records of the
 * exercises it touches, and the record badges of this session and of any later
 * session whose badge changes because of it. Lower a false 2250 lb bench and
 * the real best, set weeks later, gets its badge back.
 *
 * A later session is only rewritten when the edit changed what it earned, so
 * sessions the edit has nothing to do with are left exactly as saved.
 */
export const applySessionEdit = (opts: {
  sessions: CompletedWorkoutSession[];
  sessionId: string;
  next: CompletedWorkoutSession | null;
  exercisesById: Record<string, Exercise>;
}): {
  sessions: CompletedWorkoutSession[];
  /** Every session to write, the edited one included (absent when it was deleted). */
  changed: CompletedWorkoutSession[];
  records: Record<string, ExerciseRecord>;
} => {
  const { sessions, sessionId, next, exercisesById } = opts;
  const previous = sessions.find((s) => s.id === sessionId);
  const touched = new Set([...exerciseIdsIn(previous), ...exerciseIdsIn(next)]);
  const onTouched = (prs: PersonalRecord[] = []) => prs.filter((pr) => touched.has(pr.exerciseId));
  const notTouched = (prs: PersonalRecord[] = []) => prs.filter((pr) => !touched.has(pr.exerciseId));

  const before = rebuildRecords(sessions, exercisesById).prsBySession;
  const replaced = replaceSession(sessions, sessionId, next);
  const after = rebuildRecords(replaced, exercisesById);

  const changed: CompletedWorkoutSession[] = [];
  const updated = replaced.map((s) => {
    const earned = onTouched(after.prsBySession[s.id]);
    if (s.id !== sessionId && samePrs(onTouched(before[s.id]), earned)) return s;
    const withBadges = { ...s, prs: [...notTouched(s.prs), ...earned] };
    changed.push(withBadges);
    return withBadges;
  });

  const records: Record<string, ExerciseRecord> = {};
  for (const id of touched) records[id] = after.records[id] ?? { exerciseId: id };
  return { sessions: updated, changed, records };
};

// --- Length ------------------------------------------------------------------

/**
 * A day of logged sets has no clock, so no length to edit. A quick log is also
 * `logged_sets`, but a cardio one keeps its minutes as the session's length.
 */
export const canEditLength = (session: CompletedWorkoutSession): boolean =>
  !session.logged_sets || (!!session.quick_log && session.duration_sec > 0);

export const sessionMinutes = (session: Pick<CompletedWorkoutSession, 'duration_sec'>): number =>
  Math.round((session.duration_sec ?? 0) / 60);

const cardioSets = (session: CompletedWorkoutSession, exercisesById: Record<string, Exercise>): LoggedSet[] =>
  session.blocks.flatMap((b) => b.sets).filter((s) => exercisesById[s.exerciseId]?.kind === 'cardio');

const isCardioOnly = (session: CompletedWorkoutSession, exercisesById: Record<string, Exercise>): boolean => {
  const all = session.blocks.flatMap((b) => b.sets);
  return all.length > 0 && cardioSets(session, exercisesById).length === all.length;
};

const cardioSeconds = (session: CompletedWorkoutSession, exercisesById: Record<string, Exercise>): number =>
  cardioSets(session, exercisesById).reduce((n, s) => n + (s.seconds ?? 0), 0);

/**
 * In an all-cardio session the set's time and the session's length are the
 * same fact stored twice, so a change to one moves the other by as much.
 */
const keepCardioLength = (
  before: CompletedWorkoutSession,
  after: CompletedWorkoutSession,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => {
  if (!canEditLength(before) || before.duration_sec <= 0) return after;
  if (!isCardioOnly(before, exercisesById) || !isCardioOnly(after, exercisesById)) return after;
  const change = cardioSeconds(after, exercisesById) - cardioSeconds(before, exercisesById);
  return change === 0 ? after : { ...after, duration_sec: Math.max(60, before.duration_sec + change) };
};

/** The length in minutes. A single cardio set moves with it, so "20 → 30 min" is right everywhere. */
export const withSessionMinutes = (
  session: CompletedWorkoutSession,
  minutes: number,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => {
  const wanted = Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(minutes)));
  if (!canEditLength(session) || wanted === sessionMinutes(session)) return session;
  const durationSec = wanted * 60;
  const change = durationSec - session.duration_sec;
  const sets = session.blocks.flatMap((b) => b.sets);
  if (sets.length !== 1 || !isCardioOnly(session, exercisesById)) return { ...session, duration_sec: durationSec };
  return {
    ...session,
    duration_sec: durationSec,
    blocks: session.blocks.map((b) => ({
      ...b,
      sets: b.sets.map((s) => ({ ...s, seconds: Math.max(60, (s.seconds ?? 0) + change) })),
    })),
  };
};

// --- Sets --------------------------------------------------------------------

export const withEditedSet = (
  session: CompletedWorkoutSession,
  at: { blockIndex: number; setIndex: number },
  values: SetValues,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => keepCardioLength(session, editSet(session, at, values, exercisesById), exercisesById);

/** Null when it was the session's last set: there'd be nothing left, so that's deleting the session. */
export const withRemovedSet = (
  session: CompletedWorkoutSession,
  at: { blockIndex: number; setIndex: number },
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession | null => {
  if (!canRemoveSet(session, at)) return session;
  const next = removeSet(session, at, exercisesById);
  if (!next || next.total_sets === 0) return null;
  return keepCardioLength(session, next, exercisesById);
};

/** One more set (or, in a circuit, one more round), repeating the last one's numbers. */
export const withAddedRound = (
  session: CompletedWorkoutSession,
  blockIndex: number,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => {
  const block = session.blocks[blockIndex];
  const per = block?.items.length ?? 0;
  if (!block || per === 0 || block.sets.length < per) return session;
  const round = Math.floor(block.sets.length / per);
  const added = block.sets.slice(-per).map((s) => ({ ...s, round }));
  const sets = [...block.sets, ...added];
  const blocks = session.blocks.map((b, i) =>
    i === blockIndex ? { ...b, sets, rounds: Math.max(b.rounds, round + 1), skipped: false } : b
  );
  return keepCardioLength(session, withTotals({ ...session, blocks }, exercisesById), exercisesById);
};

/**
 * A circuit's last whole round off. Only from the end: its sets belong to their
 * exercises by position, so a round from the middle would shift the rest.
 * Null when that leaves the session with no sets.
 */
export const withoutLastRound = (
  session: CompletedWorkoutSession,
  blockIndex: number,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession | null => {
  const block = session.blocks[blockIndex];
  const per = block?.items.length ?? 0;
  if (!block || per === 0 || block.sets.length < per) return session;
  const sets = block.sets.slice(0, block.sets.length - (block.sets.length % per || per));
  const blocks = session.blocks.map((b, i) => (i === blockIndex ? { ...b, sets } : b));
  const next = withTotals({ ...session, blocks }, exercisesById);
  return next.total_sets === 0 ? null : keepCardioLength(session, next, exercisesById);
};

// --- Where a record came from, and what a delete leaves behind ------------------

export interface RecordSource {
  line: string;
  /** The session that first reached this number. Absent if none holds it any more. */
  sessionId?: string;
}

const CLOSE = 1e-6;

/** Each line of a record ("Heaviest 225 lb"), with the session that set it. */
export const recordSources = (
  record: ExerciseRecord,
  sessions: CompletedWorkoutSession[],
  unit: WeightUnit
): RecordSource[] => {
  const oldestFirst = [...sessions].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const firstWith = (matches: (set: LoggedSet) => boolean) =>
    oldestFirst.find((s) => s.blocks.some((b) => b.sets.some((set) => set.exerciseId === record.exerciseId && matches(set))))?.id;
  const near = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < CLOSE;

  const fields: { only: Partial<ExerciseRecord>; matches: (set: LoggedSet) => boolean }[] = [];
  const { heaviestKg, maxReps, longestSec, fastestSec, farthestM } = record;
  if (heaviestKg) fields.push({ only: { heaviestKg }, matches: (s) => near(s.weightKg, heaviestKg) });
  if (maxReps) fields.push({ only: { maxReps }, matches: (s) => s.reps === maxReps });
  if (longestSec) fields.push({ only: { longestSec }, matches: (s) => s.seconds === longestSec });
  if (fastestSec) fields.push({ only: { fastestSec }, matches: (s) => s.seconds === fastestSec });
  if (farthestM) fields.push({ only: { farthestM }, matches: (s) => near(s.distanceM, farthestM) });

  return fields.map(({ only, matches }) => {
    const sessionId = firstWith(matches);
    const line = recordLines({ exerciseId: record.exerciseId, ...only }, unit)[0];
    return sessionId ? { line, sessionId } : { line };
  });
};

/** A workout's "last done" once these sessions are what's left. Undefined if it's no longer been done. */
export const lastDoneAt = (sessions: CompletedWorkoutSession[], workoutId: string): string | undefined =>
  sessions
    .filter((s) => s.workout_id === workoutId)
    .reduce<string | undefined>((newest, s) => (!newest || s.finished_at > newest ? s.finished_at : newest), undefined);

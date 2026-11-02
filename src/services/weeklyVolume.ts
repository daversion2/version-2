import type {
  CompletedWorkoutSession,
  Exercise,
  ExerciseKind,
  ExerciseRecord,
  LoggedSet,
  PersonalRecord,
  SessionBlock,
  SetValues,
  WeightUnit,
} from '../types/workouts';
import { getWeekStart, toLocalDateString } from '../utils/date';
import {
  applySetsToRecord,
  formatCount,
  formatSeconds,
  formatVolume,
  formatWeight,
  rebuildRecords,
  sessionVolumeKg,
} from './workoutMath';

// =============================================================================
// THIS WEEK — volume per exercise per week (founder, 2026-11-01).
//
// Some people track by the week instead of by the workout: squat at 60 lb,
// keep adding reps until Sunday. The screen shows every exercise done this
// week, from any workout, and lets sets be added or edited from right there.
//
// Sets added here are saved as an ordinary CompletedWorkoutSession, one per
// day (id `log_<date>`, `logged_sets: true`). So stats, history, PRs and the
// Home dashboard count them with no changes of their own, and someone who
// only ever logs here never has to start a workout.
//
// The day's first logged set asks "rate it now?" once, unless a workout
// already ran that day: the rating is what counts the day toward the weekly
// goal (services/appCheckins.ts).
//
// Weeks start Monday, the same as Stats. A session belongs to the week its
// finished_at falls in, also the same as Stats.
// =============================================================================

export const LOG_SESSION_NAME = 'Logged sets';

/** Sets added on This week can be these kinds. Distance (a timed mile) can't. */
export const canLogKind = (kind: ExerciseKind): boolean => kind !== 'distance';

/** Weight and reps exercises count reps toward a target; holds count seconds. */
export const targetUnit = (kind: ExerciseKind): 'reps' | 'sec' | null =>
  kind === 'weight' || kind === 'reps' ? 'reps' : kind === 'time' ? 'sec' : null;

export const logSessionId = (date: string): string => `log_${date}`;

export const isLogSession = (s: Pick<CompletedWorkoutSession, 'logged_sets'>): boolean => s.logged_sets === true;

/** Monday 00:00 of this week, and of the next. */
export const weekBounds = (now: Date): { start: Date; end: Date } => {
  const start = getWeekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const inRange = (iso: string, start: Date, end: Date): boolean => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
};

// --- Reading a week ----------------------------------------------------------------

/** One logged set, and where it lives, so it can be edited in place. */
export interface WeekEntry {
  sessionId: string;
  sessionName: string;
  fromLog: boolean;
  /** The local day of its session. */
  date: string;
  blockIndex: number;
  setIndex: number;
  set: LoggedSet;
}

export interface ExerciseWeek {
  exerciseId: string;
  kind: ExerciseKind;
  sets: number;
  reps: number;
  seconds: number;
  volumeKg: number;
  /** The weight of the most recent weighted set, for prefilling the next one. */
  lastWeightKg?: number;
  /** Reps or seconds a week, when one is set. */
  target?: number;
  /** Toward the target: reps, or seconds for a hold. */
  progress: number;
  lastWeekVolumeKg: number;
  lastWeekProgress: number;
  /** Newest first. */
  entries: WeekEntry[];
}

export interface WeekSummary {
  start: Date;
  end: Date;
  rows: ExerciseWeek[];
  totalSets: number;
  totalVolumeKg: number;
  lastWeekVolumeKg: number;
  /** Whole percent, or null with nothing last week to compare to. */
  volumeChangePct: number | null;
}

/** Every set in the span, newest first. Sets whose exercise is unknown are dropped. */
export const entriesBetween = (
  sessions: CompletedWorkoutSession[],
  exercisesById: Record<string, Exercise>,
  start: Date,
  end: Date
): WeekEntry[] => {
  const out: WeekEntry[] = [];
  for (const session of sessions) {
    if (!inRange(session.finished_at, start, end)) continue;
    const date = toLocalDateString(new Date(session.finished_at));
    session.blocks.forEach((block, blockIndex) =>
      block.sets.forEach((set, setIndex) => {
        if (!exercisesById[set.exerciseId]) return;
        out.push({
          sessionId: session.id,
          sessionName: session.workout_name,
          fromLog: isLogSession(session),
          date,
          blockIndex,
          setIndex,
          set,
        });
      })
    );
  }
  return out.sort((a, b) => b.set.at.localeCompare(a.set.at));
};

const tally = (entries: WeekEntry[], kind: ExerciseKind) => {
  let reps = 0;
  let seconds = 0;
  let volumeKg = 0;
  for (const { set } of entries) {
    if (kind === 'weight' || kind === 'reps') reps += set.reps ?? 0;
    if (kind === 'time' || kind === 'distance') seconds += set.seconds ?? 0;
    if (kind === 'weight') volumeKg += (set.weightKg ?? 0) * (set.reps ?? 0);
  }
  const progress = targetUnit(kind) === 'sec' ? seconds : reps;
  return { reps, seconds, volumeKg, progress };
};

const pctChange = (now: number, before: number): number | null =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null;

/**
 * The week on one screen: every exercise done this week, plus any with a
 * target (at zero until it's done). Most volume first, then most sets;
 * targeted-but-not-started ones last, by name.
 */
export const weekSummary = (opts: {
  sessions: CompletedWorkoutSession[];
  exercisesById: Record<string, Exercise>;
  targets?: Record<string, number>;
  now: Date;
}): WeekSummary => {
  const { sessions, exercisesById, targets = {}, now } = opts;
  const { start, end } = weekBounds(now);
  const lastStart = new Date(start);
  lastStart.setDate(lastStart.getDate() - 7);

  const thisWeek = entriesBetween(sessions, exercisesById, start, end);
  const lastWeek = entriesBetween(sessions, exercisesById, lastStart, start);

  const ids = new Set<string>(thisWeek.map((e) => e.set.exerciseId));
  Object.entries(targets).forEach(([id, n]) => {
    if (n > 0 && exercisesById[id] && !exercisesById[id].archived_at) ids.add(id);
  });

  const rows: ExerciseWeek[] = [...ids].map((exerciseId) => {
    const kind = exercisesById[exerciseId].kind;
    const mine = thisWeek.filter((e) => e.set.exerciseId === exerciseId);
    const before = lastWeek.filter((e) => e.set.exerciseId === exerciseId);
    const now_ = tally(mine, kind);
    const prev = tally(before, kind);
    const lastWeighted = [...mine, ...before].find((e) => (e.set.weightKg ?? 0) > 0);
    const target = targets[exerciseId];
    return {
      exerciseId,
      kind,
      sets: mine.length,
      reps: now_.reps,
      seconds: now_.seconds,
      volumeKg: now_.volumeKg,
      ...(lastWeighted ? { lastWeightKg: lastWeighted.set.weightKg } : {}),
      ...(target && target > 0 && targetUnit(kind) ? { target } : {}),
      progress: now_.progress,
      lastWeekVolumeKg: prev.volumeKg,
      lastWeekProgress: prev.progress,
      entries: mine,
    };
  });

  rows.sort((a, b) => {
    if ((a.sets > 0) !== (b.sets > 0)) return a.sets > 0 ? -1 : 1;
    return (
      b.volumeKg - a.volumeKg ||
      b.sets - a.sets ||
      (exercisesById[a.exerciseId].name).localeCompare(exercisesById[b.exerciseId].name)
    );
  });

  const totalVolumeKg = rows.reduce((sum, r) => sum + r.volumeKg, 0);
  const lastWeekVolumeKg = lastWeek.reduce(
    (sum, e) =>
      exercisesById[e.set.exerciseId].kind === 'weight' ? sum + (e.set.weightKg ?? 0) * (e.set.reps ?? 0) : sum,
    0
  );

  return {
    start,
    end,
    rows,
    totalSets: thisWeek.length,
    totalVolumeKg,
    lastWeekVolumeKg,
    volumeChangePct: pctChange(totalVolumeKg, lastWeekVolumeKg),
  };
};

/** 0-1, capped: past the target is still a full bar. */
export const targetFraction = (row: Pick<ExerciseWeek, 'progress' | 'target'>): number =>
  row.target ? Math.min(1, row.progress / row.target) : 0;

/** Sets → entries grouped by day, newest day first, for the exercise's page. */
export const entriesByDay = (entries: WeekEntry[]): { date: string; entries: WeekEntry[] }[] => {
  const days = new Map<string, WeekEntry[]>();
  for (const e of entries) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({ date, entries: list }));
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 12 – 18", or "Oct 26 – Nov 1" across a month. */
export const weekLabel = (start: Date): string => {
  const last = new Date(start);
  last.setDate(last.getDate() + 6);
  const from = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  return last.getMonth() === start.getMonth()
    ? `${from} – ${last.getDate()}`
    : `${from} – ${MONTHS[last.getMonth()]} ${last.getDate()}`;
};

/** "60 lb · 47 reps · 6 sets · 2,820 lb", "47 reps · 6 sets", "4:30 held · 6 sets". */
export const describeWeekRow = (row: ExerciseWeek, unit: WeightUnit): string => {
  if (row.sets === 0) return 'Not done yet this week';
  const sets = `${row.sets} ${row.sets === 1 ? 'set' : 'sets'}`;
  const reps = `${formatCount(row.reps)} reps`;
  switch (row.kind) {
    case 'weight':
      return [row.lastWeightKg ? formatWeight(row.lastWeightKg, unit) : null, reps, sets, formatVolume(row.volumeKg, unit)]
        .filter(Boolean)
        .join(' · ');
    case 'reps':
      return `${reps} · ${sets}`;
    case 'time':
      return `${formatSeconds(row.seconds)} held · ${sets}`;
    case 'distance':
      return sets;
  }
};

/**
 * The week in a line for Workouts' home: "2,820 lb · 6 sets across 2
 * exercises", or just "6 sets across 2 exercises" when nothing weighted was done.
 */
export const describeWeekTotals = (week: Pick<WeekSummary, 'rows' | 'totalSets' | 'totalVolumeKg'>, unit: WeightUnit): string => {
  const done = week.rows.filter((r) => r.sets > 0).length;
  const counts = `${week.totalSets} ${week.totalSets === 1 ? 'set' : 'sets'} across ${done} ${done === 1 ? 'exercise' : 'exercises'}`;
  return week.totalVolumeKg > 0 ? `${formatVolume(week.totalVolumeKg, unit)} · ${counts}` : counts;
};

/** "47 / 100 reps", "2:30 / 5:00". */
export const describeTarget = (row: Pick<ExerciseWeek, 'kind' | 'progress' | 'target'>): string | null => {
  if (!row.target) return null;
  return targetUnit(row.kind) === 'sec'
    ? `${formatSeconds(row.progress)} / ${formatSeconds(row.target)}`
    : `${formatCount(row.progress)} / ${formatCount(row.target)} reps`;
};

/** The numbers to open "+ Add" on: the exercise's most recent set anywhere, or a sensible start. */
export const prefillFrom = (
  sessions: CompletedWorkoutSession[],
  exercise: Pick<Exercise, 'id' | 'kind'>
): SetValues => {
  let latest: LoggedSet | undefined;
  for (const s of sessions) {
    for (const b of s.blocks) {
      for (const set of b.sets) {
        if (set.exerciseId === exercise.id && (!latest || set.at > latest.at)) latest = set;
      }
    }
  }
  if (exercise.kind === 'time') return { seconds: latest?.seconds || 30 };
  if (exercise.kind === 'reps') return { reps: latest?.reps || 10 };
  return { weightKg: latest?.weightKg ?? 0, reps: latest?.reps || 10 };
};

// --- Changing a week ------------------------------------------------------------

/** Values that make a real set for this kind of exercise. */
export const isLoggableSet = (kind: ExerciseKind, v: SetValues): boolean => {
  if (kind === 'weight') return (v.reps ?? 0) > 0 && (v.weightKg ?? -1) >= 0;
  if (kind === 'reps') return (v.reps ?? 0) > 0;
  if (kind === 'time') return (v.seconds ?? 0) > 0;
  return false;
};

/** Only the numbers this kind of exercise records — no stray weight on a plank. */
export const cleanValues = (kind: ExerciseKind, v: SetValues): SetValues => {
  if (kind === 'weight') return { reps: Math.round(v.reps ?? 0), weightKg: Math.max(0, v.weightKg ?? 0) };
  if (kind === 'reps') return { reps: Math.round(v.reps ?? 0) };
  return { seconds: Math.round(v.seconds ?? 0) };
};

/** Totals recomputed from the sets, after anything about them changed. */
export const withTotals = (
  session: CompletedWorkoutSession,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => ({
  ...session,
  total_sets: session.blocks.reduce((n, b) => n + b.sets.length, 0),
  total_volume_kg: Math.round(sessionVolumeKg(session, exercisesById) * 100) / 100,
});

const emptyLogSession = (date: string, now: Date): CompletedWorkoutSession => ({
  id: logSessionId(date),
  workout_name: LOG_SESSION_NAME,
  started_at: now.toISOString(),
  finished_at: now.toISOString(),
  duration_sec: 0,
  total_sets: 0,
  total_volume_kg: 0,
  blocks: [],
  prs: [],
  logged_sets: true,
});

const logBlock = (exerciseId: string, now: Date): SessionBlock => ({
  id: `b_${exerciseId}_${now.getTime()}`,
  type: 'single',
  items: [{ exerciseId, target: {} }],
  rounds: 0,
  restSec: 0,
  plannedRounds: 0,
  sets: [],
  skipped: false,
  added: true,
});

/**
 * `count` identical sets of one exercise added to today's logged-sets session
 * (made if there isn't one yet). "60 lb × 10, 3 sets" is three real sets, so
 * PRs stay about single sets and the week's set count is honest.
 *
 * Returns the PRs the new sets set against `records`, which are folded into
 * the session's own list for History.
 */
export const addLoggedSets = (opts: {
  existing?: CompletedWorkoutSession;
  exercise: Exercise;
  values: SetValues;
  count: number;
  records: Record<string, ExerciseRecord>;
  exercisesById: Record<string, Exercise>;
  now: Date;
}): { session: CompletedWorkoutSession; record: ExerciseRecord; prs: PersonalRecord[] } => {
  const { exercise, now } = opts;
  const date = toLocalDateString(now);
  const base = opts.existing ?? emptyLogSession(date, now);
  const values = cleanValues(exercise.kind, opts.values);
  const count = Math.max(1, Math.round(opts.count));

  const blocks = base.blocks.map((b) => ({ ...b, sets: [...b.sets] }));
  let block = blocks.find((b) => b.items[0]?.exerciseId === exercise.id);
  if (!block) {
    block = logBlock(exercise.id, now);
    blocks.push(block);
  }
  const added: LoggedSet[] = Array.from({ length: count }, (_, i) => ({
    ...values,
    exerciseId: exercise.id,
    round: block!.sets.length + i,
    at: now.toISOString(),
  }));
  block.sets.push(...added);
  block.rounds = block.sets.length;

  const { record, prs } = applySetsToRecord(exercise.id, exercise.kind, added, opts.records[exercise.id]);
  const session = withTotals(
    { ...base, blocks, finished_at: now.toISOString(), prs: [...base.prs, ...prs] },
    opts.exercisesById
  );
  return { session, record, prs };
};

/** One set's numbers changed. Its time stays, so it stays on its day. */
export const editSet = (
  session: CompletedWorkoutSession,
  at: { blockIndex: number; setIndex: number },
  values: SetValues,
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession => {
  const blocks = session.blocks.map((b, bi) =>
    bi !== at.blockIndex
      ? b
      : {
          ...b,
          sets: b.sets.map((s, si) => {
            if (si !== at.setIndex) return s;
            const kind = exercisesById[s.exerciseId]?.kind ?? 'weight';
            return { exerciseId: s.exerciseId, round: s.round, at: s.at, ...cleanValues(kind, values) };
          }),
        }
  );
  return withTotals({ ...session, blocks }, exercisesById);
};

/**
 * Can this one set be deleted on its own? Not from a circuit: its sets belong
 * to their exercises by position (set k is item k % items — see slotSets in
 * workoutSession.ts), so taking one out would hand every later set to the
 * wrong exercise. Editing its numbers is fine.
 */
export const canRemoveSet = (
  session: Pick<CompletedWorkoutSession, 'blocks'>,
  at: { blockIndex: number }
): boolean => (session.blocks[at.blockIndex]?.items.length ?? 0) < 2;

/**
 * One set removed. A logged-sets session left with nothing comes back null,
 * to be deleted; a workout keeps its (now shorter) record of having happened.
 * A set in a circuit can't be removed (canRemoveSet): the session comes back
 * as it was.
 */
export const removeSet = (
  session: CompletedWorkoutSession,
  at: { blockIndex: number; setIndex: number },
  exercisesById: Record<string, Exercise>
): CompletedWorkoutSession | null => {
  if (!canRemoveSet(session, at)) return session;
  const blocks = session.blocks
    .map((b, bi) =>
      bi !== at.blockIndex
        ? b
        : {
            ...b,
            sets: b.sets.filter((_, si) => si !== at.setIndex).map((s, i) => ({ ...s, round: i })),
          }
    )
    .filter((b) => !isLogSession(session) || b.sets.length > 0)
    .map((b) => (isLogSession(session) ? { ...b, rounds: b.sets.length } : b));
  if (isLogSession(session) && blocks.length === 0) return null;
  return withTotals({ ...session, blocks }, exercisesById);
};

/**
 * Records for these exercises, from every session — after an edit or a
 * delete a best can go down, which saving forward can't express. Records are
 * maxima, so a replay is exact (see rebuildRecords).
 */
export const recordsFor = (
  sessions: CompletedWorkoutSession[],
  exercisesById: Record<string, Exercise>,
  exerciseIds: string[]
): Record<string, ExerciseRecord> => {
  const { records } = rebuildRecords(sessions, exercisesById);
  const out: Record<string, ExerciseRecord> = {};
  for (const id of exerciseIds) out[id] = records[id] ?? { exerciseId: id };
  return out;
};

/**
 * An edit or delete from This week, worked through: the sessions after it,
 * the records it changed, and the edited session with its record badges
 * recomputed for the exercises it touched — a set edited down is no longer a
 * record, one edited up may be. Badges for other exercises are kept as saved.
 * (Later sessions' badges aren't revisited: History shows what each session
 * set at the time.)
 */
export const applySessionChange = (opts: {
  sessions: CompletedWorkoutSession[];
  sessionId: string;
  next: CompletedWorkoutSession | null;
  exercisesById: Record<string, Exercise>;
  exerciseIds: string[];
}): {
  sessions: CompletedWorkoutSession[];
  session: CompletedWorkoutSession | null;
  records: Record<string, ExerciseRecord>;
} => {
  const { sessionId, next, exercisesById, exerciseIds } = opts;
  const replaced = replaceSession(opts.sessions, sessionId, next);
  const { records: rebuilt, prsBySession } = rebuildRecords(replaced, exercisesById);
  const records: Record<string, ExerciseRecord> = {};
  for (const id of exerciseIds) records[id] = rebuilt[id] ?? { exerciseId: id };
  if (!next) return { sessions: replaced, session: null, records };
  const touched = new Set(exerciseIds);
  const session: CompletedWorkoutSession = {
    ...next,
    prs: [
      ...next.prs.filter((pr) => !touched.has(pr.exerciseId)),
      ...(prsBySession[next.id] ?? []).filter((pr) => touched.has(pr.exerciseId)),
    ],
  };
  return { sessions: replaceSession(opts.sessions, sessionId, session), session, records };
};

/** Sessions with one replaced (or removed, when `next` is null). */
export const replaceSession = (
  sessions: CompletedWorkoutSession[],
  id: string,
  next: CompletedWorkoutSession | null
): CompletedWorkoutSession[] => {
  const rest = sessions.filter((s) => s.id !== id);
  return next ? [next, ...rest].sort((a, b) => b.finished_at.localeCompare(a.finished_at)) : rest;
};

// --- The check-in --------------------------------------------------------------

const sameDay = (iso: string, date: string) => toLocalDateString(new Date(iso)) === date;

/** A workout run in the app that day — its own rating already counted the day. */
const workoutRanOn = (sessions: CompletedWorkoutSession[], date: string): boolean =>
  sessions.some((s) => !isLogSession(s) && sameDay(s.finished_at, date));

/**
 * Ask "rate it now?" after this save? Only for the day's first logged sets
 * (founder, 2026-11-01: once, on the first attempt), and not when a workout
 * already ran that day.
 */
export const shouldAskCheckin = (
  sessions: CompletedWorkoutSession[],
  logSession: CompletedWorkoutSession
): boolean => {
  if (logSession.checkin_asked_at || logSession.checkin_sent_at) return false;
  return !workoutRanOn(sessions, toLocalDateString(new Date(logSession.finished_at)));
};

/**
 * Today's logged sets haven't been rated yet, so This week keeps a "rate it"
 * button up — the only way a log-only day counts toward the weekly goal.
 */
export const checkinPending = (
  sessions: CompletedWorkoutSession[],
  now: Date
): CompletedWorkoutSession | undefined => {
  const today = toLocalDateString(now);
  const log = sessions.find((s) => s.id === logSessionId(today));
  if (!log || log.checkin_sent_at || log.total_sets === 0) return undefined;
  return workoutRanOn(sessions, today) ? undefined : log;
};

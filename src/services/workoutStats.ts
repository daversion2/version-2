import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseKind,
  LoggedSet,
  MuscleGroup,
  StatsRange,
  WeightUnit,
} from '../types/workouts';
import { getWeekStart } from '../utils/date';
import { formatSeconds, formatWeight, toDisplayWeight } from './workoutMath';

// =============================================================================
// Workouts reporting — pure sums over finished sessions.
//
//   volume = weight × reps, added up over every set (so "× sets" is built in).
//   Bodyweight sets add to sets and reps, not volume. Timed holds add to sets
//   and to time held, never to reps. Distance efforts (a mile run) add to sets
//   only — their seconds are a time to beat, not time held. Circuits need no special case: every set
//   already names its exercise, and an exercise names its body part.
//
// A session in progress is not here — it joins when it's finished.
// =============================================================================

export type { StatsRange };

export interface StatRow {
  exerciseId: string;
  muscle: MuscleGroup;
  kind: ExerciseKind;
  sessionId: string;
  at: Date;
  reps: number;
  weightKg: number;
  seconds: number;
}

export interface StatTotals {
  volumeKg: number;
  sets: number;
  reps: number;
  heaviestKg: number;
  secondsHeld: number;
  sessions: number;
}

/** Start of the span (local time), or null for all time. Weeks start Monday. */
export const rangeStart = (range: StatsRange, now: Date): Date | null => {
  switch (range) {
    case 'week':
      return getWeekStart(now);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return null;
  }
};

/** Every logged set as one flat row. Sets whose exercise is unknown are dropped. */
export const flattenSets = (
  sessions: CompletedWorkoutSession[],
  exercisesById: Record<string, Exercise>
): StatRow[] => {
  const rows: StatRow[] = [];
  for (const session of sessions) {
    const sessionAt = new Date(session.finished_at);
    for (const block of session.blocks) {
      for (const set of block.sets as LoggedSet[]) {
        const exercise = exercisesById[set.exerciseId];
        if (!exercise) continue;
        rows.push({
          exerciseId: set.exerciseId,
          muscle: exercise.muscle,
          kind: exercise.kind,
          sessionId: session.id,
          at: sessionAt,
          reps: exercise.kind === 'time' ? 0 : set.reps ?? 0,
          weightKg: exercise.kind === 'weight' ? set.weightKg ?? 0 : 0,
          seconds: exercise.kind === 'time' ? set.seconds ?? 0 : 0,
        });
      }
    }
  }
  return rows;
};

export const filterRows = (
  rows: StatRow[],
  filter: { from?: Date | null; exerciseId?: string; muscle?: MuscleGroup }
): StatRow[] =>
  rows.filter(
    (r) =>
      (!filter.from || r.at >= filter.from) &&
      (!filter.exerciseId || r.exerciseId === filter.exerciseId) &&
      (!filter.muscle || r.muscle === filter.muscle)
  );

export const totalsOf = (rows: StatRow[]): StatTotals => {
  const sessions = new Set<string>();
  let volumeKg = 0;
  let reps = 0;
  let heaviestKg = 0;
  let secondsHeld = 0;
  for (const r of rows) {
    sessions.add(r.sessionId);
    volumeKg += r.weightKg * r.reps;
    reps += r.reps;
    secondsHeld += r.seconds;
    if (r.reps > 0 && r.weightKg > heaviestKg) heaviestKg = r.weightKg;
  }
  return { volumeKg, sets: rows.length, reps, heaviestKg, secondsHeld, sessions: sessions.size };
};

const byWorkload = <T extends StatTotals>(a: T, b: T) =>
  b.volumeKg - a.volumeKg || b.sets - a.sets || b.reps - a.reps;

export const byExercise = (rows: StatRow[]): (StatTotals & { exerciseId: string })[] => {
  const groups = new Map<string, StatRow[]>();
  rows.forEach((r) => groups.set(r.exerciseId, [...(groups.get(r.exerciseId) ?? []), r]));
  return [...groups].map(([exerciseId, g]) => ({ exerciseId, ...totalsOf(g) })).sort(byWorkload);
};

export const byMuscle = (rows: StatRow[]): (StatTotals & { muscle: MuscleGroup })[] => {
  const groups = new Map<MuscleGroup, StatRow[]>();
  rows.forEach((r) => groups.set(r.muscle, [...(groups.get(r.muscle) ?? []), r]));
  return [...groups].map(([muscle, g]) => ({ muscle, ...totalsOf(g) })).sort(byWorkload);
};

// --- The chart ---------------------------------------------------------------

export interface VolumeBar {
  key: string;
  label: string;
  start: Date;
  volumeKg: number;
  sets: number;
  /** The bar containing today. */
  current: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/**
 * Bars for a span. Week shows the last 8 weeks (one bar alone says nothing);
 * Month shows its weeks; Year its months so far; All every month since the
 * first set, capped at the last 24.
 */
export const volumeBars = (rows: StatRow[], range: StatsRange, now: Date): VolumeBar[] => {
  const weekly = range === 'week' || range === 'month';
  const starts: Date[] = [];
  if (weekly) {
    const thisWeek = getWeekStart(now);
    const first =
      range === 'week' ? addDays(thisWeek, -7 * 7) : getWeekStart(new Date(now.getFullYear(), now.getMonth(), 1));
    for (let d = first; d <= thisWeek; d = addDays(d, 7)) starts.push(d);
  } else {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let first = range === 'year' ? new Date(now.getFullYear(), 0, 1) : thisMonth;
    if (range === 'all' && rows.length) {
      const earliest = rows.reduce((min, r) => (r.at < min ? r.at : min), rows[0].at);
      first = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
      const cap = addMonths(thisMonth, -23);
      if (first < cap) first = cap;
    }
    for (let d = first; d <= thisMonth; d = addMonths(d, 1)) starts.push(d);
  }

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : weekly ? addDays(start, 7) : addMonths(start, 1);
    const inBar = rows.filter((r) => r.at >= start && r.at < end);
    const t = totalsOf(inBar);
    const label = weekly
      ? `${MONTHS[start.getMonth()]} ${start.getDate()}`
      : start.getMonth() === 0 && range === 'all'
        ? `Jan ’${String(start.getFullYear()).slice(2)}`
        : MONTHS[start.getMonth()];
    return {
      key: start.toISOString(),
      label,
      start,
      volumeKg: t.volumeKg,
      sets: t.sets,
      current: now >= start && now < end,
    };
  });
};

// --- One exercise's recent sessions -------------------------------------------

export interface ExerciseSessionLine {
  sessionId: string;
  workoutName: string;
  finishedAt: string;
  sets: LoggedSet[];
}

export const recentSessionsFor = (
  sessions: CompletedWorkoutSession[],
  exerciseId: string,
  max = 10
): ExerciseSessionLine[] =>
  [...sessions]
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
    .map((s) => ({
      sessionId: s.id,
      workoutName: s.workout_name,
      finishedAt: s.finished_at,
      sets: s.blocks.flatMap((b) => b.sets).filter((x) => x.exerciseId === exerciseId),
    }))
    .filter((line) => line.sets.length > 0)
    .slice(0, max);

// --- One exercise's best set, session by session ------------------------------

export interface TrendPoint {
  sessionId: string;
  finishedAt: string;
  /** Weight: kg of the top set. Reps: most reps. Time: longest hold. Distance: fastest time. */
  value: number;
  /** Weight only: the reps done at that top weight (the most, if several sets tied). */
  reps?: number;
}

/** The number that says "better" for each kind of exercise. */
const bestOf = (sets: LoggedSet[], kind: ExerciseKind): Omit<TrendPoint, 'sessionId' | 'finishedAt'> | null => {
  switch (kind) {
    case 'weight': {
      const weighted = sets.filter((x) => (x.weightKg ?? 0) > 0);
      if (weighted.length === 0) return null;
      const top = Math.max(...weighted.map((x) => x.weightKg!));
      return { value: top, reps: Math.max(0, ...weighted.filter((x) => x.weightKg === top).map((x) => x.reps ?? 0)) };
    }
    case 'reps': {
      const reps = sets.map((x) => x.reps ?? 0).filter((n) => n > 0);
      return reps.length ? { value: Math.max(...reps) } : null;
    }
    case 'time': {
      const secs = sets.map((x) => x.seconds ?? 0).filter((n) => n > 0);
      return secs.length ? { value: Math.max(...secs) } : null;
    }
    case 'distance': {
      const secs = sets.map((x) => x.seconds ?? 0).filter((n) => n > 0);
      return secs.length ? { value: Math.min(...secs) } : null;
    }
  }
};

/**
 * The best set of each of the last `max` sessions with this exercise, oldest
 * first — "am I getting stronger?", where the volume chart answers "how much
 * did I do?". Sessions where nothing usable was logged are left out.
 */
export const bestSetTrend = (
  sessions: CompletedWorkoutSession[],
  exerciseId: string,
  kind: ExerciseKind,
  max = 12
): TrendPoint[] =>
  recentSessionsFor(sessions, exerciseId, Number.MAX_SAFE_INTEGER)
    .map((line) => {
      const best = bestOf(line.sets, kind);
      return best ? { sessionId: line.sessionId, finishedAt: line.finishedAt, ...best } : null;
    })
    .filter((p): p is TrendPoint => p !== null)
    .slice(0, max)
    .reverse();

/** Distance is a time to beat: lower is better. Everything else, higher. */
export const lowerIsBetter = (kind: ExerciseKind): boolean => kind === 'distance';

/** "135 lb × 8", "25 reps", "1:30". */
export const formatTrendPoint = (p: TrendPoint, kind: ExerciseKind, unit: WeightUnit): string => {
  switch (kind) {
    case 'weight':
      return p.reps ? `${formatWeight(p.value, unit)} × ${p.reps}` : formatWeight(p.value, unit);
    case 'reps':
      return `${p.value} ${p.value === 1 ? 'rep' : 'reps'}`;
    default:
      return formatSeconds(p.value);
  }
};

/**
 * First vs latest, in words: "Up 20 lb over 6 sessions", "38s faster over 4
 * sessions", "Same as 5 sessions ago". Null with fewer than two points.
 * Weights compare as shown (rounded to the unit), so 0.1 kg of float noise
 * never reads as progress.
 */
export const describeTrend = (points: TrendPoint[], kind: ExerciseKind, unit: WeightUnit): string | null => {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const over = `over ${points.length} sessions`;
  const shown = (v: number) => (kind === 'weight' ? toDisplayWeight(v, unit) : Math.round(v));
  const diff = shown(last) - shown(first);
  if (diff === 0) return `Same as ${points.length - 1} ${points.length - 1 === 1 ? 'session' : 'sessions'} ago`;
  const better = lowerIsBetter(kind) ? diff < 0 : diff > 0;
  const size = Math.abs(diff);
  switch (kind) {
    case 'weight':
      return `${better ? 'Up' : 'Down'} ${size % 1 === 0 ? size : size.toFixed(1)} ${unit} ${over}`;
    case 'reps':
      return `${better ? 'Up' : 'Down'} ${size} ${size === 1 ? 'rep' : 'reps'} ${over}`;
    case 'time':
      return `${formatSeconds(size)} ${better ? 'longer' : 'shorter'} ${over}`;
    case 'distance':
      return `${formatSeconds(size)} ${better ? 'faster' : 'slower'} ${over}`;
  }
};

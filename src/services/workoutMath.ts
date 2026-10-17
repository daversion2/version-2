import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseKind,
  ExerciseRecord,
  LoggedSet,
  PersonalRecord,
  SetValues,
  WeightUnit,
  WorkoutSession,
} from '../types/workouts';

// =============================================================================
// Units — kilograms are the only stored unit, so flipping lb/kg in settings
// re-renders history rather than rewriting it.
// =============================================================================

export const KG_PER_LB = 0.45359237;

/** Rounded to 0.1 so 135 lb survives the round trip through kg as 135. */
export const toDisplayWeight = (kg: number, unit: WeightUnit): number => {
  const value = unit === 'kg' ? kg : kg / KG_PER_LB;
  return Math.round(value * 10) / 10;
};

export const fromDisplayWeight = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? value : value * KG_PER_LB;

export const weightStep = (unit: WeightUnit): number => (unit === 'kg' ? 2.5 : 5);

/**
 * One stepper tap. Snaps to the step grid first, so 137 lb goes to 140 / 135
 * rather than 142 / 132 — plates come in steps, numbers off the grid are typos.
 */
export const stepWeight = (kg: number, unit: WeightUnit, direction: 1 | -1): number => {
  const step = weightStep(unit);
  const units = toDisplayWeight(kg, unit) / step;
  const next = direction > 0 ? Math.floor(units + 1e-9) + 1 : Math.ceil(units - 1e-9) - 1;
  return fromDisplayWeight(Math.max(0, next * step), unit);
};

export const formatNumber = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

export const formatWeight = (kg: number, unit: WeightUnit): string =>
  `${formatNumber(toDisplayWeight(kg, unit))} ${unit}`;

/** 45 → "45s", 90 → "1:30", 3725 → "1:02:05". */
export const formatSeconds = (total: number): string => {
  const s = Math.max(0, Math.round(total));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

/** A clock for a running timer — always m:ss, never "45s". */
export const formatClock = (total: number): string => {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export const formatSetValues = (values: SetValues, kind: ExerciseKind, unit: WeightUnit): string => {
  switch (kind) {
    case 'weight':
      return values.weightKg
        ? `${formatWeight(values.weightKg, unit)} × ${values.reps ?? 0}`
        : `${values.reps ?? 0} reps`;
    case 'reps':
      return `${values.reps ?? 0} reps`;
    case 'time':
      return formatSeconds(values.seconds ?? 0);
  }
};

/** A planned item: "8 reps", "135 lb × 8", "45s". */
export const formatTarget = (target: SetValues, kind: ExerciseKind, unit: WeightUnit): string => {
  if (kind === 'time') return formatSeconds(target.seconds ?? DEFAULT_TARGET.time.seconds!);
  const reps = target.reps ?? DEFAULT_TARGET[kind].reps;
  return kind === 'weight' && target.weightKg
    ? `${formatWeight(target.weightKg, unit)} × ${reps}`
    : `${reps} reps`;
};

// =============================================================================
// Prefill — what's already in the boxes when you reach a set.
// =============================================================================

export const DEFAULT_TARGET: Record<ExerciseKind, SetValues> = {
  weight: { reps: 10, weightKg: 0 },
  reps: { reps: 10 },
  time: { seconds: 30 },
};

/** The sets of one exercise from the most recent session that included it, in log order. */
export const lastSetsFor = (
  sessions: CompletedWorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string
): LoggedSet[] => {
  const newestFirst = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  for (const session of newestFirst) {
    if (session.id === excludeSessionId) continue;
    const sets = session.blocks.flatMap((b) => b.sets).filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return sets;
  }
  return [];
};

/**
 * Last time, then the plan, then a default.
 *
 * Reps and seconds come from the same set last session — that's the number to
 * beat. Weight carries over from whatever you already lifted for this exercise
 * TODAY when there is one: bump set 1 from 135 to 140 and set 2 opens on 140,
 * not back on last week's 135.
 */
export const prefillFor = (
  kind: ExerciseKind,
  target: SetValues,
  lastSets: LoggedSet[],
  setIndex: number,
  todaysSets: LoggedSet[] = []
): { values: SetValues; last?: LoggedSet } => {
  const last = lastSets[setIndex] ?? lastSets[lastSets.length - 1];
  const fallback = DEFAULT_TARGET[kind];
  const today = todaysSets[todaysSets.length - 1];
  switch (kind) {
    case 'weight':
      return {
        last,
        values: {
          reps: last?.reps ?? target.reps ?? fallback.reps,
          weightKg: today?.weightKg ?? last?.weightKg ?? target.weightKg ?? fallback.weightKg,
        },
      };
    case 'reps':
      return { last, values: { reps: last?.reps ?? target.reps ?? fallback.reps } };
    case 'time':
      return { last, values: { seconds: last?.seconds ?? target.seconds ?? fallback.seconds } };
  }
};

// =============================================================================
// Personal records. A record needs something to beat: the first time you do an
// exercise sets the baseline silently, otherwise every new user's first
// session would be a wall of meaningless "PRs".
// =============================================================================

/** Map key for a weight — grams, so no '.' ever lands in a Firestore field name. */
export const weightKey = (kg: number): string => `g${Math.round(kg * 1000)}`;

const EPSILON = 1e-6;

export const applySetsToRecord = (
  exerciseId: string,
  kind: ExerciseKind,
  sets: LoggedSet[],
  existing?: ExerciseRecord
): { record: ExerciseRecord; prs: PersonalRecord[] } => {
  const prs: PersonalRecord[] = [];
  const record: ExerciseRecord = { ...(existing ?? {}), exerciseId };

  if (kind === 'weight') {
    const lifted = sets.filter((s) => (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0);
    if (!lifted.length) return { record, prs };

    const heaviest = Math.max(...lifted.map((s) => s.weightKg!));
    if (existing?.heaviestKg !== undefined && heaviest > existing.heaviestKg + EPSILON) {
      prs.push({ exerciseId, type: 'heaviest', value: heaviest, previous: existing.heaviestKg });
    }
    record.heaviestKg = Math.max(existing?.heaviestKg ?? 0, heaviest);

    // Best reps at each weight this session, then compared one weight at a time.
    const best = new Map<string, { kg: number; reps: number }>();
    for (const s of lifted) {
      const key = weightKey(s.weightKg!);
      const prev = best.get(key);
      if (!prev || s.reps! > prev.reps) best.set(key, { kg: s.weightKg!, reps: s.reps! });
    }
    const repsAtWeight = { ...(existing?.repsAtWeight ?? {}) };
    for (const [key, { kg, reps }] of best) {
      const previous = existing?.repsAtWeight?.[key];
      if (previous !== undefined && reps > previous) {
        prs.push({ exerciseId, type: 'reps_at_weight', value: reps, previous, weightKg: kg });
      }
      repsAtWeight[key] = Math.max(previous ?? 0, reps);
    }
    record.repsAtWeight = repsAtWeight;
    return { record, prs };
  }

  if (kind === 'reps') {
    const reps = sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
    if (!reps.length) return { record, prs };
    const most = Math.max(...reps);
    if (existing?.maxReps !== undefined && most > existing.maxReps) {
      prs.push({ exerciseId, type: 'max_reps', value: most, previous: existing.maxReps });
    }
    record.maxReps = Math.max(existing?.maxReps ?? 0, most);
    return { record, prs };
  }

  const holds = sets.map((s) => s.seconds ?? 0).filter((sec) => sec > 0);
  if (!holds.length) return { record, prs };
  const longest = Math.max(...holds);
  if (existing?.longestSec !== undefined && longest > existing.longestSec) {
    prs.push({ exerciseId, type: 'longest_hold', value: longest, previous: existing.longestSec });
  }
  record.longestSec = Math.max(existing?.longestSec ?? 0, longest);
  return { record, prs };
};

/** Every record a finished session touches, and the PRs it set. */
export const computeSessionRecords = (
  session: WorkoutSession,
  exercisesById: Record<string, Exercise>,
  existing: Record<string, ExerciseRecord>
): { records: Record<string, ExerciseRecord>; prs: PersonalRecord[] } => {
  const byExercise = new Map<string, LoggedSet[]>();
  for (const set of session.blocks.flatMap((b) => b.sets)) {
    byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
  }
  const records: Record<string, ExerciseRecord> = {};
  const prs: PersonalRecord[] = [];
  for (const [exerciseId, sets] of byExercise) {
    const exercise = exercisesById[exerciseId];
    if (!exercise) continue;
    const result = applySetsToRecord(exerciseId, exercise.kind, sets, existing[exerciseId]);
    records[exerciseId] = result.record;
    prs.push(...result.prs);
  }
  return { records, prs };
};

export const describeRecord = (
  pr: PersonalRecord,
  exerciseName: string,
  unit: WeightUnit
): { title: string; detail: string } => {
  switch (pr.type) {
    case 'heaviest':
      return {
        title: `${exerciseName} — heaviest yet`,
        detail: `${formatWeight(pr.value, unit)} (was ${formatWeight(pr.previous, unit)})`,
      };
    case 'reps_at_weight':
      return {
        title: `${exerciseName} — most reps at ${formatWeight(pr.weightKg ?? 0, unit)}`,
        detail: `${pr.value} reps (was ${pr.previous})`,
      };
    case 'max_reps':
      return { title: `${exerciseName} — most reps`, detail: `${pr.value} (was ${pr.previous})` };
    case 'longest_hold':
      return {
        title: `${exerciseName} — longest hold`,
        detail: `${formatSeconds(pr.value)} (was ${formatSeconds(pr.previous)})`,
      };
  }
};

/** Total weight moved: weight × reps over every weighted set. */
export const sessionVolumeKg = (
  session: Pick<WorkoutSession, 'blocks'>,
  exercisesById: Record<string, Exercise>
): number =>
  session.blocks
    .flatMap((b) => b.sets)
    .filter((s) => exercisesById[s.exerciseId]?.kind === 'weight')
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

import { Exercise, ExerciseRecord, ExerciseTest, TestType, TrainingPhase, WeightUnit } from '../types/workouts';
import { DEFAULT_TARGET, formatSeconds, formatWeight } from './workoutMath';
import { compareTest, TestComparison, testTypeFor } from './trainingPhases';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// STANDALONE TESTS — test one exercise any time, no phase needed, and see it
// next to every phase baseline and retest of the same exercise: one history.
// Pure functions; storage is services/labWorkouts.ts.
//
// A reps-at-weight test only compares with an earlier test at the SAME weight:
// 10 reps at 135 lb vs 8 at 155 isn't better or worse, it's a different test.
// =============================================================================

export interface TestHistoryEntry {
  key: string;
  source: 'test' | 'baseline' | 'retest';
  /** "Test", "Phase 2 baseline", "Phase 2 retest". */
  label: string;
  /** ISO time it was done. */
  at: string;
  value: number;
  /** reps_at_weight only. */
  weightKg?: number;
  /** Against the latest earlier entry tested the same way. None for the first. */
  comparison?: TestComparison;
}

export const newExerciseTest = (input: {
  id: string;
  exercise: Exercise;
  value: number;
  weightKg?: number;
  now: Date;
}): ExerciseTest => {
  const test: ExerciseTest = {
    id: input.id,
    exercise_id: input.exercise.id,
    value: input.value,
    tested_at: input.now.toISOString(),
    date: toLocalDateString(input.now),
  };
  if (testTypeFor(input.exercise.kind) === 'reps_at_weight' && input.weightKg && input.weightKg > 0) {
    test.weight_kg = input.weightKg;
  }
  return test;
};

/** Same test, so comparable: same weight for reps-at-weight, any for the rest. */
const sameWay = (type: TestType, a: TestHistoryEntry, b: TestHistoryEntry): boolean =>
  type !== 'reps_at_weight' || (a.weightKg ?? 0) === (b.weightKg ?? 0);

/** Every test of this exercise — standalone and from phases — newest first. */
export const testHistory = (
  exercise: Exercise,
  tests: ExerciseTest[],
  phases: TrainingPhase[]
): TestHistoryEntry[] => {
  const type = testTypeFor(exercise.kind);
  const entries: TestHistoryEntry[] = tests
    .filter((t) => t.exercise_id === exercise.id)
    .map((t) => ({
      key: `test:${t.id}`,
      source: 'test' as const,
      label: 'Test',
      at: t.tested_at,
      value: t.value,
      weightKg: t.weight_kg,
    }));

  for (const p of phases) {
    const weightKg = p.tests.find((t) => t.exerciseId === exercise.id)?.weightKg;
    const base = p.baseline[exercise.id];
    if (base !== undefined && p.baseline_at) {
      entries.push({ key: `base:${p.id}`, source: 'baseline', label: `Phase ${p.number} baseline`, at: p.baseline_at, value: base, weightKg });
    }
    const re = p.retest?.[exercise.id];
    if (re !== undefined && p.retest_at) {
      entries.push({ key: `re:${p.id}`, source: 'retest', label: `Phase ${p.number} retest`, at: p.retest_at, value: re, weightKg });
    }
  }

  entries.sort((a, b) => a.at.localeCompare(b.at));
  return entries
    .map((e, i) => {
      const prev = entries
        .slice(0, i)
        .reverse()
        .find((p) => sameWay(type, p, e));
      return prev ? { ...e, comparison: compareTest(type, prev.value, e.value) } : e;
    })
    .reverse();
};

/**
 * Where the test screen's boxes start: the weight last tested at (so the
 * comparison is like for like), else last session's; the number from the last
 * test, else from records, else a sensible default.
 */
export const testStartValues = (input: {
  exercise: Exercise;
  history: TestHistoryEntry[];
  record?: ExerciseRecord;
  lastSessionWeightKg?: number;
}): { value: number; weightKg?: number } => {
  const { exercise, history, record, lastSessionWeightKg } = input;
  const type = testTypeFor(exercise.kind);
  const last = history[0];
  if (type === 'reps_at_weight') {
    return { value: last?.value ?? 10, weightKg: last?.weightKg ?? lastSessionWeightKg ?? 0 };
  }
  if (last) return { value: last.value };
  switch (type) {
    case 'max_reps':
      return { value: record?.maxReps ?? 10 };
    case 'longest':
      return { value: record?.longestSec ?? 30 };
    case 'fastest':
      return { value: record?.fastestSec ?? DEFAULT_TARGET.distance.seconds! };
  }
};

/** "8 reps at 135 lb", "12 reps", "1:30". */
export const formatTestResult = (type: TestType, value: number, unit: WeightUnit, weightKg?: number): string => {
  switch (type) {
    case 'reps_at_weight':
      return `${value} ${value === 1 ? 'rep' : 'reps'}${weightKg ? ` at ${formatWeight(weightKg, unit)}` : ''}`;
    case 'max_reps':
      return `${value} ${value === 1 ? 'rep' : 'reps'}`;
    default:
      return formatSeconds(value);
  }
};

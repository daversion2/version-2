import { formatTestResult, newExerciseTest, testHistory, testStartValues } from '../exerciseTests';
import { Exercise, ExerciseTest, TrainingPhase } from '../../types/workouts';

const BENCH: Exercise = { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' };
const PULLUP: Exercise = { id: 'pullup', name: 'Pull-up', kind: 'reps', muscle: 'back' };
const MILE: Exercise = { id: 'mile', name: 'Mile Run', kind: 'distance', muscle: 'legs', distanceM: 1609 };

const test = (id: string, exerciseId: string, at: string, value: number, weightKg?: number): ExerciseTest => ({
  id,
  exercise_id: exerciseId,
  value,
  tested_at: at,
  date: at.slice(0, 10),
  ...(weightKg ? { weight_kg: weightKg } : {}),
});

const phase = (over: Partial<TrainingPhase>): TrainingPhase => ({
  id: 'p1',
  number: 1,
  program_name: 'Full body',
  workout_ids: [],
  days_per_week: 3,
  weeks: 6,
  lighter_last_week: false,
  tests: [],
  start_date: '2026-09-01',
  retest_date: '2026-10-13',
  baseline: {},
  status: 'complete',
  created_at: '2026-09-01T09:00:00.000Z',
  updated_at: '2026-09-01T09:00:00.000Z',
  ...over,
});

describe('newExerciseTest', () => {
  const now = new Date(2026, 9, 24, 9);

  it('keeps the weight for a weighted test only', () => {
    expect(newExerciseTest({ id: 't', exercise: BENCH, value: 8, weightKg: 60, now })).toMatchObject({
      exercise_id: 'bench',
      value: 8,
      weight_kg: 60,
      date: '2026-10-24',
    });
    expect('weight_kg' in newExerciseTest({ id: 't', exercise: PULLUP, value: 8, weightKg: 60, now })).toBe(false);
  });
});

describe('testHistory', () => {
  it('merges standalone tests with phase baselines and retests, newest first', () => {
    const phases = [
      phase({
        tests: [{ exerciseId: 'pullup' }],
        baseline: { pullup: 6 },
        baseline_at: '2026-09-01T09:00:00.000Z',
        retest: { pullup: 9 },
        retest_at: '2026-10-13T09:00:00.000Z',
      }),
    ];
    const h = testHistory(PULLUP, [test('a', 'pullup', '2026-10-24T09:00:00.000Z', 11), test('b', 'bench', '2026-10-24T09:00:00.000Z', 3)], phases);
    expect(h.map((e) => e.label)).toEqual(['Test', 'Phase 1 retest', 'Phase 1 baseline']);
    expect(h[0].comparison).toMatchObject({ before: 9, after: 11, state: 'up' });
    expect(h[1].comparison).toMatchObject({ before: 6, after: 9, state: 'up' });
    expect(h[2].comparison).toBeUndefined();
  });

  it('compares a weighted test only with one at the same weight', () => {
    const h = testHistory(
      BENCH,
      [
        test('a', 'bench', '2026-10-01T09:00:00.000Z', 8, 60),
        test('b', 'bench', '2026-10-08T09:00:00.000Z', 6, 70),
        test('c', 'bench', '2026-10-15T09:00:00.000Z', 11, 60),
      ],
      []
    );
    expect(h[0].comparison).toMatchObject({ before: 8, after: 11 });
    expect(h[1].comparison).toBeUndefined();
  });

  it('reads a faster time as better', () => {
    const h = testHistory(
      MILE,
      [test('a', 'mile', '2026-10-01T09:00:00.000Z', 540), test('b', 'mile', '2026-10-15T09:00:00.000Z', 500)],
      []
    );
    expect(h[0].comparison?.state).toBe('up');
  });

  it('ignores a phase that never tested this exercise or has no baseline time', () => {
    const phases = [phase({ baseline: { pullup: 6 } })];
    expect(testHistory(PULLUP, [], phases)).toEqual([]);
  });
});

describe('testStartValues', () => {
  it('starts a weighted test at the weight last tested, so it compares like for like', () => {
    const history = testHistory(BENCH, [test('a', 'bench', '2026-10-01T09:00:00.000Z', 8, 60)], []);
    expect(testStartValues({ exercise: BENCH, history, lastSessionWeightKg: 80 })).toEqual({ value: 8, weightKg: 60 });
    expect(testStartValues({ exercise: BENCH, history: [], lastSessionWeightKg: 80 })).toEqual({ value: 10, weightKg: 80 });
  });

  it('falls back to records, then defaults', () => {
    expect(testStartValues({ exercise: PULLUP, history: [], record: { exerciseId: 'pullup', maxReps: 12 } })).toEqual({ value: 12 });
    expect(testStartValues({ exercise: PULLUP, history: [] })).toEqual({ value: 10 });
  });
});

describe('formatTestResult', () => {
  it('reads by test type', () => {
    expect(formatTestResult('reps_at_weight', 8, 'kg', 60)).toBe('8 reps at 60 kg');
    expect(formatTestResult('max_reps', 1, 'kg')).toBe('1 rep');
    expect(formatTestResult('longest', 90, 'kg')).toBe('1:30');
    expect(formatTestResult('fastest', 502, 'kg')).toBe('8:22');
  });
});

import {
  applySetsToRecord,
  computeSessionRecords,
  describeRecord,
  formatClock,
  formatSeconds,
  formatSetValues,
  formatTarget,
  fromDisplayWeight,
  KG_PER_LB,
  lastSetsFor,
  prefillFor,
  sessionVolumeKg,
  stepWeight,
  toDisplayWeight,
  weightKey,
} from '../workoutMath';
import { CompletedWorkoutSession, Exercise, LoggedSet, SessionBlock } from '../../types/workouts';

const lb = (n: number) => n * KG_PER_LB;

const set = (exerciseId: string, values: Partial<LoggedSet>, round = 0): LoggedSet => ({
  exerciseId,
  round,
  at: '2026-10-17T10:00:00.000Z',
  ...values,
});

const block = (sets: LoggedSet[]): SessionBlock => ({
  id: 'b',
  type: 'single',
  items: [{ exerciseId: sets[0]?.exerciseId ?? 'x', target: {} }],
  rounds: 3,
  restSec: 90,
  plannedRounds: 3,
  sets,
  skipped: false,
  added: false,
});

const session = (id: string, finished_at: string, sets: LoggedSet[]): CompletedWorkoutSession => ({
  id,
  workout_name: 'Push Day',
  started_at: finished_at,
  finished_at,
  duration_sec: 1800,
  total_sets: sets.length,
  total_volume_kg: 0,
  blocks: [block(sets)],
  prs: [],
});

const EXERCISES: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  pushup: { id: 'pushup', name: 'Push-up', kind: 'reps', muscle: 'chest' },
  plank: { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
};

describe('units', () => {
  it('round-trips pounds through kilograms without drift', () => {
    for (const pounds of [45, 135, 137.5, 225, 315]) {
      expect(toDisplayWeight(fromDisplayWeight(pounds, 'lb'), 'lb')).toBe(pounds);
    }
  });

  it('shows the same stored weight in either unit', () => {
    expect(toDisplayWeight(lb(135), 'kg')).toBe(61.2);
    expect(toDisplayWeight(100, 'lb')).toBe(220.5);
  });

  it('steps on the plate grid, snapping an off-grid number first', () => {
    expect(toDisplayWeight(stepWeight(lb(135), 'lb', 1), 'lb')).toBe(140);
    expect(toDisplayWeight(stepWeight(lb(135), 'lb', -1), 'lb')).toBe(130);
    expect(toDisplayWeight(stepWeight(lb(137), 'lb', 1), 'lb')).toBe(140);
    expect(toDisplayWeight(stepWeight(lb(137), 'lb', -1), 'lb')).toBe(135);
    expect(stepWeight(60, 'kg', 1)).toBe(62.5);
  });

  it('never steps below zero', () => {
    expect(stepWeight(0, 'lb', -1)).toBe(0);
    expect(stepWeight(lb(2), 'lb', -1)).toBe(0);
  });
});

describe('formatting', () => {
  it('formats durations short and clocks long', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(3725)).toBe('1:02:05');
    expect(formatClock(45)).toBe('0:45');
  });

  it('formats a set by exercise kind', () => {
    expect(formatSetValues({ weightKg: lb(135), reps: 8 }, 'weight', 'lb')).toBe('135 lb × 8');
    expect(formatSetValues({ weightKg: 0, reps: 8 }, 'weight', 'lb')).toBe('8 reps');
    expect(formatSetValues({ reps: 15 }, 'reps', 'lb')).toBe('15 reps');
    expect(formatSetValues({ seconds: 45 }, 'time', 'lb')).toBe('45s');
  });

  it('formats a plan with its weight only when it has one', () => {
    expect(formatTarget({ reps: 8 }, 'weight', 'lb')).toBe('8 reps');
    expect(formatTarget({ reps: 8, weightKg: lb(135) }, 'weight', 'lb')).toBe('135 lb × 8');
    expect(formatTarget({ seconds: 45 }, 'time', 'lb')).toBe('45s');
  });
});

describe('lastSetsFor', () => {
  it('returns the most recent session that did the exercise', () => {
    const older = session('s1', '2026-10-10T10:00:00Z', [set('bench', { reps: 8, weightKg: 60 })]);
    const newer = session('s2', '2026-10-14T10:00:00Z', [set('bench', { reps: 6, weightKg: 65 })]);
    const unrelated = session('s3', '2026-10-16T10:00:00Z', [set('pushup', { reps: 20 })]);
    expect(lastSetsFor([older, unrelated, newer], 'bench').map((s) => s.reps)).toEqual([6]);
  });

  it('can skip the session in progress', () => {
    const s = session('now', '2026-10-17T10:00:00Z', [set('bench', { reps: 5 })]);
    expect(lastSetsFor([s], 'bench', 'now')).toEqual([]);
  });
});

describe('prefillFor', () => {
  const last = [
    set('bench', { reps: 8, weightKg: 60 }, 0),
    set('bench', { reps: 7, weightKg: 60 }, 1),
  ];

  it('uses the same set from last time', () => {
    expect(prefillFor('weight', { reps: 10 }, last, 1).values).toEqual({ reps: 7, weightKg: 60 });
  });

  it('falls back to last time’s final set when today has more sets', () => {
    expect(prefillFor('weight', {}, last, 3).values).toEqual({ reps: 7, weightKg: 60 });
  });

  it('falls back to the plan, then a default', () => {
    expect(prefillFor('weight', { reps: 5, weightKg: 100 }, [], 0).values).toEqual({ reps: 5, weightKg: 100 });
    expect(prefillFor('weight', {}, [], 0).values).toEqual({ reps: 10, weightKg: 0 });
    expect(prefillFor('time', {}, [], 0).values).toEqual({ seconds: 30 });
    expect(prefillFor('reps', { reps: 12 }, [], 0).values).toEqual({ reps: 12 });
  });

  it('carries today’s weight forward over last time’s', () => {
    const today = [set('bench', { reps: 8, weightKg: 65 })];
    expect(prefillFor('weight', {}, last, 1, today).values).toEqual({ reps: 7, weightKg: 65 });
  });
});

describe('applySetsToRecord', () => {
  it('sets a baseline silently the first time', () => {
    const { record, prs } = applySetsToRecord('bench', 'weight', [set('bench', { reps: 8, weightKg: 60 })]);
    expect(prs).toEqual([]);
    expect(record.heaviestKg).toBe(60);
    expect(record.repsAtWeight).toEqual({ [weightKey(60)]: 8 });
  });

  it('calls out a heavier weight', () => {
    const existing = { exerciseId: 'bench', heaviestKg: 60, repsAtWeight: { [weightKey(60)]: 8 } };
    const { prs, record } = applySetsToRecord('bench', 'weight', [set('bench', { reps: 3, weightKg: 62.5 })], existing);
    expect(prs).toEqual([{ exerciseId: 'bench', type: 'heaviest', value: 62.5, previous: 60 }]);
    expect(record.heaviestKg).toBe(62.5);
  });

  it('calls out more reps at a weight done before, once per weight', () => {
    const existing = { exerciseId: 'bench', heaviestKg: 60, repsAtWeight: { [weightKey(60)]: 8 } };
    const sets = [set('bench', { reps: 9, weightKg: 60 }), set('bench', { reps: 10, weightKg: 60 })];
    const { prs } = applySetsToRecord('bench', 'weight', sets, existing);
    expect(prs).toEqual([
      { exerciseId: 'bench', type: 'reps_at_weight', value: 10, previous: 8, weightKg: 60 },
    ]);
  });

  it('does not call a lighter or equal session a record', () => {
    const existing = { exerciseId: 'bench', heaviestKg: 60, repsAtWeight: { [weightKey(60)]: 8 } };
    const { prs, record } = applySetsToRecord('bench', 'weight', [set('bench', { reps: 8, weightKg: 60 })], existing);
    expect(prs).toEqual([]);
    expect(record.heaviestKg).toBe(60);
  });

  it('treats 135 lb and the same weight in kg as one weight', () => {
    expect(weightKey(lb(135))).toBe(weightKey(61.234956));
  });

  it('ignores weighted sets logged with no weight', () => {
    const { prs, record } = applySetsToRecord('bench', 'weight', [set('bench', { reps: 8, weightKg: 0 })]);
    expect(prs).toEqual([]);
    expect(record.heaviestKg).toBeUndefined();
  });

  it('tracks most reps for bodyweight and longest hold for timed', () => {
    const reps = applySetsToRecord('pushup', 'reps', [set('pushup', { reps: 22 })], { exerciseId: 'pushup', maxReps: 20 });
    expect(reps.prs).toEqual([{ exerciseId: 'pushup', type: 'max_reps', value: 22, previous: 20 }]);
    const hold = applySetsToRecord('plank', 'time', [set('plank', { seconds: 75 })], { exerciseId: 'plank', longestSec: 60 });
    expect(hold.prs).toEqual([{ exerciseId: 'plank', type: 'longest_hold', value: 75, previous: 60 }]);
    expect(hold.record.longestSec).toBe(75);
  });
});

describe('computeSessionRecords', () => {
  it('groups by exercise across blocks and skips unknown exercises', () => {
    const s = {
      blocks: [
        block([set('bench', { reps: 8, weightKg: 70 })]),
        block([set('pushup', { reps: 25 }), set('ghost', { reps: 1 })]),
      ],
    } as any;
    const { records, prs } = computeSessionRecords(s, EXERCISES, {
      bench: { exerciseId: 'bench', heaviestKg: 60 },
      pushup: { exerciseId: 'pushup', maxReps: 20 },
    });
    expect(Object.keys(records).sort()).toEqual(['bench', 'pushup']);
    expect(prs.map((p) => p.type).sort()).toEqual(['heaviest', 'max_reps']);
  });
});

describe('sessionVolumeKg', () => {
  it('counts weight × reps on weighted exercises only', () => {
    const s = {
      blocks: [block([set('bench', { reps: 8, weightKg: 60 }), set('bench', { reps: 6, weightKg: 70 })]), block([set('pushup', { reps: 30 })])],
    };
    expect(sessionVolumeKg(s, EXERCISES)).toBe(8 * 60 + 6 * 70);
  });
});

describe('describeRecord', () => {
  it('reads in the user’s unit', () => {
    const text = describeRecord(
      { exerciseId: 'bench', type: 'heaviest', value: lb(145), previous: lb(140) },
      'Bench Press',
      'lb'
    );
    expect(text).toEqual({ title: 'Bench Press — heaviest yet', detail: '145 lb (was 140 lb)' });
  });
});

import {
  byExercise,
  byMuscle,
  filterRows,
  flattenSets,
  rangeStart,
  recentSessionsFor,
  totalsOf,
  volumeBars,
} from '../workoutStats';
import { CompletedWorkoutSession, Exercise, LoggedSet } from '../../types/workouts';

const EX: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  pushup: { id: 'pushup', name: 'Push-up', kind: 'reps', muscle: 'chest' },
  squat: { id: 'squat', name: 'Squat', kind: 'weight', muscle: 'legs' },
  plank: { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
};

const set = (exerciseId: string, v: Partial<LoggedSet>): LoggedSet => ({
  exerciseId,
  round: 0,
  at: '2026-10-01T10:00:00Z',
  ...v,
});

// Local-time dates, so week/month edges don't depend on the machine's zone.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

const session = (id: string, when: Date, sets: LoggedSet[]): CompletedWorkoutSession => ({
  id,
  workout_name: `W ${id}`,
  started_at: when.toISOString(),
  finished_at: when.toISOString(),
  duration_sec: 1800,
  total_sets: sets.length,
  total_volume_kg: 0,
  prs: [],
  blocks: [
    {
      id: 'b',
      type: 'circuit',
      items: [],
      rounds: 1,
      restSec: 0,
      plannedRounds: 1,
      skipped: false,
      added: false,
      sets,
    },
  ],
});

// Saturday 17 Oct 2026. Its week began Monday 12 Oct.
const NOW = local(2026, 10, 17);

const SESSIONS = [
  session('s1', local(2026, 10, 16), [
    set('bench', { weightKg: 60, reps: 8 }),
    set('bench', { weightKg: 60, reps: 8 }),
    set('bench', { weightKg: 70, reps: 5 }),
    set('pushup', { reps: 20 }),
    set('plank', { seconds: 45 }),
  ]),
  session('s2', local(2026, 10, 5), [set('squat', { weightKg: 100, reps: 5 }), set('bench', { weightKg: 65, reps: 6 })]),
  session('s3', local(2026, 9, 20), [set('squat', { weightKg: 90, reps: 5 })]),
  session('s4', local(2025, 12, 10), [set('ghost', { reps: 99 }), set('squat', { weightKg: 80, reps: 10 })]),
];

const rows = flattenSets(SESSIONS, EX);

describe('flattenSets', () => {
  it('keeps every set of a known exercise, with its body part', () => {
    expect(rows).toHaveLength(9);
    expect(rows.find((r) => r.exerciseId === 'pushup')).toMatchObject({ muscle: 'chest', weightKg: 0, reps: 20 });
  });

  it('counts a hold as time, never as reps', () => {
    expect(rows.find((r) => r.exerciseId === 'plank')).toMatchObject({ reps: 0, seconds: 45 });
  });
});

describe('rangeStart', () => {
  it('starts weeks on Monday, months on the 1st, years on Jan 1', () => {
    expect(rangeStart('week', NOW)).toEqual(new Date(2026, 9, 12));
    expect(rangeStart('month', NOW)).toEqual(new Date(2026, 9, 1));
    expect(rangeStart('year', NOW)).toEqual(new Date(2026, 0, 1));
    expect(rangeStart('all', NOW)).toBeNull();
  });
});

describe('totalsOf', () => {
  it('adds volume as weight × reps over every set, bodyweight and holds excluded', () => {
    const t = totalsOf(filterRows(rows, { from: rangeStart('week', NOW) }));
    expect(t).toEqual({
      volumeKg: 60 * 8 + 60 * 8 + 70 * 5,
      sets: 5,
      reps: 8 + 8 + 5 + 20,
      heaviestKg: 70,
      secondsHeld: 45,
      sessions: 1,
    });
  });

  it('is all zeros for nothing', () => {
    expect(totalsOf([])).toEqual({ volumeKg: 0, sets: 0, reps: 0, heaviestKg: 0, secondsHeld: 0, sessions: 0 });
  });
});

describe('filterRows', () => {
  it('narrows by span, exercise and body part', () => {
    expect(filterRows(rows, { from: rangeStart('month', NOW) })).toHaveLength(7);
    expect(filterRows(rows, { exerciseId: 'squat' })).toHaveLength(3);
    expect(filterRows(rows, { muscle: 'chest', from: rangeStart('month', NOW) })).toHaveLength(5);
  });
});

describe('breakdowns', () => {
  it('ranks exercises by volume, then sets', () => {
    const list = byExercise(filterRows(rows, { from: rangeStart('month', NOW) }));
    expect(list.map((e) => e.exerciseId)).toEqual(['bench', 'squat', 'pushup', 'plank']);
    expect(list[0]).toMatchObject({ sets: 4, volumeKg: 480 + 480 + 350 + 390, sessions: 2 });
  });

  it('adds every exercise into its body part, circuits included', () => {
    const list = byMuscle(filterRows(rows, { from: rangeStart('month', NOW) }));
    expect(list.map((m) => m.muscle)).toEqual(['chest', 'legs', 'core']);
    expect(list[0]).toMatchObject({ sets: 5, reps: 8 + 8 + 5 + 20 + 6 });
  });
});

describe('volumeBars', () => {
  it('shows the last 8 weeks for Week, marking this one', () => {
    const bars = volumeBars(rows, 'week', NOW);
    expect(bars).toHaveLength(8);
    expect(bars[7]).toMatchObject({ label: 'Oct 12', current: true, volumeKg: 1310 });
    expect(bars.filter((b) => b.current)).toHaveLength(1);
  });

  it('shows the weeks of this month for Month', () => {
    const bars = volumeBars(rows, 'month', NOW);
    expect(bars.map((b) => b.label)).toEqual(['Sep 28', 'Oct 5', 'Oct 12']);
    expect(bars[1].volumeKg).toBe(100 * 5 + 65 * 6);
  });

  it('shows months so far for Year', () => {
    const bars = volumeBars(rows, 'year', NOW);
    expect(bars).toHaveLength(10);
    expect(bars[8]).toMatchObject({ label: 'Sep', volumeKg: 450 });
    expect(bars[0].volumeKg).toBe(0);
  });

  it('starts All at the first month with a set and marks the year turn', () => {
    const bars = volumeBars(rows, 'all', NOW);
    expect(bars[0]).toMatchObject({ label: 'Dec', volumeKg: 800 });
    expect(bars[1].label).toBe('Jan ’26');
    expect(bars).toHaveLength(11);
  });

  it('caps All at 24 months', () => {
    const old = flattenSets([session('x', local(2020, 1, 5), [set('squat', { weightKg: 50, reps: 5 })])], EX);
    expect(volumeBars(old, 'all', NOW)).toHaveLength(24);
  });
});

describe('recentSessionsFor', () => {
  it('lists that exercise’s sets per session, newest first', () => {
    const lines = recentSessionsFor(SESSIONS, 'bench');
    expect(lines.map((l) => l.sessionId)).toEqual(['s1', 's2']);
    expect(lines[0].sets).toHaveLength(3);
    expect(recentSessionsFor(SESSIONS, 'squat', 2).map((l) => l.sessionId)).toEqual(['s2', 's3']);
  });
});

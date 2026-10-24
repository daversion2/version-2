import {
  bestSetTrend,
  byExercise,
  describeTrend,
  formatTrendPoint,
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

describe('bestSetTrend', () => {
  it('takes the top weight per session, oldest first, with the most reps done at it', () => {
    const pts = bestSetTrend(SESSIONS, 'bench', 'weight');
    expect(pts.map((p) => p.sessionId)).toEqual(['s2', 's1']);
    expect(pts[1]).toMatchObject({ value: 70, reps: 5 });
  });

  it('keeps only the latest sessions', () => {
    expect(bestSetTrend(SESSIONS, 'squat', 'weight', 2).map((p) => p.sessionId)).toEqual(['s3', 's2']);
  });

  it('uses most reps, longest hold, and fastest time by kind', () => {
    const s = [
      session('a', local(2026, 10, 1), [set('x', { reps: 10 }), set('x', { reps: 12 })]),
      session('b', local(2026, 10, 2), [set('x', { seconds: 40 }), set('x', { seconds: 30 })]),
    ];
    expect(bestSetTrend(s, 'x', 'reps').map((p) => p.value)).toEqual([12]);
    expect(bestSetTrend(s, 'x', 'time').map((p) => p.value)).toEqual([40]);
    expect(bestSetTrend(s, 'x', 'distance').map((p) => p.value)).toEqual([30]);
  });

  it('skips a session with nothing usable logged', () => {
    const s = [session('a', local(2026, 10, 1), [set('bench', { reps: 8 })])];
    expect(bestSetTrend(s, 'bench', 'weight')).toEqual([]);
  });
});

describe('describeTrend', () => {
  const pt = (value: number, reps?: number) => ({ sessionId: String(value), finishedAt: '', value, reps });

  it('needs two sessions', () => {
    expect(describeTrend([pt(60)], 'weight', 'kg')).toBeNull();
  });

  it('says up or down in the user’s unit', () => {
    expect(describeTrend([pt(60), pt(65), pt(70)], 'weight', 'kg')).toBe('Up 10 kg over 3 sessions');
    expect(describeTrend([pt(20), pt(18)], 'reps', 'kg')).toBe('Down 2 reps over 2 sessions');
  });

  it('reads lower as better for a distance time', () => {
    expect(describeTrend([pt(540), pt(502)], 'distance', 'kg')).toBe('38s faster over 2 sessions');
    expect(describeTrend([pt(45), pt(90)], 'time', 'kg')).toBe('45s longer over 2 sessions');
  });

  it('calls float noise the same', () => {
    expect(describeTrend([pt(61.235), pt(61.24)], 'weight', 'lb')).toBe('Same as 1 session ago');
  });
});

describe('formatTrendPoint', () => {
  it('formats by kind', () => {
    const p = { sessionId: 'a', finishedAt: '', value: 100, reps: 5 };
    expect(formatTrendPoint(p, 'weight', 'kg')).toBe('100 kg × 5');
    expect(formatTrendPoint({ ...p, value: 1 }, 'reps', 'kg')).toBe('1 rep');
    expect(formatTrendPoint({ ...p, value: 90 }, 'time', 'kg')).toBe('1:30');
  });
});

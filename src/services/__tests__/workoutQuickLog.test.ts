import { lastTimeFor, quickLogSession, usualExercises } from '../workoutQuickLog';
import type { CompletedWorkoutSession, Exercise, LoggedSet } from '../../types/workouts';

const ex = (id: string, kind: Exercise['kind'], extra: Partial<Exercise> = {}): Exercise =>
  ({ id, name: id[0].toUpperCase() + id.slice(1), kind, muscle: 'full_body', ...extra }) as Exercise;

const EXERCISES: Record<string, Exercise> = {
  run: ex('run', 'cardio'),
  pushups: ex('pushups', 'reps'),
  bench: ex('bench', 'weight'),
  mile: ex('mile', 'distance', { distanceM: 1609 }),
  gone: ex('gone', 'reps', { archived_at: '2026-10-01T00:00:00.000Z' }),
};

const set = (exerciseId: string, at: string, values: Partial<LoggedSet> = {}): LoggedSet =>
  ({ exerciseId, round: 0, at, ...values }) as LoggedSet;

const session = (id: string, sets: LoggedSet[]): CompletedWorkoutSession =>
  ({
    id,
    workout_name: id,
    started_at: sets[0]?.at ?? '',
    finished_at: sets[0]?.at ?? '',
    duration_sec: 0,
    total_sets: sets.length,
    total_volume_kg: 0,
    blocks: [{ id: `b_${id}`, type: 'single', items: [], rounds: sets.length, restSec: 0, plannedRounds: 0, sets, skipped: false, added: true }],
    prs: [],
  }) as unknown as CompletedWorkoutSession;

const NOW = new Date('2026-11-11T18:00:00');

describe('usualExercises', () => {
  const sessions = [
    session('a', [set('run', '2026-11-10T07:00:00'), set('pushups', '2026-11-10T07:30:00')]),
    session('b', [set('run', '2026-11-08T07:00:00'), set('bench', '2026-11-08T08:00:00')]),
    session('c', [set('run', '2026-11-05T07:00:00'), set('pushups', '2026-11-05T07:10:00')]),
    session('old', [set('bench', '2026-09-01T08:00:00'), set('bench', '2026-09-02T08:00:00')]),
    session('d', [set('mile', '2026-11-09T07:00:00'), set('gone', '2026-11-09T07:00:00')]),
  ];

  it('ranks by days done in the last 30, then by most recent', () => {
    expect(usualExercises(sessions, EXERCISES, NOW).map((e) => e.id)).toEqual(['run', 'pushups', 'bench']);
  });

  it('leaves out timed distances, archived exercises and anything older than 30 days', () => {
    const ids = usualExercises(sessions, EXERCISES, NOW, 10).map((e) => e.id);
    expect(ids).not.toContain('mile');
    expect(ids).not.toContain('gone');
  });

  it('stops at the limit', () => {
    expect(usualExercises(sessions, EXERCISES, NOW, 1).map((e) => e.id)).toEqual(['run']);
  });
});

describe('lastTimeFor', () => {
  it('repeats the last set’s numbers, as many sets as that session had', () => {
    const sessions = [
      session('new', [
        set('pushups', '2026-11-10T07:00:00', { reps: 20 }),
        set('pushups', '2026-11-10T07:02:00', { reps: 20 }),
        set('pushups', '2026-11-10T07:04:00', { reps: 15 }),
      ]),
      session('older', [set('pushups', '2026-11-01T07:00:00', { reps: 30 })]),
    ];
    expect(lastTimeFor(sessions, EXERCISES.pushups)).toEqual({ values: { reps: 15 }, count: 3, at: '2026-11-10T07:04:00' });
  });

  it('carries a run’s minutes, distance and zone', () => {
    const sessions = [session('r', [set('run', '2026-11-10T07:00:00', { seconds: 1200, distanceM: 3380, zone: 2 })])];
    expect(lastTimeFor(sessions, EXERCISES.run)).toMatchObject({ values: { seconds: 1200, distanceM: 3380, zone: 2 }, count: 1 });
  });

  it('is null for something never done', () => {
    expect(lastTimeFor([], EXERCISES.run)).toBeNull();
  });
});

describe('quickLogSession', () => {
  it('saves a run as its own session, already handed to Today, its minutes as the length', () => {
    const { session: s, record } = quickLogSession({
      id: 'quick_1',
      exercise: EXERCISES.run,
      values: { seconds: 1200, zone: 2 },
      count: 1,
      records: {},
      exercisesById: EXERCISES,
      now: NOW,
    });
    expect(s).toMatchObject({
      id: 'quick_1',
      workout_name: 'Run',
      logged_sets: true,
      quick_log: true,
      duration_sec: 1200,
      total_sets: 1,
      checkin_asked_at: NOW.toISOString(),
      checkin_sent_at: NOW.toISOString(),
      finished_at: NOW.toISOString(),
    });
    expect(new Date(s.started_at).getTime()).toBe(NOW.getTime() - 1200 * 1000);
    expect(s.blocks[0].sets[0]).toMatchObject({ exerciseId: 'run', seconds: 1200, zone: 2 });
    expect(record.exerciseId).toBe('run');
  });

  it('logs a lift as count sets and leaves the length to Today', () => {
    const { session: s } = quickLogSession({
      id: 'quick_2',
      exercise: EXERCISES.pushups,
      values: { reps: 20 },
      count: 3,
      records: {},
      exercisesById: EXERCISES,
      now: NOW,
    });
    expect(s.total_sets).toBe(3);
    expect(s.duration_sec).toBe(0);
  });
});

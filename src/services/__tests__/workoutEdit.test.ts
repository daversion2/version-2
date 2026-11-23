import {
  applySessionEdit,
  canEditLength,
  lastDoneAt,
  recordSources,
  withAddedRound,
  withEditedSet,
  withoutLastRound,
  withRemovedSet,
  withSessionMinutes,
} from '../workoutEdit';
import { rebuildRecords } from '../workoutMath';
import { CompletedWorkoutSession, Exercise, LoggedSet, SessionBlock } from '../../types/workouts';

const ex = (id: string, kind: Exercise['kind']): Exercise =>
  ({ id, name: id, kind, muscle: kind === 'cardio' ? 'cardio' : 'chest' }) as unknown as Exercise;

const exercisesById: Record<string, Exercise> = {
  bench: ex('bench', 'weight'),
  squat: ex('squat', 'weight'),
  run: ex('run', 'cardio'),
};

const set = (exerciseId: string, round: number, values: Partial<LoggedSet>): LoggedSet => ({
  exerciseId,
  round,
  at: '2026-11-01T10:00:00.000Z',
  ...values,
});

const block = (id: string, itemIds: string[], sets: LoggedSet[]): SessionBlock =>
  ({
    id,
    name: '',
    items: itemIds.map((exerciseId) => ({ exerciseId, target: {} })),
    rounds: Math.max(1, Math.floor(sets.length / itemIds.length)),
    restSec: 60,
    plannedRounds: 1,
    sets,
    skipped: false,
    added: false,
  }) as unknown as SessionBlock;

const session = (
  id: string,
  day: number,
  blocks: SessionBlock[],
  over: Partial<CompletedWorkoutSession> = {}
): CompletedWorkoutSession => ({
  id,
  workout_id: 'w1',
  workout_name: id,
  started_at: `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  finished_at: `2026-11-${String(day).padStart(2, '0')}T11:00:00.000Z`,
  duration_sec: 3600,
  total_sets: blocks.reduce((n, b) => n + b.sets.length, 0),
  total_volume_kg: 0,
  blocks,
  prs: [],
  ...over,
});

const lift = (id: string, day: number, kg: number, exerciseId = 'bench') =>
  session(id, day, [block(`b-${id}`, [exerciseId], [set(exerciseId, 0, { weightKg: kg, reps: 5 })])]);

/** Sessions with the badges they'd have earned as saved. */
const withBadges = (list: CompletedWorkoutSession[]) => {
  const { prsBySession } = rebuildRecords(list, exercisesById);
  return list.map((s) => ({ ...s, prs: prsBySession[s.id] ?? [] }));
};

const badgeTypes = (s?: CompletedWorkoutSession) => s?.prs.map((p) => p.type).sort() ?? [];

describe('applySessionEdit', () => {
  it('gives a later session its record back when a false one is corrected', () => {
    const sessions = withBadges([lift('a', 1, 100), lift('b', 2, 1000), lift('c', 3, 120)]);
    expect(badgeTypes(sessions.find((s) => s.id === 'c'))).toEqual([]);

    const b = sessions.find((s) => s.id === 'b')!;
    const next = withEditedSet(b, { blockIndex: 0, setIndex: 0 }, { weightKg: 110, reps: 5 }, exercisesById);
    const out = applySessionEdit({ sessions, sessionId: 'b', next, exercisesById });

    expect(out.records.bench.heaviestKg).toBe(120);
    expect(badgeTypes(out.sessions.find((s) => s.id === 'c'))).toContain('heaviest');
    expect(out.changed.map((s) => s.id).sort()).toEqual(['b', 'c']);
  });

  it('leaves sessions the edit does not affect exactly as saved', () => {
    const other = { ...lift('x', 2, 50, 'squat'), prs: [{ exerciseId: 'squat', type: 'heaviest' as const, value: 50, previous: 40 }] };
    const sessions = [lift('a', 1, 100), other];
    const next = withEditedSet(sessions[0], { blockIndex: 0, setIndex: 0 }, { weightKg: 90, reps: 5 }, exercisesById);
    const out = applySessionEdit({ sessions, sessionId: 'a', next, exercisesById });
    expect(out.sessions.find((s) => s.id === 'x')).toBe(other);
    expect(out.changed.map((s) => s.id)).toEqual(['a']);
  });

  it('takes a deleted session out of records and hands its badge on', () => {
    const sessions = withBadges([lift('a', 1, 100), lift('b', 2, 200), lift('c', 3, 150)]);
    const out = applySessionEdit({ sessions, sessionId: 'b', next: null, exercisesById });
    expect(out.sessions.map((s) => s.id)).not.toContain('b');
    expect(out.records.bench.heaviestKg).toBe(150);
    expect(out.changed.map((s) => s.id)).toEqual(['c']);
    expect(badgeTypes(out.changed[0])).toContain('heaviest');
  });

  it('clears the record of an exercise with no sets left', () => {
    const sessions = [lift('a', 1, 100)];
    const out = applySessionEdit({ sessions, sessionId: 'a', next: null, exercisesById });
    expect(out.records.bench).toEqual({ exerciseId: 'bench' });
  });
});

describe('session length and cardio', () => {
  const cardio = (seconds: number, duration = seconds) =>
    session('r', 1, [block('b', ['run'], [set('run', 0, { seconds, zone: 1 })])], { duration_sec: duration });

  it('moves a single cardio set with the length: 20 to 30 minutes', () => {
    const next = withSessionMinutes(cardio(1200), 30, exercisesById);
    expect(next.duration_sec).toBe(1800);
    expect(next.blocks[0].sets[0].seconds).toBe(1800);
  });

  it('moves the length with a cardio set', () => {
    const next = withEditedSet(cardio(1200), { blockIndex: 0, setIndex: 0 }, { seconds: 1800, zone: 1 }, exercisesById);
    expect(next.duration_sec).toBe(1800);
  });

  it('keeps warm-up time around the cardio when the set changes', () => {
    const next = withEditedSet(cardio(1200, 1500), { blockIndex: 0, setIndex: 0 }, { seconds: 1800, zone: 1 }, exercisesById);
    expect(next.duration_sec).toBe(2100);
  });

  it('changes only the length of a strength session', () => {
    const s = lift('a', 1, 100);
    const next = withSessionMinutes(s, 45, exercisesById);
    expect(next.duration_sec).toBe(2700);
    expect(next.blocks).toBe(s.blocks);
  });

  it('returns the same session when the minutes have not changed', () => {
    const s = lift('a', 1, 100);
    expect(withSessionMinutes(s, 60, exercisesById)).toBe(s);
  });

  it('edits a quick-logged run, whose minutes are its length', () => {
    const quick = { ...cardio(1200), logged_sets: true as const, quick_log: true as const };
    expect(canEditLength(quick)).toBe(true);
    const longer = withSessionMinutes(quick, 30, exercisesById);
    expect(longer.duration_sec).toBe(1800);
    expect(longer.blocks[0].sets[0].seconds).toBe(1800);
    const bySet = withEditedSet(quick, { blockIndex: 0, setIndex: 0 }, { seconds: 1800, zone: 1 }, exercisesById);
    expect(bySet.duration_sec).toBe(1800);
  });

  it('has no length to edit on a quick log with no clock', () => {
    const quick = { ...lift('a', 1, 100), logged_sets: true as const, quick_log: true as const, duration_sec: 0 };
    expect(canEditLength(quick)).toBe(false);
  });

  it('has no length to edit on a day of logged sets', () => {
    const logged = { ...lift('a', 1, 100), logged_sets: true as const };
    expect(canEditLength(logged)).toBe(false);
    expect(withSessionMinutes(logged, 30, exercisesById)).toBe(logged);
  });
});

describe('adding and removing', () => {
  it('adds a set repeating the last one, and updates the totals', () => {
    const next = withAddedRound(lift('a', 1, 100), 0, exercisesById);
    expect(next.total_sets).toBe(2);
    expect(next.total_volume_kg).toBe(1000);
    expect(next.blocks[0].sets[1]).toMatchObject({ round: 1, weightKg: 100, reps: 5 });
  });

  it('adds a whole round to a circuit, in position', () => {
    const s = session('c', 1, [
      block('b', ['bench', 'squat'], [set('bench', 0, { weightKg: 50, reps: 5 }), set('squat', 0, { weightKg: 60, reps: 5 })]),
    ]);
    const next = withAddedRound(s, 0, exercisesById);
    expect(next.blocks[0].sets.map((x) => x.exerciseId)).toEqual(['bench', 'squat', 'bench', 'squat']);
    expect(next.blocks[0].sets[3].round).toBe(1);
  });

  it('removes a circuit’s last round only', () => {
    const s = session('c', 1, [
      block('b', ['bench', 'squat'], [
        set('bench', 0, { weightKg: 50, reps: 5 }),
        set('squat', 0, { weightKg: 60, reps: 5 }),
        set('bench', 1, { weightKg: 55, reps: 5 }),
        set('squat', 1, { weightKg: 65, reps: 5 }),
      ]),
    ]);
    const next = withoutLastRound(s, 0, exercisesById)!;
    expect(next.blocks[0].sets.map((x) => x.weightKg)).toEqual([50, 60]);
  });

  it('treats removing the only set as deleting the session', () => {
    expect(withRemovedSet(lift('a', 1, 100), { blockIndex: 0, setIndex: 0 }, exercisesById)).toBeNull();
  });

  it('removes one set from a session that has others', () => {
    const s = session('a', 1, [
      block('b', ['bench'], [set('bench', 0, { weightKg: 100, reps: 5 }), set('bench', 1, { weightKg: 110, reps: 5 })]),
    ]);
    const next = withRemovedSet(s, { blockIndex: 0, setIndex: 0 }, exercisesById)!;
    expect(next.total_sets).toBe(1);
    expect(next.blocks[0].sets[0]).toMatchObject({ round: 0, weightKg: 110 });
  });
});

describe('recordSources', () => {
  it('names the first session to reach each number', () => {
    const sessions = [lift('late', 5, 100), lift('early', 2, 100)];
    const sources = recordSources({ exerciseId: 'bench', heaviestKg: 100 }, sessions, 'kg');
    expect(sources).toHaveLength(1);
    expect(sources[0].sessionId).toBe('early');
    expect(sources[0].line).toContain('Heaviest');
  });

  it('still lists a record no session holds', () => {
    const sources = recordSources({ exerciseId: 'bench', heaviestKg: 999 }, [lift('a', 1, 100)], 'kg');
    expect(sources[0].sessionId).toBeUndefined();
  });
});

describe('lastDoneAt', () => {
  it('is the newest session left for that workout', () => {
    expect(lastDoneAt([lift('a', 1, 100), lift('b', 3, 100)], 'w1')).toBe('2026-11-03T11:00:00.000Z');
  });

  it('is undefined with none left', () => {
    expect(lastDoneAt([], 'w1')).toBeUndefined();
  });
});

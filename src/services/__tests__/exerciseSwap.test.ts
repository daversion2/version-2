import type { CompletedWorkoutSession, Exercise, SessionBlock, Workout, WorkoutSession } from '../../types/workouts';
import {
  insteadOfLine,
  markSwapKept,
  permanentSwapOffer,
  sessionSwaps,
  swappedForLine,
  swapsAwayFrom,
  swapSuggestions,
  swapTag,
  withSwapMadePermanent,
} from '../exerciseSwap';
import { applySessionToWorkout, canSwapItem, swapItem, swapTarget } from '../workoutSession';

const ex = (id: string, over: Partial<Exercise> = {}): Exercise => ({
  id,
  name: id,
  kind: 'weight',
  muscle: 'legs',
  equipment: 'barbell',
  ...over,
});

const SQUAT = ex('squat');
const LUNGE = ex('bw_lunge', { kind: 'reps', equipment: 'bodyweight' });

const block = (over: Partial<SessionBlock> = {}): SessionBlock => ({
  id: 'b1',
  type: 'single',
  items: [{ exerciseId: 'squat', target: { reps: 8, weightKg: 60 } }],
  rounds: 3,
  restSec: 90,
  plannedRounds: 3,
  sets: [],
  skipped: false,
  added: false,
  ...over,
});

const session = (blocks: SessionBlock[]): WorkoutSession =>
  ({
    id: 's1',
    workoutId: 'w1',
    workoutName: 'Leg Day',
    startedAt: '2026-11-20T10:00:00.000Z',
    blocks,
    history: [],
    cursor: 0,
    phase: 'active',
  }) as unknown as WorkoutSession;

const completed = (id: string, finished: string, blocks: SessionBlock[], workoutId = 'w1'): CompletedWorkoutSession => ({
  id,
  workout_id: workoutId,
  workout_name: 'Leg Day',
  started_at: finished,
  finished_at: finished,
  duration_sec: 1800,
  total_sets: 3,
  total_volume_kg: 0,
  blocks,
  prs: [],
});

describe('swapTarget', () => {
  it('carries reps or seconds over, never weight', () => {
    expect(swapTarget('reps', { reps: 8, weightKg: 60 })).toEqual({ reps: 8 });
    expect(swapTarget('weight', { reps: 8, weightKg: 60 })).toEqual({ reps: 8 });
    expect(swapTarget('time', { reps: 8 })).toEqual({});
    expect(swapTarget('time', { seconds: 45 })).toEqual({ seconds: 45 });
  });
});

describe('swapItem', () => {
  it('swaps the item for today and remembers what was planned, with the reason', () => {
    const next = swapItem(session([block()]), 0, 0, { exercise: LUNGE, reason: 'sore' });
    expect(next.blocks[0].items[0]).toEqual({
      exerciseId: 'bw_lunge',
      target: { reps: 8 },
      swappedFrom: { exerciseId: 'squat', target: { reps: 8, weightKg: 60 }, reason: 'sore' },
    });
  });

  it('swapping back to the planned exercise undoes the swap', () => {
    const swapped = swapItem(session([block()]), 0, 0, { exercise: LUNGE });
    const back = swapItem(swapped, 0, 0, { exercise: SQUAT });
    expect(back.blocks[0].items[0]).toEqual({ exerciseId: 'squat', target: { reps: 8, weightKg: 60 } });
  });

  it('a second swap still remembers the first plan', () => {
    const twice = swapItem(swapItem(session([block()]), 0, 0, { exercise: LUNGE }), 0, 0, { exercise: ex('goblet') });
    expect(twice.blocks[0].items[0].swappedFrom?.exerciseId).toBe('squat');
  });

  it("Done it re-prescribes the item's filled-in sets for the new exercise", () => {
    const filled = block({
      sets: [0, 1, 2].map((round) => ({ exerciseId: 'squat', round, at: '', reps: 8, weightKg: 60 })),
    });
    const next = swapItem(session([filled]), 0, 0, { exercise: LUNGE, values: { reps: 10 } });
    expect(next.blocks[0].sets).toEqual([0, 1, 2].map((round) => ({ exerciseId: 'bw_lunge', round, at: '', reps: 10 })));
  });

  it('only lets a live session swap before a set of it is logged', () => {
    const logged = block({ sets: [{ exerciseId: 'squat', round: 0, at: 'x', reps: 8 }] });
    expect(canSwapItem(session([block()]), 0, 0)).toBe(true);
    expect(canSwapItem(session([logged]), 0, 0)).toBe(false);
    expect(canSwapItem(session([logged]), 0, 0, true)).toBe(true);
  });
});

describe('saving back to the workout', () => {
  it('puts the original exercise back: a swap is for today only', () => {
    const workout: Workout = {
      id: 'w1',
      name: 'Leg Day',
      blocks: [{ id: 'b1', type: 'single', items: [{ exerciseId: 'squat', target: { reps: 8, weightKg: 60 } }], rounds: 3, restSec: 90 }],
      created_at: '',
      updated_at: '',
    };
    const swapped = swapItem(session([block()]), 0, 0, { exercise: LUNGE });
    const saved = applySessionToWorkout(workout, swapped, new Date('2026-11-20T11:00:00Z'));
    expect(saved.blocks[0].items).toEqual([{ exerciseId: 'squat', target: { reps: 8, weightKg: 60 } }]);
  });
});

describe('swapSuggestions', () => {
  const all = [
    SQUAT,
    LUNGE,
    ex('goblet', { equipment: 'dumbbell' }),
    ex('legpress', { equipment: 'machine' }),
    ex('pushup', { kind: 'reps', muscle: 'chest', equipment: 'bodyweight' }),
    ex('run', { kind: 'cardio', muscle: 'cardio' }),
    ex('old', { archived_at: 'x' }),
  ];

  it('offers the same body part, bodyweight and recent first, never the original', () => {
    const recent = completed('r', '2026-11-18', [block({ items: [{ exerciseId: 'legpress', target: {} }], sets: [{ exerciseId: 'legpress', round: 0, at: '', reps: 10 }] })]);
    expect(swapSuggestions(SQUAT, all, [recent]).map((e) => e.id)).toEqual(['bw_lunge', 'legpress', 'goblet']);
  });

  it('keeps cardio with cardio', () => {
    expect(swapSuggestions(ex('bike', { kind: 'cardio', muscle: 'cardio' }), all, []).map((e) => e.id)).toEqual(['run']);
  });
});

describe('reading swaps afterwards', () => {
  const swappedBlock = block({
    items: [{ exerciseId: 'bw_lunge', target: { reps: 8 }, swappedFrom: { exerciseId: 'squat', target: { reps: 8 }, reason: 'sore' } }],
  });

  it('lists a session’s swaps and tags it', () => {
    expect(sessionSwaps({ blocks: [swappedBlock] })).toEqual([
      { blockId: 'b1', itemIndex: 0, fromId: 'squat', toId: 'bw_lunge', reason: 'sore' },
    ]);
    expect(swapTag({ blocks: [swappedBlock] })).toBe('1 swap');
    expect(swapTag({ blocks: [block()] })).toBeNull();
  });

  it('says it both ways round', () => {
    expect(swappedForLine('Bodyweight Lunge', 'sore')).toBe('Swapped for Bodyweight Lunge · Sore or hurt');
    expect(insteadOfLine('Back Squat')).toBe('Instead of Back Squat');
  });

  it("finds the days an exercise was swapped away, newest first", () => {
    const sessions = [completed('a', '2026-11-10', [swappedBlock]), completed('b', '2026-11-17', [swappedBlock])];
    expect(swapsAwayFrom(sessions, 'squat').map((s) => s.sessionId)).toEqual(['b', 'a']);
    expect(swapsAwayFrom(sessions, 'bw_lunge')).toEqual([]);
  });
});

describe('making a swap permanent', () => {
  const swappedBlock = block({
    items: [{ exerciseId: 'bw_lunge', target: { reps: 8 }, swappedFrom: { exerciseId: 'squat', target: { reps: 8 } } }],
  });

  it('offers it after the same swap two sessions of that workout in a row', () => {
    const today = completed('today', '2026-11-20', [swappedBlock]);
    expect(permanentSwapOffer(today, [completed('last', '2026-11-17', [swappedBlock]), today])).toMatchObject({
      fromId: 'squat',
      toId: 'bw_lunge',
    });
  });

  it('not after one, or when last time was the real thing, or another workout', () => {
    const today = completed('today', '2026-11-20', [swappedBlock]);
    expect(permanentSwapOffer(today, [today])).toBeNull();
    expect(permanentSwapOffer(today, [completed('last', '2026-11-17', [block()])])).toBeNull();
    expect(permanentSwapOffer(today, [completed('other', '2026-11-17', [swappedBlock], 'w2')])).toBeNull();
  });

  it('a kept swap is not offered again, and saving the workout keeps it', () => {
    const today = completed('today', '2026-11-20', [swappedBlock]);
    const live = markSwapKept(session([swappedBlock]), 'b1', 0);
    expect(live.blocks[0].items[0].swappedFrom?.kept).toBe(true);
    expect(permanentSwapOffer({ ...today, blocks: live.blocks }, [completed('last', '2026-11-17', [swappedBlock])])).toBeNull();
    const workout: Workout = {
      id: 'w1',
      name: 'Leg Day',
      blocks: [{ id: 'b1', type: 'single', items: [{ exerciseId: 'bw_lunge', target: { reps: 8 } }], rounds: 3, restSec: 90 }],
      created_at: '',
      updated_at: '',
    };
    expect(applySessionToWorkout(workout, live, new Date()).blocks[0].items[0].exerciseId).toBe('bw_lunge');
  });

  it('replaces that slot in the workout', () => {
    const workout: Workout = {
      id: 'w1',
      name: 'Leg Day',
      blocks: [{ id: 'b1', type: 'single', items: [{ exerciseId: 'squat', target: { reps: 8, weightKg: 60 } }], rounds: 3, restSec: 90 }],
      created_at: '',
      updated_at: '',
    };
    const next = withSwapMadePermanent(workout, { blockId: 'b1', itemIndex: 0, fromId: 'squat', toId: 'bw_lunge' }, { reps: 8 }, new Date('2026-11-20T12:00:00Z'));
    expect(next.blocks[0].items).toEqual([{ exerciseId: 'bw_lunge', target: { reps: 8 } }]);
  });
});

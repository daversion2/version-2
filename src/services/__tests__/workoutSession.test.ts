import {
  addBlock,
  addRound,
  adjustRest,
  applySessionToWorkout,
  backToWorkout,
  currentPosition,
  describeBlock,
  durationSec,
  endRest,
  enterSummary,
  isSessionComplete,
  jumpTo,
  logSet,
  planChanges,
  repeatsInBlock,
  restRemainingSec,
  roundsDone,
  setsTodayFor,
  skipBlock,
  slotSets,
  startSession,
  toCompletedSession,
  undoLastSet,
  workoutFromSession,
} from '../workoutSession';
import { Exercise, Workout, WorkoutSession } from '../../types/workouts';

const T0 = new Date('2026-10-17T10:00:00.000Z');
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);

const EXERCISES: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  dip: { id: 'dip', name: 'Dips', kind: 'reps', muscle: 'chest' },
  pushup: { id: 'pushup', name: 'Push-up', kind: 'reps', muscle: 'chest' },
  plank: { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
  curl: { id: 'curl', name: 'Curl', kind: 'weight', muscle: 'arms' },
};

const WORKOUT: Workout = {
  id: 'w1',
  name: 'Push Day',
  created_at: T0.toISOString(),
  updated_at: T0.toISOString(),
  blocks: [
    { id: 'b1', type: 'single', items: [{ exerciseId: 'bench', target: { reps: 8 } }], rounds: 2, restSec: 90 },
    {
      id: 'b2',
      type: 'circuit',
      name: 'Finisher',
      items: [
        { exerciseId: 'dip', target: { reps: 12 } },
        { exerciseId: 'pushup', target: { reps: 15 } },
        { exerciseId: 'plank', target: { seconds: 45 } },
      ],
      rounds: 2,
      restSec: 60,
    },
  ],
};

const start = () => startSession({ id: 's1', workout: WORKOUT, habitId: 'h1', now: T0 });

/** Log the current item with plausible values, returning just the session. */
const log = (s: WorkoutSession, sec = 0) => logSet(s, { reps: 8, weightKg: 60 }, at(sec)).session;

describe('startSession', () => {
  it('copies the plan with nothing logged', () => {
    const s = start();
    expect(s.workoutId).toBe('w1');
    expect(s.workoutName).toBe('Push Day');
    expect(s.habitId).toBe('h1');
    expect(s.blocks.map((b) => [b.plannedRounds, b.sets.length, b.added])).toEqual([
      [2, 0, false],
      [2, 0, false],
    ]);
  });

  it('starts empty for an unplanned workout, with no undefined fields', () => {
    const s = startSession({ id: 's', name: 'Empty workout', now: T0 });
    expect(s.blocks).toEqual([]);
    expect(Object.values(s).includes(undefined)).toBe(false);
    expect(currentPosition(s)).toBeNull();
    expect(isSessionComplete(s)).toBe(false);
  });
});

describe('logging a single exercise', () => {
  it('rests after each set and moves on after the last', () => {
    let s = start();
    const first = logSet(s, { reps: 8, weightKg: 60 }, at(0));
    expect(first.restSec).toBe(90);
    expect(first.session.rest?.endsAt).toBe(at(90).toISOString());
    expect(currentPosition(first.session)).toMatchObject({ blockIndex: 0, round: 1 });

    const second = logSet(first.session, { reps: 8, weightKg: 60 }, at(200));
    expect(second.blockComplete).toBe(true);
    // Rest still runs between an exercise and the next block.
    expect(second.restSec).toBe(90);
    expect(currentPosition(second.session)).toMatchObject({ blockIndex: 1, round: 0, itemIndex: 0 });
    s = second.session;
    expect(s.blocks[0].sets.map((x) => x.round)).toEqual([0, 1]);
  });

  it('stores only the values that were given', () => {
    const s = logSet(start(), { reps: 8 }, at(0)).session;
    expect(s.blocks[0].sets[0]).toEqual({ exerciseId: 'bench', round: 0, reps: 8, at: at(0).toISOString() });
  });
});

describe('logging a circuit', () => {
  const atCircuit = () => log(log(start()));

  it('goes straight between items and rests only after the round', () => {
    let s = atCircuit();
    const dip = logSet(s, { reps: 12 }, at(300));
    expect(dip.restSec).toBeNull();
    expect(dip.roundComplete).toBe(false);
    expect(currentPosition(dip.session)?.item.exerciseId).toBe('pushup');

    const pushup = logSet(dip.session, { reps: 15 }, at(330));
    expect(pushup.restSec).toBeNull();

    const plank = logSet(pushup.session, { seconds: 45 }, at(380));
    expect(plank.roundComplete).toBe(true);
    expect(plank.restSec).toBe(60);
    s = plank.session;
    expect(currentPosition(s)).toMatchObject({ blockIndex: 1, round: 1, itemIndex: 0 });
    expect(roundsDone(s.blocks[1])).toBe(1);
  });

  it('finishes with no rest after the very last round', () => {
    let s = atCircuit();
    for (let i = 0; i < 5; i++) s = log(s, 400 + i);
    const last = logSet(s, { seconds: 45 }, at(500));
    expect(last.workoutComplete).toBe(true);
    expect(last.restSec).toBeNull();
    expect(last.session.rest).toBeUndefined();
    expect(isSessionComplete(last.session)).toBe(true);
    expect(currentPosition(last.session)).toBeNull();
  });
});

describe('rest', () => {
  it('counts down from timestamps and can be adjusted or ended', () => {
    const s = logSet(start(), { reps: 8 }, at(0)).session;
    expect(restRemainingSec(s, at(30))).toBe(60);
    expect(restRemainingSec(adjustRest(s, 15, at(30)), at(30))).toBe(75);
    expect(restRemainingSec(s, at(120))).toBe(0);
    expect(adjustRest(s, -120, at(30)).rest).toBeUndefined();
    expect(endRest(s).rest).toBeUndefined();
  });
});

describe('undo', () => {
  it('takes back the last set and returns to it', () => {
    let s = log(log(start())); // bench done, on the circuit
    s = undoLastSet(s);
    expect(s.blocks[0].sets).toHaveLength(1);
    expect(currentPosition(s)).toMatchObject({ blockIndex: 0, round: 1 });
    expect(s.rest).toBeUndefined();
  });

  it('does nothing with nothing logged', () => {
    const s = start();
    expect(undoLastSet(s)).toBe(s);
  });
});

describe('changing the plan mid-session', () => {
  it('skips a block, keeping what was logged', () => {
    let s = log(start());
    s = skipBlock(s, 0);
    expect(s.blocks[0].sets).toHaveLength(1);
    expect(currentPosition(s)?.blockIndex).toBe(1);
  });

  it('jumps out of order and comes back to what was left', () => {
    let s = jumpTo(start(), 1);
    expect(currentPosition(s)?.blockIndex).toBe(1);
    for (let i = 0; i < 6; i++) s = log(s, i);
    // The circuit is done; the bench press that was jumped over is next.
    expect(currentPosition(s)?.blockIndex).toBe(0);
  });

  it('adds a set, including after a skip', () => {
    let s = log(log(start()));
    s = addRound(s, 0);
    expect(s.blocks[0].rounds).toBe(3);
    expect(currentPosition(s)).toMatchObject({ blockIndex: 0, round: 2 });

    let skipped = skipBlock(log(start()), 0);
    skipped = addRound(skipped, 0);
    expect(skipped.blocks[0].rounds).toBe(2);
  });

  it('inserts an added exercise right after the current block and shifts undo history', () => {
    let s = log(start()); // one bench set in, still on bench
    s = addBlock(s, [{ exerciseId: 'curl', target: { reps: 12 } }], { id: 'added' });
    expect(s.blocks.map((b) => b.id)).toEqual(['b1', 'added', 'b2']);
    expect(s.blocks[1]).toMatchObject({ type: 'single', added: true, plannedRounds: 0, rounds: 3 });
    expect(s.history).toEqual([0]);

    s = log(s); // finishes bench → the added curl is next
    expect(currentPosition(s)?.block.id).toBe('added');
  });

  it('adds several exercises as a circuit', () => {
    const s = addBlock(start(), [
      { exerciseId: 'dip', target: {} },
      { exerciseId: 'pushup', target: {} },
    ], { id: 'c', rounds: 4 });
    expect(s.blocks[1]).toMatchObject({ type: 'circuit', rounds: 4 });
  });

  it('makes the first added block current in an empty workout', () => {
    let s = startSession({ id: 's', name: 'Empty workout', now: T0 });
    s = addBlock(s, [{ exerciseId: 'bench', target: {} }], { id: 'a' });
    expect(currentPosition(s)?.block.id).toBe('a');
  });
});

describe('saving changes back', () => {
  it('finds added exercises and extra sets, but not skips', () => {
    let s = log(log(start()));
    expect(planChanges(s).any).toBe(false);
    s = skipBlock(s, 1);
    expect(planChanges(s).any).toBe(false);
    s = log(addRound(s, 0));
    s = addBlock(s, [{ exerciseId: 'curl', target: {} }], { id: 'added' });
    expect(planChanges(s)).toEqual({ addedBlocks: 0, extraRounds: 1, any: true });
    s = logSet(s, { reps: 12, weightKg: 15 }, at(900)).session;
    expect(planChanges(s)).toEqual({ addedBlocks: 1, extraRounds: 1, any: true });
  });

  it('adds an exercise after the block you are on, not the one you finished', () => {
    const s = addBlock(log(log(start())), [{ exerciseId: 'curl', target: {} }], { id: 'added' });
    // Bench is done, so the circuit is current — the curl comes after it.
    expect(s.blocks.map((b) => b.id)).toEqual(['b1', 'b2', 'added']);
  });

  it('writes extra sets and done additions into the workout, keeping skipped blocks', () => {
    let s = log(log(start()));
    s = log(addRound(s, 0)); // bench: 3 sets, the plan said 2
    s = skipBlock(s, 1); // circuit skipped today — a one-off, it stays in the plan
    s = addBlock(s, [{ exerciseId: 'curl', target: {} }], { id: 'added' });
    s = logSet(s, { reps: 12, weightKg: 15 }, at(900)).session;
    s = addBlock(s, [{ exerciseId: 'dip', target: {} }], { id: 'never-done' });

    const updated = applySessionToWorkout(WORKOUT, s, at(1000));
    expect(updated.blocks.map((b) => [b.id, b.rounds])).toEqual([
      ['b1', 3],
      ['b2', 2],
      ['added', 1],
    ]);
    expect(updated.blocks[2].items[0].target).toEqual({ reps: 12, weightKg: 15 });
    expect(updated.updated_at).toBe(at(1000).toISOString());
  });

  it('turns an empty session into a workout from what was done', () => {
    let s = startSession({ id: 's', name: 'Empty workout', now: T0 });
    s = addBlock(s, [{ exerciseId: 'bench', target: {} }], { id: 'a', rounds: 5 });
    s = logSet(s, { reps: 5, weightKg: 100 }, at(10)).session;
    s = logSet(s, { reps: 5, weightKg: 100 }, at(200)).session;
    const w = workoutFromSession(s, { id: 'new', name: '  Heavy day ', now: at(300) });
    expect(w.name).toBe('Heavy day');
    expect(w.blocks).toHaveLength(1);
    expect(w.blocks[0]).toMatchObject({ rounds: 2, items: [{ exerciseId: 'bench', target: { reps: 5, weightKg: 100 } }] });
  });
});

describe('an exercise twice in one circuit', () => {
  // Pull-ups 1st and 3rd with different reps — two slots, not one.
  const twice = (): WorkoutSession => {
    const s = startSession({ id: 's', name: 'Empty workout', now: T0 });
    return addBlock(
      s,
      [
        { exerciseId: 'pullup', target: { reps: 10 } },
        { exerciseId: 'pushup', target: { reps: 20 } },
        { exerciseId: 'pullup', target: { reps: 5 } },
      ],
      { id: 'c', rounds: 2 }
    );
  };

  it('knows which items repeat', () => {
    const block = twice().blocks[0];
    expect([0, 1, 2].map((i) => repeatsInBlock(block, i))).toEqual([true, false, true]);
  });

  it('walks every slot in order, the repeat included', () => {
    let s = twice();
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(`${currentPosition(s)!.itemIndex}:${currentPosition(s)!.item.target.reps}`);
      s = logSet(s, { reps: 1 }, at(i)).session;
    }
    expect(seen).toEqual(['0:10', '1:20', '2:5', '0:10', '1:20', '2:5']);
    expect(isSessionComplete(s)).toBe(true);
  });

  it('keeps each slot\'s sets apart', () => {
    let s = twice();
    [10, 20, 5, 9, 18, 4].forEach((reps, i) => (s = logSet(s, { reps }, at(i)).session));
    const block = s.blocks[0];
    expect(slotSets(block, 0).map((x) => x.reps)).toEqual([10, 9]);
    expect(slotSets(block, 2).map((x) => x.reps)).toEqual([5, 4]);
  });

  it('saves each slot with its own numbers', () => {
    let s = twice();
    [10, 20, 5].forEach((reps, i) => (s = logSet(s, { reps }, at(i)).session));
    const w = workoutFromSession(s, { id: 'new', name: 'Pull circuit', now: at(100) });
    expect(w.blocks[0].items).toEqual([
      { exerciseId: 'pullup', target: { reps: 10 } },
      { exerciseId: 'pushup', target: { reps: 20 } },
      { exerciseId: 'pullup', target: { reps: 5 } },
    ]);
  });
});

describe('the summary', () => {
  it('stops the clock at Finish, however long the summary sits', () => {
    let s = logSet(start(), { reps: 8 }, at(0)).session;
    s = enterSummary(s, at(1800));
    expect(s.phase).toBe('summary');
    expect(s.rest).toBeUndefined();
    expect(durationSec(s, at(99999))).toBe(1800);
    expect(toCompletedSession(s, { now: at(99999), prs: [], exercisesById: EXERCISES }).duration_sec).toBe(1800);
  });

  it('runs the clock again on the way back to the workout', () => {
    const s = backToWorkout(enterSummary(start(), at(600)));
    expect(s.phase).toBe('active');
    expect(s.endedAt).toBeUndefined();
    expect(durationSec(s, at(900))).toBe(900);
  });
});

describe('describeBlock', () => {
  it('describes a single exercise and a circuit', () => {
    expect(describeBlock(WORKOUT.blocks[0], EXERCISES, 'lb')).toBe('2 sets · 8 reps · rest 1:30');
    expect(describeBlock(WORKOUT.blocks[1], EXERCISES, 'lb')).toBe(
      '2 rounds · Dips, Push-up, Plank · rest 1:00'
    );
    expect(describeBlock({ ...WORKOUT.blocks[0], rounds: 1, restSec: 0 }, EXERCISES, 'lb')).toBe('1 set · 8 reps');
  });
});

describe('toCompletedSession', () => {
  it('summarises and drops untouched blocks', () => {
    let s = logSet(start(), { reps: 8, weightKg: 60 }, at(0)).session;
    s = logSet(s, { reps: 6, weightKg: 70 }, at(100)).session;
    const done = toCompletedSession(s, { now: at(1800), prs: [], exercisesById: EXERCISES });
    expect(done).toMatchObject({
      id: 's1',
      workout_id: 'w1',
      habit_id: 'h1',
      duration_sec: 1800,
      total_sets: 2,
      total_volume_kg: 8 * 60 + 6 * 70,
    });
    expect(done.blocks.map((b) => b.id)).toEqual(['b1']);
  });

  it('lists today’s sets per exercise for prefill', () => {
    const s = log(start());
    expect(setsTodayFor(s, 'bench')).toHaveLength(1);
    expect(setsTodayFor(s, 'dip')).toHaveLength(0);
  });
});

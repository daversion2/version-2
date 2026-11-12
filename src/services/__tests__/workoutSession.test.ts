import {
  addBlock,
  addRound,
  adjustRest,
  applySessionToWorkout,
  backToWorkout,
  canMissRound,
  clockStatus,
  currentPosition,
  defaultIntervalSec,
  describeBlock,
  durationSec,
  endRest,
  enterSummary,
  finishedDurationSec,
  savedWorkoutIdFor,
  sessionEndAt,
  workedDurationSec,
  intervalReport,
  isSessionComplete,
  jumpTo,
  logSet,
  missRound,
  pauseClock,
  planChanges,
  repeatsInBlock,
  restRemainingSec,
  resumeClock,
  roundsDone,
  roundsUsed,
  setsTodayFor,
  skipBlock,
  skipRest,
  slotSets,
  startClock,
  startSession,
  toCompletedSession,
  undoLastSet,
  workoutFromSession,
  doneItEnd,
  editLoggedSet,
  estimateWorkoutMinutes,
  fillAsPrescribed,
  prescribedValues,
  setRoundsDone,
  withLoggedTimes,
} from '../workoutSession';
import { computeSessionRecords } from '../workoutMath';
import { CompletedWorkoutSession, Exercise, Workout, WorkoutSession } from '../../types/workouts';

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

describe('a draft finished long after its last set', () => {
  const HOUR = 3600;

  it('ends at the last set when nothing was logged for over three hours', () => {
    let s = logSet(start(), { reps: 8 }, at(600)).session;
    s = logSet(s, { reps: 8 }, at(1200)).session;
    s = enterSummary(s, at(20 * HOUR));
    expect(s.endedAt).toBe(at(1200).toISOString());
    const done = toCompletedSession(s, { now: at(21 * HOUR), prs: [], exercisesById: EXERCISES });
    expect(done.finished_at).toBe(at(1200).toISOString());
    expect(done.duration_sec).toBe(1200);
  });

  it('ends at Finish for an ordinary workout', () => {
    const s = enterSummary(logSet(start(), { reps: 8 }, at(600)).session, at(1800));
    expect(s.endedAt).toBe(at(1800).toISOString());
  });

  it('keeps Finish’s time when the save is retried later', () => {
    const s = enterSummary(logSet(start(), { reps: 8 }, at(600)).session, at(1800));
    const done = toCompletedSession(s, { now: at(30 * HOUR), prs: [], exercisesById: EXERCISES });
    expect(done.finished_at).toBe(at(1800).toISOString());
    expect(done.duration_sec).toBe(1800);
  });

  it('leaves the overnight gap out of a draft resumed the next day', () => {
    let s = logSet(start(), { reps: 8 }, at(600)).session;
    s = logSet(s, { reps: 8 }, at(12 * HOUR)).session;
    s = enterSummary(s, at(12 * HOUR + 900));
    expect(s.endedAt).toBe(at(12 * HOUR + 900).toISOString());
    expect(finishedDurationSec(s, at(13 * HOUR))).toBe(600 + 900);
  });

  it('caps a save made without a summary at the last set too', () => {
    const s = logSet(start(), { reps: 8 }, at(600)).session;
    expect(sessionEndAt(s, at(10 * HOUR)).toISOString()).toBe(at(600).toISOString());
    expect(workedDurationSec(s, at(900))).toBe(900);
  });
});

describe('savedWorkoutIdFor', () => {
  it('is the same every time for one session, and differs between sessions', () => {
    expect(savedWorkoutIdFor('s1')).toBe(savedWorkoutIdFor('s1'));
    expect(savedWorkoutIdFor('s1')).not.toBe(savedWorkoutIdFor('s2'));
  });
});

describe('the weight unit', () => {
  it('is kept with the session when given', () => {
    expect(startSession({ id: 's', now: T0, unit: 'kg' }).unit).toBe('kg');
    expect(startSession({ id: 's', now: T0 }).unit).toBeUndefined();
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

// --- On the clock (interval blocks) -------------------------------------------------

/** Bench every 3:00 for 3 sets, then a pull-up / dip round every 2:00, twice. */
const CLOCKED: Workout = {
  ...WORKOUT,
  blocks: [
    { ...WORKOUT.blocks[0], rounds: 3, intervalSec: 180 },
    {
      id: 'b2',
      type: 'circuit',
      name: 'Pull / Dip',
      items: [
        { exerciseId: 'curl', target: { reps: 8 } },
        { exerciseId: 'dip', target: { reps: 8 } },
      ],
      rounds: 2,
      restSec: 60,
      intervalSec: 120,
    },
  ],
};

const startClocked = () => startClock(startSession({ id: 's1', workout: CLOCKED, now: T0 }), T0);

describe('on the clock', () => {
  it('waits for Start, then runs the first round from that moment', () => {
    const s = startSession({ id: 's1', workout: CLOCKED, now: T0 });
    expect(s.blocks[0].intervalSec).toBe(180);
    expect(clockStatus(s, T0)).toEqual({ phase: 'ready', sec: 180 });
    expect(clockStatus(startClock(s, at(5)), at(65))).toEqual({ phase: 'work', sec: 180, remainingSec: 120, overSec: 0 });
  });

  it('rests until the next interval when a set finishes early, and records the work time', () => {
    const r = logSet(startClocked(), { reps: 8, weightKg: 60 }, at(40));
    expect(r.restSec).toBe(140);
    expect(r.session.rest?.endsAt).toBe(at(180).toISOString());
    expect(r.session.clock?.roundStartsAt).toBe(at(180).toISOString());
    expect(r.session.blocks[0].workSec).toEqual([40]);
    expect(clockStatus(r.session, at(100))).toEqual({ phase: 'rest', sec: 180, remainingSec: 80 });
  });

  it('starts the next round straight away after running over — no make-up rest', () => {
    const r = logSet(startClocked(), { reps: 8, weightKg: 60 }, at(200));
    expect(r.restSec).toBeNull();
    expect(r.session.rest).toBeUndefined();
    expect(r.session.clock?.roundStartsAt).toBe(at(200).toISOString());
    expect(clockStatus(startClocked(), at(200))).toMatchObject({ phase: 'work', remainingSec: 0, overSec: 20 });
  });

  it('skips a rest of under a second and a half — that is rounding, not rest', () => {
    const r = logSet(startClocked(), { reps: 8, weightKg: 60 }, new Date(T0.getTime() + 179_000));
    expect(r.restSec).toBeNull();
    expect(r.session.clock?.roundStartsAt).toBe(new Date(T0.getTime() + 179_000).toISOString());
  });

  it('keeps the overtime visible while paused past the interval', () => {
    expect(clockStatus(pauseClock(startClocked(), at(190)), at(300))).toMatchObject({
      phase: 'paused',
      remainingSec: 0,
      overSec: 10,
    });
  });

  it('runs a circuit back to back inside one interval and rests only after the round', () => {
    let s = startClocked();
    s = log(s, 10);
    s = log(s, 180);
    s = log(s, 360); // bench done: rest to 540, then the circuit is ready
    expect(s.clock).toBeUndefined();
    expect(clockStatus(s, at(400))).toEqual({ phase: 'ready', sec: 120 });
    s = startClock(s, at(540));
    const mid = logSet(s, { reps: 8 }, at(560));
    expect(mid.restSec).toBeNull();
    const end = logSet(mid.session, { reps: 8 }, at(590));
    expect(end.restSec).toBe(70);
    expect(end.session.blocks[1].workSec).toEqual([50]);
  });

  it('stops the clock when the block is done, resting to the end of its last interval', () => {
    let s = startClocked();
    s = log(s, 30);
    s = log(s, 210);
    const r = logSet(s, { reps: 8, weightKg: 60 }, at(400));
    expect(r.blockComplete).toBe(true);
    expect(r.session.clock).toBeUndefined();
    expect(r.restSec).toBe(140);
  });

  it('skipping the rest starts the next round now; adjusting it moves the start too', () => {
    const resting = logSet(startClocked(), { reps: 8, weightKg: 60 }, at(40)).session;
    const skipped = skipRest(resting, at(60));
    expect(skipped.rest).toBeUndefined();
    expect(skipped.clock?.roundStartsAt).toBe(at(60).toISOString());
    const longer = adjustRest(resting, 15, at(60));
    expect(longer.clock?.roundStartsAt).toBe(at(195).toISOString());
    expect(longer.rest?.endsAt).toBe(at(195).toISOString());
    expect(adjustRest(resting, -200, at(60)).clock?.roundStartsAt).toBe(at(60).toISOString());
  });

  it('pause freezes the clock and resume shifts it by the pause', () => {
    const paused = pauseClock(startClocked(), at(30));
    expect(clockStatus(paused, at(500))).toEqual({
      phase: 'paused',
      sec: 180,
      remainingSec: 150,
      overSec: 0,
      resting: false,
    });
    const resumed = resumeClock(paused, at(130));
    expect(resumed.clock?.pausedAt).toBeUndefined();
    expect(clockStatus(resumed, at(130))).toMatchObject({ phase: 'work', remainingSec: 150 });
  });

  it('pausing in a rest drops the rest, and resuming brings it back shifted', () => {
    const resting = logSet(startClocked(), { reps: 8, weightKg: 60 }, at(40)).session;
    const paused = pauseClock(resting, at(100));
    expect(paused.rest).toBeUndefined();
    expect(clockStatus(paused, at(999))).toMatchObject({ phase: 'paused', remainingSec: 80, resting: true });
    const resumed = resumeClock(paused, at(160));
    expect(resumed.rest?.endsAt).toBe(at(240).toISOString());
  });

  it('a missed round counts toward the block but is never logged as a set', () => {
    const s = startClocked();
    expect(canMissRound(s, at(100))).toBe(false);
    expect(canMissRound(s, at(181))).toBe(true);
    const missed = missRound(s, at(181));
    expect(missed.blocks[0].sets).toHaveLength(0);
    expect(missed.blocks[0].missedRounds).toEqual([0]);
    expect(roundsUsed(missed.blocks[0])).toBe(1);
    expect(currentPosition(missed)?.round).toBe(1);
    expect(missed.clock?.roundStartsAt).toBe(at(181).toISOString());
  });

  it('cannot miss a round once a set in it is logged', () => {
    let s = startSession({ id: 's1', workout: CLOCKED, now: T0 });
    s = startClock(skipBlock(s, 0), T0);
    s = logSet(s, { reps: 8 }, at(30)).session;
    expect(canMissRound(s, at(200))).toBe(false);
    expect(missRound(s, at(200))).toBe(s);
  });

  it('undo puts a finished round’s clock back where it was', () => {
    const r = logSet(startClocked(), { reps: 8, weightKg: 60 }, at(40));
    const undone = undoLastSet(r.session);
    expect(undone.blocks[0].workSec).toEqual([]);
    expect(undone.clock?.roundStartsAt).toBe(T0.toISOString());
    expect(clockStatus(undone, at(50))).toMatchObject({ phase: 'work', remainingSec: 130 });
  });

  it('moving to another block stops the clock', () => {
    expect(jumpTo(startClocked(), 1).clock).toBeUndefined();
    expect(skipBlock(startClocked(), 0).clock).toBeUndefined();
    expect(enterSummary(startClocked(), at(10)).clock).toBeUndefined();
  });

  it('keeps the interval when saving back to the workout', () => {
    const s = log(startClocked(), 30);
    const saved = applySessionToWorkout(CLOCKED, s, at(100));
    expect(saved.blocks.map((b) => b.intervalSec)).toEqual([180, 120]);
  });

  it('describes the clock in place of the rest', () => {
    expect(describeBlock(CLOCKED.blocks[0], EXERCISES, 'lb')).toBe('3 sets · 8 reps · every 3:00');
  });
});

describe('intervalReport', () => {
  const block = (workSec: number[], missedRounds?: number[]) => ({
    ...startSession({ id: 's1', workout: CLOCKED, now: T0 }).blocks[0],
    workSec,
    ...(missedRounds ? { missedRounds } : {}),
  });

  it('is null off the clock or before anything was timed', () => {
    expect(intervalReport(start().blocks[0])).toBeNull();
    expect(intervalReport(block([]))).toBeNull();
  });

  it('averages work against the interval', () => {
    expect(intervalReport(block([40, 50], [2]))).toEqual({
      sec: 180,
      rounds: 2,
      missed: 1,
      avgWorkSec: 45,
      share: 0.25,
      tight: false,
    });
  });

  it('calls it tight past 85% of the interval over two or more rounds', () => {
    expect(intervalReport(block([160, 158]))?.tight).toBe(true);
    expect(intervalReport(block([170]))?.tight).toBe(false);
  });
});

describe('defaultIntervalSec', () => {
  it('is the rest plus ~40s per exercise, rounded up to 30s, at least a minute', () => {
    expect(defaultIntervalSec(WORKOUT.blocks[0])).toBe(150); // 90 + 40
    expect(defaultIntervalSec(WORKOUT.blocks[1])).toBe(180); // 60 + 120
    expect(defaultIntervalSec({ ...WORKOUT.blocks[0], restSec: 0 })).toBe(60);
  });
});

describe('Done it: logging a workout after the fact', () => {
  const END = at(3600);
  const HALF_HOUR = 30 * 60;
  const lastBench: CompletedWorkoutSession = {
    id: 'old',
    workout_name: 'Push Day',
    started_at: T0.toISOString(),
    finished_at: T0.toISOString(),
    duration_sec: 600,
    total_sets: 2,
    total_volume_kg: 0,
    prs: [],
    blocks: [
      {
        ...WORKOUT.blocks[0],
        plannedRounds: 2,
        skipped: false,
        added: false,
        sets: [
          { exerciseId: 'bench', round: 0, reps: 6, weightKg: 60, at: T0.toISOString() },
          { exerciseId: 'bench', round: 1, reps: 5, weightKg: 62.5, at: T0.toISOString() },
        ],
      },
    ],
  };
  const fill = (sessions: CompletedWorkoutSession[] = []) =>
    fillAsPrescribed(start(), { exercisesById: EXERCISES, sessions, end: END, durationSec: HALF_HOUR });

  it('takes the plan first, then last time, then the default', () => {
    expect(prescribedValues('weight', { reps: 8 }, { reps: 5, weightKg: 60 })).toEqual({ reps: 8, weightKg: 60 });
    expect(prescribedValues('weight', { reps: 8, weightKg: 50 }, { reps: 5, weightKg: 60 })).toEqual({ reps: 8, weightKg: 50 });
    expect(prescribedValues('weight', {}, undefined)).toEqual({ reps: 10, weightKg: 0 });
    expect(prescribedValues('time', { seconds: 45 }, { seconds: 60 })).toEqual({ seconds: 45 });
    expect(prescribedValues('reps', {}, { reps: 9 })).toEqual({ reps: 9 });
  });

  it('logs every planned round as prescribed, on the summary step', () => {
    const s = fill([lastBench]);
    expect(s.phase).toBe('summary');
    expect(s.loggedAfter).toBe(true);
    expect(s.blocks.map((b) => b.sets.length)).toEqual([2, 6]);
    // The plan's reps, last time's weight — set by set.
    expect(s.blocks[0].sets.map((x) => [x.reps, x.weightKg])).toEqual([
      [8, 60],
      [8, 62.5],
    ]);
    expect(s.blocks[1].sets.slice(0, 3).map((x) => [x.exerciseId, x.round, x.reps ?? x.seconds])).toEqual([
      ['dip', 0, 12],
      ['pushup', 0, 15],
      ['plank', 0, 45],
    ]);
    expect(s.history).toEqual([0, 0, 1, 1, 1, 1, 1, 1]);
    expect(isSessionComplete(s)).toBe(true);
  });

  it('saves with exactly the entered day and duration', () => {
    const s = fill();
    expect(s.endedAt).toBe(END.toISOString());
    expect(s.startedAt).toBe(at(3600 - HALF_HOUR).toISOString());
    const done = toCompletedSession(s, { now: at(99999), prs: [], exercisesById: EXERCISES });
    expect(done.finished_at).toBe(END.toISOString());
    expect(done.duration_sec).toBe(HALF_HOUR);
    expect(done.total_sets).toBe(8);
    expect(done.logged_after).toBe(true);
    // Every set sits inside the session, in order.
    const times = s.blocks.flatMap((b) => b.sets.map((x) => new Date(x.at).getTime()));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBeGreaterThan(new Date(s.startedAt).getTime());
    expect(times[times.length - 1]).toBeLessThan(END.getTime());
  });

  it('moves to another day and length without touching the numbers', () => {
    const s = withLoggedTimes(fill(), at(-86400), 3 * 60 * 60);
    const done = toCompletedSession(s, { now: at(99999), prs: [], exercisesById: EXERCISES });
    expect(done.finished_at).toBe(at(-86400).toISOString());
    expect(done.duration_sec).toBe(3 * 60 * 60);
    expect(s.blocks[0].sets.map((x) => x.reps)).toEqual([8, 8]);
  });

  it('edits one set and its records follow', () => {
    const s = editLoggedSet(fill([lastBench]), 0, 1, { reps: 8, weightKg: 70 });
    expect(s.blocks[0].sets[1]).toMatchObject({ reps: 8, weightKg: 70, round: 1, exerciseId: 'bench' });
    expect(s.blocks[0].sets[0]).toMatchObject({ reps: 8, weightKg: 60 });
    const { prs } = computeSessionRecords(s, EXERCISES, { bench: { exerciseId: 'bench', heaviestKg: 62.5 } });
    expect(prs.some((p) => p.type === 'heaviest' && p.value === 70)).toBe(true);
    expect(editLoggedSet(s, 5, 0, { reps: 1 })).toBe(s);
  });

  it('drops rounds, repeats the last one, and 0 means not done', () => {
    const opts = { exercisesById: EXERCISES, sessions: [] };
    let s = editLoggedSet(fill(), 1, 4, { reps: 20 }); // round 2's push-ups
    s = setRoundsDone(s, 1, 1, opts);
    expect(s.blocks[1].sets).toHaveLength(3);
    expect(s.blocks[1].rounds).toBe(2); // still "1 of 2"
    s = setRoundsDone(s, 1, 3, opts);
    expect(s.blocks[1].sets.map((x) => x.round)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    expect(s.blocks[1].sets[4].reps).toBe(15); // copied from round 1, not the dropped edit
    expect(s.blocks[1].rounds).toBe(3);
    s = setRoundsDone(s, 0, 0, opts);
    expect(s.blocks[0]).toMatchObject({ sets: [], skipped: true });
    expect(s.history).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const done = toCompletedSession(s, { now: at(99999), prs: [], exercisesById: EXERCISES });
    expect(done.blocks.map((b) => b.id)).toEqual(['b2']);
    expect(done.duration_sec).toBe(HALF_HOUR);
    // Back from none: the prescribed numbers again.
    s = setRoundsDone(s, 0, 1, opts);
    expect(s.blocks[0]).toMatchObject({ skipped: false, sets: [{ reps: 8, weightKg: 0, round: 0 }] });
  });

  it('ends today now, and an earlier day at the same time of day', () => {
    const now = new Date(2026, 10, 7, 18, 30);
    expect(doneItEnd('2026-11-07', now)).toEqual(now);
    expect(doneItEnd('2026-11-05', now)).toEqual(new Date(2026, 10, 5, 18, 30));
    expect(doneItEnd('2026-10-31', now)).toEqual(new Date(2026, 9, 31, 18, 30));
    expect(doneItEnd('2026-11-09', now)).toEqual(now); // never in the future
  });

  it('estimates how long the plan takes, in 5-minute steps', () => {
    // Bench: 2×40s + 90s rest; circuit: 2×(40+40+45)s + 60s rest = 560s ≈ 9 min → 10.
    expect(estimateWorkoutMinutes(WORKOUT, EXERCISES)).toBe(10);
    const tiny: Workout = { ...WORKOUT, blocks: [WORKOUT.blocks[0]] };
    expect(estimateWorkoutMinutes(tiny, EXERCISES)).toBe(5);
    const huge: Workout = { ...WORKOUT, blocks: [{ ...WORKOUT.blocks[0], rounds: 100, restSec: 300 }] };
    expect(estimateWorkoutMinutes(huge, EXERCISES)).toBe(180);
  });
});

describe('the override tapped on Start', () => {
  it('rides from the session to the saved workout', () => {
    const s = startSession({ id: 's', workout: WORKOUT, override: 3, now: T0 });
    expect(s.override).toBe(3);
    expect(toCompletedSession(s, { now: at(600), prs: [], exercisesById: EXERCISES }).override).toBe(3);
  });

  it('is left off when there is none, or it is not a level', () => {
    expect('override' in startSession({ id: 's', workout: WORKOUT, now: T0 })).toBe(false);
    expect('override' in startSession({ id: 's', workout: WORKOUT, override: 5, now: T0 })).toBe(false);
  });
});

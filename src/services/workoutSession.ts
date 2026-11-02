import {
  BlockItem,
  CompletedWorkoutSession,
  Exercise,
  IntervalClock,
  LoggedSet,
  PersonalRecord,
  SessionBlock,
  SetValues,
  Workout,
  WeightUnit,
  WorkoutBlock,
  WorkoutSession,
} from '../types/workouts';
import { DEFAULT_REST_SEC } from '../data/workoutExercises';
import { formatClock, formatSeconds, formatTarget, sessionVolumeKg } from './workoutMath';

// =============================================================================
// THE SESSION ENGINE — pure functions over WorkoutSession, no I/O.
//
// A single exercise and a circuit are the same thing here: a block of items
// done in order, repeated for N rounds. A single has one item, so a round is a
// set. Rest comes after a completed round and never between items inside one,
// which is exactly "straight from dips to push-ups, rest after the plank".
//
// A block can instead run on the clock (`intervalSec`): a round starts every N
// seconds and the rest is whatever's left after the work. Finish early and you
// rest till the next round's start; finish late and the next one starts right
// away — the clock never makes up lost time. That rest is an ordinary
// `session.rest`, so the sheet and the lock-screen bell work unchanged.
//
// Every function returns a new session; screens hold it in state and persist
// it as a draft after each change.
// =============================================================================

export const makeId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * The id "Save as a workout" gives the workout it makes — one per session, so
 * a Finish retried after a timeout (whose first save may still land) rewrites
 * the same workout instead of adding a second.
 */
export const savedWorkoutIdFor = (sessionId: string): string => `from_${sessionId}`;

const cleanValues = (values: SetValues): SetValues => {
  const out: SetValues = {};
  if (typeof values.reps === 'number') out.reps = values.reps;
  if (typeof values.weightKg === 'number') out.weightKg = values.weightKg;
  if (typeof values.seconds === 'number') out.seconds = values.seconds;
  return out;
};

const cloneItems = (items: BlockItem[]): BlockItem[] =>
  items.map((i) => ({ exerciseId: i.exerciseId, target: cleanValues(i.target) }));

const toSessionBlock = (block: WorkoutBlock, added = false): SessionBlock => ({
  id: block.id,
  type: block.items.length > 1 ? 'circuit' : 'single',
  ...(block.name ? { name: block.name } : {}),
  items: cloneItems(block.items),
  rounds: Math.max(1, block.rounds),
  restSec: Math.max(0, block.restSec),
  ...(block.intervalSec && block.intervalSec > 0 ? { intervalSec: block.intervalSec } : {}),
  plannedRounds: added ? 0 : block.rounds,
  sets: [],
  skipped: false,
  added,
});

export const startSession = (opts: {
  id: string;
  workout?: Workout;
  name?: string;
  habitId?: string;
  /** The training phase this session counts toward. */
  phaseId?: string;
  /** The unit weights are entered in — kept with the draft (see WorkoutSession.unit). */
  unit?: WeightUnit;
  now: Date;
}): WorkoutSession => ({
  id: opts.id,
  ...(opts.workout ? { workoutId: opts.workout.id } : {}),
  workoutName: opts.workout?.name ?? opts.name ?? 'Workout',
  ...(opts.habitId ? { habitId: opts.habitId } : {}),
  ...(opts.phaseId ? { phaseId: opts.phaseId } : {}),
  ...(opts.unit ? { unit: opts.unit } : {}),
  startedAt: opts.now.toISOString(),
  blocks: (opts.workout?.blocks ?? []).map((b) => toSessionBlock(b)),
  cursor: 0,
  history: [],
  phase: 'active',
});

// --- Reading -----------------------------------------------------------------

export const roundsDone = (block: SessionBlock): number =>
  Math.floor(block.sets.length / block.items.length);

/** Rounds done plus rounds missed on the clock: where the block has got to. */
export const roundsUsed = (block: SessionBlock): number =>
  roundsDone(block) + (block.missedRounds?.length ?? 0);

export const isBlockFinished = (block: SessionBlock): boolean =>
  block.skipped || roundsUsed(block) >= block.rounds;

/** The block you're on: the cursor if unfinished, else the next unfinished, wrapping round. */
export const currentBlockIndex = (session: WorkoutSession): number | null => {
  const { blocks, cursor } = session;
  if (cursor < blocks.length && !isBlockFinished(blocks[cursor])) return cursor;
  for (let i = cursor + 1; i < blocks.length; i++) if (!isBlockFinished(blocks[i])) return i;
  for (let i = 0; i < Math.min(cursor, blocks.length); i++) if (!isBlockFinished(blocks[i])) return i;
  return null;
};

export interface Position {
  blockIndex: number;
  block: SessionBlock;
  /** 0-based round (set number for a single). */
  round: number;
  itemIndex: number;
  item: BlockItem;
}

export const currentPosition = (session: WorkoutSession): Position | null => {
  const blockIndex = currentBlockIndex(session);
  if (blockIndex === null) return null;
  const block = session.blocks[blockIndex];
  const itemIndex = block.sets.length % block.items.length;
  return { blockIndex, block, round: roundsUsed(block), itemIndex, item: block.items[itemIndex] };
};

export const isSessionComplete = (session: WorkoutSession): boolean =>
  session.blocks.length > 0 && currentBlockIndex(session) === null;

/** Sets of one exercise already logged in this session, in order. */
export const setsTodayFor = (session: WorkoutSession, exerciseId: string): LoggedSet[] =>
  session.blocks.flatMap((b) => b.sets).filter((s) => s.exerciseId === exerciseId);

/**
 * One slot of a block — item `itemIndex` — across its rounds. Sets are logged
 * strictly in item order, so set k belongs to item k % items. Matching on the
 * exercise instead would mix up a circuit that has pull-ups 1st and 5th.
 */
export const slotSets = (block: SessionBlock, itemIndex: number): LoggedSet[] =>
  block.sets.filter((_, k) => k % block.items.length === itemIndex);

/** Does this item's exercise show up more than once in its block? */
export const repeatsInBlock = (block: WorkoutBlock, itemIndex: number): boolean => {
  const id = block.items[itemIndex]?.exerciseId;
  return block.items.filter((i) => i.exerciseId === id).length > 1;
};

export const totalSetsLogged = (session: WorkoutSession): number =>
  session.blocks.reduce((n, b) => n + b.sets.length, 0);

// --- Logging -----------------------------------------------------------------

export interface LogResult {
  session: WorkoutSession;
  /** Rest to start now, or null (mid-circuit, rest set to 0, or nothing left). */
  restSec: number | null;
  roundComplete: boolean;
  blockComplete: boolean;
  workoutComplete: boolean;
}

const replaceAt = <T>(list: T[], index: number, value: T): T[] =>
  list.map((v, i) => (i === index ? value : v));

export const logSet = (session: WorkoutSession, values: SetValues, now: Date): LogResult => {
  const pos = currentPosition(session);
  if (!pos) {
    return { session, restSec: null, roundComplete: false, blockComplete: false, workoutComplete: true };
  }
  const set: LoggedSet = {
    exerciseId: pos.item.exerciseId,
    round: pos.round,
    ...cleanValues(values),
    at: now.toISOString(),
  };
  const block: SessionBlock = { ...pos.block, sets: [...pos.block.sets, set] };
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, pos.blockIndex, block),
    cursor: pos.blockIndex,
    history: [...session.history, pos.blockIndex],
  };
  delete next.rest;

  const roundComplete = block.sets.length % block.items.length === 0;
  const blockComplete = isBlockFinished(block);
  const workoutComplete = currentBlockIndex(next) === null;

  const clock = clockFor(session, block);
  if (clock) {
    if (!roundComplete) return { session: next, restSec: null, roundComplete, blockComplete, workoutComplete };
    // The round's work time, then the next round's start: on the clock, or now if you ran over.
    const startedAt = new Date(clock.roundStartsAt).getTime();
    const workSec = Math.max(0, Math.round((now.getTime() - startedAt) / 1000));
    // A rest under a second and a half is rounding, not rest: start now.
    const onTime = startedAt + clock.sec * 1000;
    const nextStart = onTime - now.getTime() < 1500 ? now.getTime() : onTime;
    next.blocks = replaceAt(next.blocks, pos.blockIndex, { ...block, workSec: [...(block.workSec ?? []), workSec] });
    if (blockComplete) delete next.clock;
    else next.clock = { ...clock, roundStartsAt: new Date(nextStart).toISOString() };
    const restSec = workoutComplete ? 0 : Math.ceil((nextStart - now.getTime()) / 1000);
    if (restSec > 0) next.rest = { endsAt: new Date(nextStart).toISOString(), totalSec: restSec };
    return { session: next, restSec: restSec > 0 ? restSec : null, roundComplete, blockComplete, workoutComplete };
  }

  const restSec = roundComplete && !workoutComplete && block.restSec > 0 ? block.restSec : null;
  if (restSec) {
    next.rest = { endsAt: new Date(now.getTime() + restSec * 1000).toISOString(), totalSec: restSec };
  }
  return { session: next, restSec, roundComplete, blockComplete, workoutComplete };
};

/** Takes back the most recent set, wherever it was, and returns you to it. */
export const undoLastSet = (session: WorkoutSession): WorkoutSession => {
  if (!session.history.length) return session;
  const blockIndex = session.history[session.history.length - 1];
  const block = session.blocks[blockIndex];
  const undone = block.sets[block.sets.length - 1];
  const reopened: SessionBlock = { ...block, sets: block.sets.slice(0, -1), skipped: false };
  let clock = session.clock;
  // Taking back a round's last set on the clock puts that round's clock back
  // where it was: it started its work time before the set was logged.
  const work = block.workSec?.[block.workSec.length - 1];
  if (block.intervalSec && block.sets.length % block.items.length === 0 && undone && work !== undefined) {
    reopened.workSec = block.workSec!.slice(0, -1);
    clock = {
      blockId: block.id,
      sec: block.intervalSec,
      roundStartsAt: new Date(new Date(undone.at).getTime() - work * 1000).toISOString(),
    };
  }
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, reopened),
    cursor: blockIndex,
    history: session.history.slice(0, -1),
  };
  if (clock) next.clock = clock;
  delete next.rest;
  return dropStrayClock(next);
};

// --- Rest --------------------------------------------------------------------

/** Timestamps, not a ticking counter, so a backgrounded app comes back to the right number. */
export const restRemainingSec = (session: WorkoutSession, now: Date): number =>
  session.rest
    ? Math.max(0, Math.ceil((new Date(session.rest.endsAt).getTime() - now.getTime()) / 1000))
    : 0;

export const adjustRest = (session: WorkoutSession, deltaSec: number, now: Date): WorkoutSession => {
  if (!session.rest) return session;
  const endsAt = new Date(session.rest.endsAt).getTime() + deltaSec * 1000;
  if (endsAt <= now.getTime()) return skipRest(session, now);
  const next: WorkoutSession = {
    ...session,
    rest: {
      endsAt: new Date(endsAt).toISOString(),
      totalSec: Math.max(1, session.rest.totalSec + deltaSec),
    },
  };
  // On the clock, a longer rest moves the next round's start with it.
  if (resting(session, now)) next.clock = { ...session.clock!, roundStartsAt: new Date(endsAt).toISOString() };
  return next;
};

/** Rest ran out on its own. On the clock the next round already starts at that moment. */
export const endRest = (session: WorkoutSession): WorkoutSession => {
  if (!session.rest) return session;
  const next = { ...session };
  delete next.rest;
  return next;
};

/** "Skip rest": on the clock, the next round starts now. */
export const skipRest = (session: WorkoutSession, now: Date): WorkoutSession => {
  const next = endRest(session);
  if (resting(session, now)) next.clock = { ...session.clock!, roundStartsAt: now.toISOString() };
  return next;
};

// --- The clock (interval blocks) ------------------------------------------------

/** The session's clock, if it belongs to this block and has started. */
const clockFor = (session: WorkoutSession, block: WorkoutBlock): IntervalClock | null =>
  block.intervalSec && session.clock?.blockId === block.id ? session.clock : null;

/** Resting on the clock: the next round's start is still ahead. */
const resting = (session: WorkoutSession, now: Date): boolean =>
  !!session.clock && !session.clock.pausedAt && new Date(session.clock.roundStartsAt).getTime() > now.getTime();

/** The clock goes with the block you're on — moving off it (skip, jump, finish) stops it. */
const dropStrayClock = (session: WorkoutSession): WorkoutSession => {
  if (!session.clock) return session;
  const index = currentBlockIndex(session);
  if (index !== null && session.blocks[index].id === session.clock.blockId) return session;
  const next = { ...session };
  delete next.clock;
  return next;
};

export type ClockStatus =
  /** An interval block whose clock hasn't started: "Start the clock". */
  | { phase: 'ready'; sec: number }
  /** Working: `remainingSec` till the interval ends, then `overSec` past it. */
  | { phase: 'work'; sec: number; remainingSec: number; overSec: number }
  /** Done early: the next round starts in `remainingSec`. */
  | { phase: 'rest'; sec: number; remainingSec: number }
  | { phase: 'paused'; sec: number; remainingSec: number; overSec: number; resting: boolean };

/** Where the clock is for the block you're on; null when that block isn't on the clock. */
export const clockStatus = (session: WorkoutSession, now: Date): ClockStatus | null => {
  const index = currentBlockIndex(session);
  if (index === null) return null;
  const block = session.blocks[index];
  if (!block.intervalSec) return null;
  const clock = clockFor(session, block);
  if (!clock) return { phase: 'ready', sec: block.intervalSec };
  const at = clock.pausedAt ? new Date(clock.pausedAt) : now;
  const start = new Date(clock.roundStartsAt).getTime();
  const sinceStart = (at.getTime() - start) / 1000;
  if (sinceStart < 0) {
    const remainingSec = Math.ceil(-sinceStart);
    return clock.pausedAt
      ? { phase: 'paused', sec: clock.sec, remainingSec, overSec: 0, resting: true }
      : { phase: 'rest', sec: clock.sec, remainingSec };
  }
  const remainingSec = Math.max(0, Math.ceil(clock.sec - sinceStart));
  const overSec = Math.max(0, Math.floor(sinceStart - clock.sec));
  if (clock.pausedAt) return { phase: 'paused', sec: clock.sec, remainingSec, overSec, resting: false };
  return { phase: 'work', sec: clock.sec, remainingSec, overSec };
};

/** First round of an interval block starts now. */
export const startClock = (session: WorkoutSession, now: Date): WorkoutSession => {
  const index = currentBlockIndex(session);
  if (index === null) return session;
  const block = session.blocks[index];
  if (!block.intervalSec) return session;
  const next: WorkoutSession = {
    ...session,
    cursor: index,
    clock: { blockId: block.id, sec: block.intervalSec, roundStartsAt: now.toISOString() },
  };
  delete next.rest;
  return next;
};

/** Stops the clock where it is, rest included — a phone call, a taken bench. */
export const pauseClock = (session: WorkoutSession, now: Date): WorkoutSession => {
  if (!session.clock || session.clock.pausedAt) return session;
  const next: WorkoutSession = { ...session, clock: { ...session.clock, pausedAt: now.toISOString() } };
  delete next.rest;
  return next;
};

/** Picks up exactly where pause left it: every time on the clock moves on by the pause. */
export const resumeClock = (session: WorkoutSession, now: Date): WorkoutSession => {
  const clock = session.clock;
  if (!clock?.pausedAt) return session;
  const paused = now.getTime() - new Date(clock.pausedAt).getTime();
  const start = new Date(clock.roundStartsAt).getTime() + Math.max(0, paused);
  const next: WorkoutSession = { ...session, clock: { blockId: clock.blockId, sec: clock.sec, roundStartsAt: new Date(start).toISOString() } };
  if (start > now.getTime()) {
    next.rest = { endsAt: new Date(start).toISOString(), totalSec: Math.ceil((start - now.getTime()) / 1000) };
  }
  return next;
};

/**
 * The interval ran out before you started the round: give it up, and the next
 * round starts now. Only before the round's first set — a set you did is never
 * thrown away, so mid-round you just finish late.
 */
export const missRound = (session: WorkoutSession, now: Date): WorkoutSession => {
  const pos = currentPosition(session);
  if (!pos || pos.itemIndex !== 0 || !clockFor(session, pos.block)) return session;
  const block: SessionBlock = { ...pos.block, missedRounds: [...(pos.block.missedRounds ?? []), pos.round] };
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, pos.blockIndex, block),
    clock: { ...session.clock!, roundStartsAt: now.toISOString() },
  };
  delete next.rest;
  return dropStrayClock(next);
};

/** Can the round you're on be marked missed right now? */
export const canMissRound = (session: WorkoutSession, now: Date): boolean => {
  const pos = currentPosition(session);
  const status = clockStatus(session, now);
  return !!pos && pos.itemIndex === 0 && status?.phase === 'work' && status.remainingSec === 0;
};

export interface IntervalReport {
  sec: number;
  rounds: number;
  missed: number;
  avgWorkSec: number;
  /** Average work as a share of the interval, 0–1+. */
  share: number;
  /** Work is eating the rest: more than 85% of the interval, over 2+ rounds. */
  tight: boolean;
}

/** How an interval block went: work time against the clock. Null off the clock or with nothing timed. */
export const intervalReport = (block: SessionBlock): IntervalReport | null => {
  const work = block.workSec ?? [];
  if (!block.intervalSec || (!work.length && !block.missedRounds?.length)) return null;
  const avgWorkSec = work.length ? Math.round(work.reduce((a, b) => a + b, 0) / work.length) : 0;
  const share = avgWorkSec / block.intervalSec;
  return {
    sec: block.intervalSec,
    rounds: work.length,
    missed: block.missedRounds?.length ?? 0,
    avgWorkSec,
    share,
    tight: work.length >= 2 && share > 0.85,
  };
};

/**
 * A first guess at the interval: the rest you'd have taken plus ~40s of work
 * per exercise in the round, rounded up to 30s. The summary corrects it from
 * real work times.
 */
export const defaultIntervalSec = (block: WorkoutBlock): number =>
  Math.max(60, Math.ceil((Math.max(0, block.restSec) + 40 * Math.max(1, block.items.length)) / 30) * 30);

// --- Changing the plan mid-session --------------------------------------------

/** Done with this block for today, keeping whatever was logged. */
export const skipBlock = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, { ...session.blocks[blockIndex], skipped: true }),
  };
  delete next.rest;
  return dropStrayClock(next);
};

/** Go to a block now — out of order, or back to one you skipped. */
export const jumpTo = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, { ...session.blocks[blockIndex], skipped: false }),
    cursor: blockIndex,
  };
  delete next.rest;
  return dropStrayClock(next);
};

/** One more set (or round) on a block, and that block becomes the one you're on. */
export const addRound = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const block = session.blocks[blockIndex];
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, {
      ...block,
      // From a skip, "one more" means one more than you actually did.
      rounds: (block.skipped ? roundsUsed(block) : block.rounds) + 1,
      skipped: false,
    }),
    cursor: blockIndex,
  };
  delete next.rest;
  return dropStrayClock(next);
};

/**
 * Adds an exercise (one item) or a circuit (several) right after the block
 * you're on, so it comes up next. Indexes in `history` are shifted to match.
 */
export const addBlock = (
  session: WorkoutSession,
  items: BlockItem[],
  opts: { id: string; rounds?: number; restSec?: number; name?: string }
): WorkoutSession => {
  if (!items.length) return session;
  const block = toSessionBlock(
    {
      id: opts.id,
      type: items.length > 1 ? 'circuit' : 'single',
      ...(opts.name ? { name: opts.name } : {}),
      items,
      rounds: opts.rounds ?? 3,
      restSec: opts.restSec ?? DEFAULT_REST_SEC,
    },
    true
  );
  const current = currentBlockIndex(session);
  const insertAt = current === null ? session.blocks.length : current + 1;
  const blocks = [...session.blocks.slice(0, insertAt), block, ...session.blocks.slice(insertAt)];
  const shift = (i: number) => (i >= insertAt ? i + 1 : i);
  return {
    ...session,
    blocks,
    history: session.history.map(shift),
    cursor: current === null ? insertAt : shift(session.cursor),
  };
};

// --- Finishing -----------------------------------------------------------------

export interface PlanChanges {
  addedBlocks: number;
  extraRounds: number;
  any: boolean;
}

/** What could be saved back to the workout. Skips are one-offs and never count. */
export const planChanges = (session: WorkoutSession): PlanChanges => {
  let addedBlocks = 0;
  let extraRounds = 0;
  for (const b of session.blocks) {
    if (b.added) {
      if (b.sets.length) addedBlocks++;
    } else if (roundsDone(b) > b.plannedRounds) {
      extraRounds += roundsDone(b) - b.plannedRounds;
    }
  }
  return { addedBlocks, extraRounds, any: addedBlocks + extraRounds > 0 };
};

/** The last values logged for each item — the plan for next time. */
const itemsFromLogged = (block: SessionBlock): BlockItem[] =>
  block.items.map((item, index) => {
    const mine = slotSets(block, index);
    const last = mine[mine.length - 1];
    if (!last) return { exerciseId: item.exerciseId, target: cleanValues(item.target) };
    const { exerciseId: _e, round: _r, at: _a, ...values } = last;
    return { exerciseId: item.exerciseId, target: cleanValues(values) };
  });

const toWorkoutBlock = (block: SessionBlock, rounds: number, items: BlockItem[]): WorkoutBlock => ({
  id: block.id,
  type: items.length > 1 ? 'circuit' : 'single',
  ...(block.name ? { name: block.name } : {}),
  items,
  rounds,
  restSec: block.restSec,
  ...(block.intervalSec ? { intervalSec: block.intervalSec } : {}),
});

/** "Save changes to Push Day": keeps added blocks you did and extra sets. */
export const applySessionToWorkout = (
  workout: Workout,
  session: WorkoutSession,
  now: Date
): Workout => ({
  ...workout,
  blocks: session.blocks
    .filter((b) => !b.added || b.sets.length > 0)
    .map((b) =>
      b.added
        ? toWorkoutBlock(b, Math.max(1, roundsDone(b)), itemsFromLogged(b))
        : toWorkoutBlock(b, Math.max(b.plannedRounds, roundsDone(b)), cloneItems(b.items))
    ),
  updated_at: now.toISOString(),
});

/** "Save as a workout" from an empty session: what you did becomes the plan. */
export const workoutFromSession = (
  session: WorkoutSession,
  opts: { id: string; name: string; now: Date }
): Workout => ({
  id: opts.id,
  name: opts.name.trim() || session.workoutName,
  blocks: session.blocks
    .filter((b) => b.sets.length > 0)
    .map((b) => toWorkoutBlock(b, Math.max(1, roundsDone(b)), itemsFromLogged(b))),
  created_at: opts.now.toISOString(),
  updated_at: opts.now.toISOString(),
});

export const blockTitle = (block: WorkoutBlock, exercisesById: Record<string, Exercise>): string =>
  block.items.length > 1
    ? block.name || 'Circuit'
    : exercisesById[block.items[0]?.exerciseId]?.name ?? 'Exercise';

/** "3 sets · 8 reps · rest 1:30", or "3 rounds · Dips, Push-up, Plank · rest 1:30". */
export const describeBlock = (
  block: WorkoutBlock,
  exercisesById: Record<string, Exercise>,
  unit: WeightUnit
): string => {
  const parts: string[] = [];
  if (block.items.length > 1) {
    parts.push(`${block.rounds} ${block.rounds === 1 ? 'round' : 'rounds'}`);
    parts.push(block.items.map((i) => exercisesById[i.exerciseId]?.name ?? 'Exercise').join(', '));
  } else {
    const item = block.items[0];
    const kind = exercisesById[item?.exerciseId]?.kind ?? 'weight';
    parts.push(`${block.rounds} ${block.rounds === 1 ? 'set' : 'sets'}`);
    if (item) parts.push(formatTarget(item.target, kind, unit));
  }
  if (block.intervalSec) parts.push(`every ${formatClock(block.intervalSec)}`);
  else if (block.restSec > 0) parts.push(`rest ${formatSeconds(block.restSec)}`);
  return parts.join(' · ');
};

export const durationSec = (session: WorkoutSession, now: Date): number => {
  const end = session.endedAt ? new Date(session.endedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 1000));
};

/**
 * Over this long with nothing logged, the workout was over: a draft left
 * overnight and finished the next day ended at its last set, not at Finish.
 */
export const STALE_GAP_SEC = 3 * 60 * 60;

/** When the latest thing happened: the last logged set, or the start. */
const lastActivityMs = (session: WorkoutSession): number =>
  session.blocks
    .flatMap((b) => b.sets)
    .reduce((latest, s) => Math.max(latest, new Date(s.at).getTime()), new Date(session.startedAt).getTime());

/** When the workout really ended: now — or, after a stale gap, its last set. */
export const sessionEndAt = (session: WorkoutSession, now: Date): Date => {
  const last = lastActivityMs(session);
  return now.getTime() - last > STALE_GAP_SEC * 1000 ? new Date(last) : now;
};

/**
 * Time actually trained, start to `end`, leaving out any stretch over
 * STALE_GAP_SEC with nothing logged — started last night and finished this
 * morning is the two workouts' worth of sets, not twelve hours.
 */
export const workedDurationSec = (session: WorkoutSession, end: Date): number => {
  const endMs = end.getTime();
  const points = [
    new Date(session.startedAt).getTime(),
    ...session.blocks
      .flatMap((b) => b.sets)
      .map((s) => new Date(s.at).getTime())
      .filter((t) => t <= endMs)
      .sort((a, b) => a - b),
    endMs,
  ];
  let ms = 0;
  for (let i = 1; i < points.length; i++) {
    const gap = points[i] - points[i - 1];
    if (gap > 0 && gap <= STALE_GAP_SEC * 1000) ms += gap;
  }
  return Math.round(ms / 1000);
};

/** The duration the summary shows and the saved session keeps. */
export const finishedDurationSec = (session: WorkoutSession, now: Date): number =>
  workedDurationSec(session, session.endedAt ? new Date(session.endedAt) : sessionEndAt(session, now));

/** Finish tapped: stop the clock, drop any rest, show the summary. */
export const enterSummary = (session: WorkoutSession, now: Date): WorkoutSession => {
  const next: WorkoutSession = {
    ...endRest(session),
    phase: 'summary',
    endedAt: sessionEndAt(session, now).toISOString(),
  };
  delete next.clock;
  return next;
};

/** "Back to workout" from the summary — the clock runs again. */
export const backToWorkout = (session: WorkoutSession): WorkoutSession => {
  const next: WorkoutSession = { ...session, phase: 'active' };
  delete next.endedAt;
  return next;
};

export const toCompletedSession = (
  session: WorkoutSession,
  opts: { now: Date; prs: PersonalRecord[]; exercisesById: Record<string, Exercise> }
): CompletedWorkoutSession => ({
  id: session.id,
  ...(session.workoutId ? { workout_id: session.workoutId } : {}),
  workout_name: session.workoutName,
  ...(session.habitId ? { habit_id: session.habitId } : {}),
  ...(session.phaseId ? { phase_id: session.phaseId } : {}),
  started_at: session.startedAt,
  // Finish's time, not the save's: a save retried tomorrow is still today's workout.
  finished_at: (session.endedAt ? new Date(session.endedAt) : sessionEndAt(session, opts.now)).toISOString(),
  duration_sec: finishedDurationSec(session, opts.now),
  total_sets: totalSetsLogged(session),
  total_volume_kg: Math.round(sessionVolumeKg(session, opts.exercisesById) * 100) / 100,
  // Blocks you never touched are noise in history.
  blocks: session.blocks.filter((b) => b.sets.length > 0),
  prs: opts.prs,
});

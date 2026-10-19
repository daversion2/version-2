import {
  BlockItem,
  CompletedWorkoutSession,
  Exercise,
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
import { formatSeconds, formatTarget, sessionVolumeKg } from './workoutMath';

// =============================================================================
// THE SESSION ENGINE — pure functions over WorkoutSession, no I/O.
//
// A single exercise and a circuit are the same thing here: a block of items
// done in order, repeated for N rounds. A single has one item, so a round is a
// set. Rest comes after a completed round and never between items inside one,
// which is exactly "straight from dips to push-ups, rest after the plank".
//
// Every function returns a new session; screens hold it in state and persist
// it as a draft after each change.
// =============================================================================

export const makeId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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
  now: Date;
}): WorkoutSession => ({
  id: opts.id,
  ...(opts.workout ? { workoutId: opts.workout.id } : {}),
  workoutName: opts.workout?.name ?? opts.name ?? 'Workout',
  ...(opts.habitId ? { habitId: opts.habitId } : {}),
  startedAt: opts.now.toISOString(),
  blocks: (opts.workout?.blocks ?? []).map((b) => toSessionBlock(b)),
  cursor: 0,
  history: [],
  phase: 'active',
});

// --- Reading -----------------------------------------------------------------

export const roundsDone = (block: SessionBlock): number =>
  Math.floor(block.sets.length / block.items.length);

export const isBlockFinished = (block: SessionBlock): boolean =>
  block.skipped || roundsDone(block) >= block.rounds;

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
  return { blockIndex, block, round: roundsDone(block), itemIndex, item: block.items[itemIndex] };
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
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, {
      ...block,
      sets: block.sets.slice(0, -1),
      skipped: false,
    }),
    cursor: blockIndex,
    history: session.history.slice(0, -1),
  };
  delete next.rest;
  return next;
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
  if (endsAt <= now.getTime()) return endRest(session);
  return {
    ...session,
    rest: {
      endsAt: new Date(endsAt).toISOString(),
      totalSec: Math.max(1, session.rest.totalSec + deltaSec),
    },
  };
};

export const endRest = (session: WorkoutSession): WorkoutSession => {
  if (!session.rest) return session;
  const next = { ...session };
  delete next.rest;
  return next;
};

// --- Changing the plan mid-session --------------------------------------------

/** Done with this block for today, keeping whatever was logged. */
export const skipBlock = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, { ...session.blocks[blockIndex], skipped: true }),
  };
  delete next.rest;
  return next;
};

/** Go to a block now — out of order, or back to one you skipped. */
export const jumpTo = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, { ...session.blocks[blockIndex], skipped: false }),
    cursor: blockIndex,
  };
  delete next.rest;
  return next;
};

/** One more set (or round) on a block, and that block becomes the one you're on. */
export const addRound = (session: WorkoutSession, blockIndex: number): WorkoutSession => {
  const block = session.blocks[blockIndex];
  const next: WorkoutSession = {
    ...session,
    blocks: replaceAt(session.blocks, blockIndex, {
      ...block,
      // From a skip, "one more" means one more than you actually did.
      rounds: (block.skipped ? roundsDone(block) : block.rounds) + 1,
      skipped: false,
    }),
    cursor: blockIndex,
  };
  delete next.rest;
  return next;
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
  if (block.restSec > 0) parts.push(`rest ${formatSeconds(block.restSec)}`);
  return parts.join(' · ');
};

export const durationSec = (session: WorkoutSession, now: Date): number => {
  const end = session.endedAt ? new Date(session.endedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 1000));
};

/** Finish tapped: stop the clock, drop any rest, show the summary. */
export const enterSummary = (session: WorkoutSession, now: Date): WorkoutSession => ({
  ...endRest(session),
  phase: 'summary',
  endedAt: now.toISOString(),
});

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
  started_at: session.startedAt,
  finished_at: opts.now.toISOString(),
  duration_sec: durationSec(session, opts.now),
  total_sets: totalSetsLogged(session),
  total_volume_kg: Math.round(sessionVolumeKg(session, opts.exercisesById) * 100) / 100,
  // Blocks you never touched are noise in history.
  blocks: session.blocks.filter((b) => b.sets.length > 0),
  prs: opts.prs,
});

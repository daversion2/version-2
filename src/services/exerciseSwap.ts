import type {
  CompletedWorkoutSession,
  Exercise,
  SessionBlock,
  SwapReason,
  Workout,
  WorkoutBlock,
  WorkoutSession,
} from '../types/workouts';

// =============================================================================
// SWAPPING AN EXERCISE FOR ONE SESSION — everything around the swap itself
// (the engine, swapItem, is in services/workoutSession.ts): the reasons, what
// to suggest instead, how a swap reads afterwards, and when to offer making
// it permanent. Founder, 2026-11-20: swap for today only; mark it on the
// exercise, not the whole workout; offer "make it permanent" after a repeat.
// =============================================================================

export const SWAP_REASONS: { id: SwapReason; label: string }[] = [
  { id: 'sore', label: 'Sore or hurt' },
  { id: 'equipment', label: 'No equipment' },
  { id: 'busy', label: 'Gym busy' },
  { id: 'preference', label: 'Just felt like it' },
];

export const swapReasonLabel = (reason?: SwapReason): string | undefined =>
  SWAP_REASONS.find((r) => r.id === reason)?.label;

/** How many recent sessions count as "you've done this lately". */
const RECENT_SESSIONS = 20;
/** Suggestions shown above "Search all exercises". */
export const SWAP_SUGGESTIONS = 6;

/**
 * What to offer instead of `original`, best first: same body part first, then
 * bodyweight versions (no setup, kind to a sore back), then what you've done
 * lately, then the same way of measuring. Never the original itself, never an
 * archived or hidden one, and cardio only for cardio.
 */
export const swapSuggestions = (
  original: Exercise,
  exercises: Exercise[],
  sessions: CompletedWorkoutSession[],
  limit = SWAP_SUGGESTIONS
): Exercise[] => {
  const recent = new Set(
    [...sessions]
      .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
      .slice(0, RECENT_SESSIONS)
      .flatMap((s) => s.blocks.flatMap((b) => b.sets.map((set) => set.exerciseId)))
  );
  const isCardio = original.kind === 'cardio';
  const score = (e: Exercise) =>
    (e.muscle === original.muscle ? 8 : 0) +
    (e.equipment === 'bodyweight' ? 3 : 0) +
    (recent.has(e.id) ? 2 : 0) +
    (e.kind === original.kind ? 1 : 0);
  return exercises
    .filter((e) => e.id !== original.id && !e.archived_at && (e.kind === 'cardio') === isCardio)
    .map((e) => ({ e, s: score(e) }))
    .filter(({ s }) => s >= 8 || (s >= 3 && original.muscle === 'full_body'))
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map(({ e }) => e);
};

/** One swap in a session. */
export interface SessionSwap {
  blockId: string;
  itemIndex: number;
  fromId: string;
  toId: string;
  reason?: SwapReason;
}

/**
 * A session's swaps that were actually done: the substitute has at least one
 * set. A swapped item never reached (a circuit stopped early) isn't a swap.
 */
export const sessionSwaps = (session: { blocks: Pick<SessionBlock, 'id' | 'items' | 'sets'>[] }): SessionSwap[] =>
  session.blocks.flatMap((b) =>
    b.items.flatMap((item, itemIndex) =>
      item.swappedFrom && b.sets.some((_, k) => k % b.items.length === itemIndex)
        ? [
            {
              blockId: b.id,
              itemIndex,
              fromId: item.swappedFrom.exerciseId,
              toId: item.exerciseId,
              ...(item.swappedFrom.reason ? { reason: item.swappedFrom.reason } : {}),
            },
          ]
        : []
    )
  );

/** "1 swap", "2 swaps", or null. */
export const swapTag = (session: { blocks: Pick<SessionBlock, 'id' | 'items' | 'sets'>[] }): string | null => {
  const n = sessionSwaps(session).length;
  return n === 0 ? null : n === 1 ? '1 swap' : `${n} swaps`;
};

/** "Swapped for Bodyweight Lunge · Sore or hurt" on the original's history. */
export const swappedForLine = (toName: string, reason?: SwapReason): string =>
  [`Swapped for ${toName}`, swapReasonLabel(reason)].filter(Boolean).join(' · ');

/** "Instead of Back Squat · Sore or hurt" on the substitute's history. */
export const insteadOfLine = (fromName: string, reason?: SwapReason): string =>
  [`Instead of ${fromName}`, swapReasonLabel(reason)].filter(Boolean).join(' · ');

/** Days an exercise was swapped away, newest first, for its stats screen. */
export const swapsAwayFrom = (
  sessions: CompletedWorkoutSession[],
  exerciseId: string
): { sessionId: string; finishedAt: string; toId: string; reason?: SwapReason }[] =>
  [...sessions]
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
    .flatMap((s) =>
      sessionSwaps(s)
        .filter((w) => w.fromId === exerciseId)
        .map((w) => ({ sessionId: s.id, finishedAt: s.finished_at, toId: w.toId, ...(w.reason ? { reason: w.reason } : {}) }))
    );

/** How many swaps in a row before "make it permanent?" is offered. */
export const PERMANENT_AFTER = 2;

/**
 * A swap to offer making permanent: the same exercise swapped in the same
 * slot of the same workout for the last PERMANENT_AFTER sessions of that
 * workout, this one included. Null when there's nothing to offer.
 */
export const permanentSwapOffer = (
  session: Pick<CompletedWorkoutSession, 'id' | 'workout_id' | 'blocks'>,
  history: CompletedWorkoutSession[]
): SessionSwap | null => {
  if (!session.workout_id) return null;
  const earlier = history
    .filter((s) => s.workout_id === session.workout_id && s.id !== session.id)
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
    .slice(0, PERMANENT_AFTER - 1);
  if (earlier.length < PERMANENT_AFTER - 1) return null;
  const kept = (swap: SessionSwap) =>
    !!session.blocks.find((b) => b.id === swap.blockId)?.items[swap.itemIndex]?.swappedFrom?.kept;
  return (
    sessionSwaps(session).find((swap) =>
      !kept(swap) &&
      earlier.every((s) =>
        sessionSwaps(s).some(
          (w) => w.blockId === swap.blockId && w.itemIndex === swap.itemIndex && w.fromId === swap.fromId && w.toId === swap.toId
        )
      )
    ) ?? null
  );
};

/** "Make it permanent": the workout with that slot's exercise replaced, its target carried as swapped. */
export const withSwapMadePermanent = (
  workout: Workout,
  swap: Pick<SessionSwap, 'blockId' | 'itemIndex' | 'fromId' | 'toId'>,
  target: WorkoutBlock['items'][number]['target'],
  now: Date
): Workout => ({
  ...workout,
  blocks: workout.blocks.map((b) =>
    b.id !== swap.blockId
      ? b
      : {
          ...b,
          items: b.items.map((item, i) =>
            i === swap.itemIndex && item.exerciseId === swap.fromId ? { exerciseId: swap.toId, target: { ...target } } : item
          ),
        }
  ),
  updated_at: now.toISOString(),
});

/** The session with one swap marked as made permanent, so "Save changes" keeps it. */
export const markSwapKept = (session: WorkoutSession, blockId: string, itemIndex: number): WorkoutSession => ({
  ...session,
  blocks: session.blocks.map((b) =>
    b.id !== blockId
      ? b
      : {
          ...b,
          items: b.items.map((item, i) =>
            i === itemIndex && item.swappedFrom ? { ...item, swappedFrom: { ...item.swappedFrom, kept: true as const } } : item
          ),
        }
  ),
});

/** Does the workout still hold the swapped-out exercise in that slot? (Making it permanent needs it to.) */
export const workoutHasSlot = (workout: Workout, swap: Pick<SessionSwap, 'blockId' | 'itemIndex' | 'fromId'>): boolean =>
  workout.blocks.find((b) => b.id === swap.blockId)?.items[swap.itemIndex]?.exerciseId === swap.fromId;

/**
 * "Put X in <workout>": the changed workout and the session with the swap
 * marked kept, or null when the workout no longer has the original in that
 * slot (edited meanwhile): then nothing is changed or claimed.
 */
export const keepSwapPlan = (
  workout: Workout,
  session: WorkoutSession,
  swap: SessionSwap,
  now: Date
): { workout: Workout; session: WorkoutSession } | null => {
  const item = session.blocks.find((b) => b.id === swap.blockId)?.items[swap.itemIndex];
  if (!item || item.exerciseId !== swap.toId || !workoutHasSlot(workout, swap)) return null;
  return {
    workout: withSwapMadePermanent(workout, swap, item.target, now),
    session: markSwapKept(session, swap.blockId, swap.itemIndex),
  };
};

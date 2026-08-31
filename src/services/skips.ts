import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { SkipLog, SkipReview, PracticeInstance, CompletionLog } from '../types';
import { getSkipReason } from '../data/skipReasons';
import { buildPendingReview, PendingSkipReview, buildSkipPatterns, SkipPatterns } from './skipLogic';

// =============================================================================
// SKIPS — persistence for the weekly "what got in the way?" review.
//
// Two collections, both under the user:
//   skipLogs    — one doc per answered habit-week (the data)
//   skipReviews — one doc per week, id = the week's Monday (the bookkeeping)
//
// The review docs exist so a dismissed week is never re-asked and a partially
// answered one resumes where it left off. Without them the prompt would return
// every single app open until every habit was answered, which is precisely how
// a well-meaning feature becomes the reason someone uninstalls.
//
// All shortfall maths lives in skipLogic.ts — this file is I/O only.
// =============================================================================

const skipLogsRef = (userId: string) => collection(db, 'users', userId, 'skipLogs');
const reviewRef = (userId: string, weekStart: string) =>
  doc(db, 'users', userId, 'skipReviews', weekStart);

/** Every answered skip, newest first. Pass `sinceDate` to bound the read. */
export const getSkipLogs = async (
  userId: string,
  sinceWeekStart?: string
): Promise<SkipLog[]> => {
  const q = sinceWeekStart
    ? query(
        skipLogsRef(userId),
        where('week_start', '>=', sinceWeekStart),
        orderBy('week_start', 'desc')
      )
    : query(skipLogsRef(userId), orderBy('week_start', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SkipLog);
};

/** The bookkeeping doc for a week, or null if the week was never reviewed. */
export const getSkipReview = async (
  userId: string,
  weekStart: string
): Promise<SkipReview | null> => {
  const snap = await getDoc(reviewRef(userId, weekStart));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SkipReview;
};

/**
 * The review to show right now, or null if there is nothing to ask.
 *
 * Returns null when the week was dismissed — a dismissed week stays dismissed.
 * Re-prompting someone who already said "not now" is how this feature would
 * teach people to ignore it.
 */
export const getPendingSkipReview = async (
  userId: string,
  habits: PracticeInstance[],
  logs: CompletionLog[],
  todayStr: string
): Promise<PendingSkipReview | null> => {
  const pending = buildPendingReview(habits, logs, todayStr);
  if (!pending) return null;

  const review = await getSkipReview(userId, pending.weekStart);
  if (review?.dismissed_at || review?.completed_at) return null;

  // Re-derive with the answered list so a partially finished review resumes
  // rather than restarting from the top.
  return buildPendingReview(habits, logs, todayStr, review?.answered_habit_ids ?? []);
};

/** Record which habits in a week have been dealt with, answered or passed over. */
const markAnswered = async (
  userId: string,
  weekStart: string,
  habitIds: string[]
): Promise<void> => {
  const existing = await getSkipReview(userId, weekStart);
  const merged = [...new Set([...(existing?.answered_habit_ids ?? []), ...habitIds])];
  await setDoc(
    reviewRef(userId, weekStart),
    { week_start: weekStart, answered_habit_ids: merged },
    { merge: true }
  );
};

/**
 * Save one answered shortfall.
 *
 * `reason_kind` is denormalised from the taxonomy at write time so a historical
 * log keeps its internal/external classification even if the reason list is
 * later edited — the split is the product's core claim and must not silently
 * change meaning for past data.
 */
export const saveSkipReason = async (
  userId: string,
  input: {
    habitId: string;
    weekStart: string;
    missedCount: number;
    reasonId: string;
  }
): Promise<void> => {
  const reason = getSkipReason(input.reasonId);
  if (!reason) throw new Error(`Unknown skip reason: ${input.reasonId}`);

  await addDoc(skipLogsRef(userId), {
    user_id: userId,
    habit_id: input.habitId,
    week_start: input.weekStart,
    missed_count: input.missedCount,
    reason_id: reason.id,
    reason_kind: reason.kind,
    created_at: new Date().toISOString(),
  });

  await markAnswered(userId, input.weekStart, [input.habitId]);
};

/** "Not now" — the whole week is closed out and never asked about again. */
export const dismissSkipReview = async (
  userId: string,
  weekStart: string
): Promise<void> => {
  await setDoc(
    reviewRef(userId, weekStart),
    { week_start: weekStart, dismissed_at: new Date().toISOString() },
    { merge: true }
  );
};

/** Mark a week fully handled once the user works through every question. */
export const completeSkipReview = async (
  userId: string,
  weekStart: string
): Promise<void> => {
  await setDoc(
    reviewRef(userId, weekStart),
    { week_start: weekStart, completed_at: new Date().toISOString() },
    { merge: true }
  );
};

/** Reason mix + internal/external split across all answered skips. */
export const getSkipPatterns = async (
  userId: string,
  sinceWeekStart?: string
): Promise<SkipPatterns> =>
  buildSkipPatterns(await getSkipLogs(userId, sinceWeekStart));

/** The same, narrowed to one habit — powers the per-habit detail section. */
export const getSkipPatternsForHabit = async (
  userId: string,
  habitId: string
): Promise<SkipPatterns> => {
  const all = await getSkipLogs(userId);
  return buildSkipPatterns(all.filter((s) => s.habit_id === habitId));
};

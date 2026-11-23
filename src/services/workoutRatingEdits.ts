import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { deleteCompletionLog } from './progress';
import type { CompletionLog } from '../types';

// =============================================================================
// A WORKOUT'S RATING, when the workout is corrected. The rating is a separate
// log from the session, and a rating whose session is gone counts as "a workout
// logged without details" (homeDashboard.sessionsByDay). So deleting a workout
// has to delete its rating too, or it stays on the week as a phantom session.
// =============================================================================

const logsRef = (userId: string) => collection(db, 'users', userId, 'completionLogs');

/** One rating gone: first the habit tick it wrote, then the log with its XP and streak. */
export const removeRating = async (userId: string, logId: string): Promise<void> => {
  // A mirror has no XP and bumps no counters, so it's a plain delete.
  const mirrors = await getDocs(query(logsRef(userId), where('mirror_of', '==', logId)));
  await Promise.all(mirrors.docs.map((d) => deleteDoc(doc(db, 'users', userId, 'completionLogs', d.id))));
  await deleteCompletionLog(userId, logId);
};

/** Every rating of this session. */
export const removeSessionRatings = async (userId: string, sessionId: string): Promise<void> => {
  const ratings = await getDocs(query(logsRef(userId), where('session_id', '==', sessionId)));
  for (const rating of ratings.docs) await removeRating(userId, rating.id);
};

/** A workout logged with only a day and a length: the length corrected. */
export const updateRatedMinutes = async (
  userId: string,
  log: Pick<CompletionLog, 'id' | 'metrics'>,
  minutes: number
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'completionLogs', log.id), {
    metrics: { ...(log.metrics ?? {}), duration_min: minutes },
  });
};

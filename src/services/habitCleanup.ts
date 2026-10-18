import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { PracticeInstance } from '../types';
import { getHabitDefinition } from '../data/practices';
import { isRemovedDefinition, REMOVED_CATEGORY_IDS } from '../data/removedHabits';

// =============================================================================
// HABIT CLEANUP — deletes the user's copies of removed habits.
//
// Money and the food habits Meals replaced were removed outright (decided
// 2026-10-18, with no users yet — data/removedHabits.ts). On each open, Today
// deletes any copy still on the account, together with its check-ins.
//
// XP is NOT recalculated: it is a running total on the user doc
// (totalWillpowerPoints), and the founder's rule is that XP never goes down.
// =============================================================================

/**
 * Which of these habits are removed. A library habit is judged by its catalog
 * definition (following superseded ids, so an old 'trad-budget' copy counts as
 * the Money habit it now resolves to); a custom habit by its own category.
 */
export const selectHabitsToPurge = (habits: PracticeInstance[]): PracticeInstance[] =>
  habits.filter((h) => {
    const def = getHabitDefinition(h.practice_id);
    if (def) return isRemovedDefinition(def);
    return !!h.category_id && REMOVED_CATEGORY_IDS.includes(h.category_id);
  });

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450;

/**
 * Delete every removed habit on the account, active or not, and its check-ins.
 * Returns what was deleted so the caller can cancel their reminders.
 */
export const purgeRemovedHabits = async (userId: string): Promise<PracticeInstance[]> => {
  const snap = await getDocs(collection(db, 'users', userId, 'habits'));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PracticeInstance));
  const doomed = selectHabitsToPurge(all);

  for (const habit of doomed) {
    // Logs first: if this is interrupted, a habit with no logs left is
    // retried next open, whereas logs with no habit would be orphaned for good.
    const logs = await getDocs(
      query(collection(db, 'users', userId, 'completionLogs'), where('reference_id', '==', habit.id))
    );
    for (let i = 0; i < logs.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const log of logs.docs.slice(i, i + BATCH_LIMIT)) {
        batch.delete(doc(db, 'users', userId, 'completionLogs', log.id));
      }
      await batch.commit();
    }
    await deleteDoc(doc(db, 'users', userId, 'habits', habit.id));
  }
  return doomed;
};

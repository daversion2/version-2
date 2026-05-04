import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { createGoal } from './goals';

/**
 * Lazy migration: ensures all active challenges, habits, and program enrollments
 * have a goal_ids tag. Creates a "General" goal and tags orphaned items.
 * Runs once per user (guarded by has_migrated_goals_v2 flag).
 *
 * Returns true if migration ran (caller can show a one-time notice).
 */
export const runGoalsMigration = async (userId: string): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  if (userData?.has_migrated_goals_v2) return false;

  // Find all active challenges, habits, and program enrollments with missing/empty goal_ids
  const [orphanedChallenges, orphanedHabits, orphanedPrograms] = await Promise.all([
    getDocs(query(
      collection(db, 'users', userId, 'challenges'),
      where('status', '==', 'active')
    )),
    getDocs(query(
      collection(db, 'users', userId, 'habits'),
      where('is_active', '==', true)
    )),
    getDocs(query(
      collection(db, 'users', userId, 'programEnrollments'),
      where('status', '==', 'active')
    )),
  ]);

  // Filter to only those missing goal_ids
  const needsMigration = [
    ...orphanedChallenges.docs,
    ...orphanedHabits.docs,
    ...orphanedPrograms.docs,
  ].filter(d => {
    const ids = d.data().goal_ids;
    return !ids || !Array.isArray(ids) || ids.length === 0;
  });

  if (needsMigration.length === 0) {
    // No orphaned items — just set the flag
    await setDoc(userRef, { has_migrated_goals_v2: true }, { merge: true });
    return false;
  }

  // Create a "General" goal for this user
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 90);
  const endDate = `${thirtyDaysOut.getFullYear()}-${String(thirtyDaysOut.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysOut.getDate()).padStart(2, '0')}`;

  const generalGoalId = await createGoal(userId, {
    name: 'General',
    description: 'Automatically created to organize existing items.',
    end_date: endDate,
  });

  // Batch-update all orphaned items with the general goal id
  const batch = writeBatch(db);
  for (const d of needsMigration) {
    batch.update(d.ref, { goal_ids: [generalGoalId] });
  }
  batch.update(userRef, { has_migrated_goals_v2: true });
  await batch.commit();

  return true;
};

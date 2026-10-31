import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { AppActivity, ProfileActivity, profileActivityPatch } from './homeDashboard';

// Kept apart from services/users.ts, which pulls in React Native through
// sign-in and so can't be loaded by jest.

/**
 * Bring the user doc in line with the apps (homeDashboard.profileActivityPatch),
 * worked out inside a transaction from the doc as it is NOW. Today's copy of the
 * profile can be a moment old, and a patch built from it could undo the streak
 * a rating has just stamped. Returns whether anything was written.
 */
export const syncProfileActivity = async (
  userId: string,
  activity: AppActivity,
  today: string
): Promise<boolean> => {
  const ref = doc(db, 'users', userId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const patch = profileActivityPatch(activity, today, (snap.exists() ? snap.data() : {}) as ProfileActivity);
    if (!patch) return false;
    tx.set(ref, patch, { merge: true });
    return true;
  });
};

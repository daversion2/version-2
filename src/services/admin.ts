import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { LibraryChallenge, FunFact } from '../types';

// Collection references
const libraryRef = () => collection(db, 'challengeLibrary');
const funFactsRef = () => collection(db, 'funFacts');
const usersRef = () => collection(db, 'users');

// ============================================================================
// LIBRARY CHALLENGE CRUD
// ============================================================================

/**
 * Create a new library challenge (admin only)
 */
export const createLibraryChallenge = async (
  data: Omit<LibraryChallenge, 'id'>
): Promise<string> => {
  // Filter out undefined values (Firestore doesn't accept undefined)
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(libraryRef(), cleanData);
  return docRef.id;
};

/**
 * Update an existing library challenge (admin only)
 */
export const updateLibraryChallenge = async (
  id: string,
  updates: Partial<LibraryChallenge>
): Promise<void> => {
  const ref = doc(db, 'challengeLibrary', id);

  // Filter out undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await updateDoc(ref, cleanUpdates);
};

/**
 * Delete a library challenge (admin only)
 */
export const deleteLibraryChallenge = async (id: string): Promise<void> => {
  const ref = doc(db, 'challengeLibrary', id);
  await deleteDoc(ref);
};

/**
 * Get a single library challenge by ID
 */
export const getLibraryChallengeById = async (
  id: string
): Promise<LibraryChallenge | null> => {
  const ref = doc(db, 'challengeLibrary', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LibraryChallenge;
};

/**
 * Get all library challenges (for admin list view)
 */
export const getAllLibraryChallenges = async (): Promise<LibraryChallenge[]> => {
  const snap = await getDocs(libraryRef());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LibraryChallenge));
};

// ============================================================================
// FUN FACTS CRUD
// ============================================================================

/**
 * Create a new fun fact (admin only)
 */
export const createFunFact = async (
  data: Omit<FunFact, 'id' | 'created_at'>
): Promise<string> => {
  const factData = {
    ...data,
    created_at: new Date().toISOString(),
  };

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(factData).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(funFactsRef(), cleanData);
  return docRef.id;
};

/**
 * Update an existing fun fact (admin only)
 */
export const updateFunFact = async (
  id: string,
  updates: Partial<FunFact>
): Promise<void> => {
  const ref = doc(db, 'funFacts', id);

  // Filter out undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await updateDoc(ref, cleanUpdates);
};

/**
 * Delete a fun fact (admin only)
 */
export const deleteFunFact = async (id: string): Promise<void> => {
  const ref = doc(db, 'funFacts', id);
  await deleteDoc(ref);
};

/**
 * Reorder fun facts by updating their order field
 */
export const reorderFunFacts = async (
  orderedIds: string[]
): Promise<void> => {
  const batch = writeBatch(db);

  orderedIds.forEach((id, index) => {
    const ref = doc(db, 'funFacts', id);
    batch.update(ref, { order: index + 1 });
  });

  await batch.commit();
};

/**
 * Get the next order number for a new fun fact
 */
export const getNextFunFactOrder = async (): Promise<number> => {
  const q = query(funFactsRef(), orderBy('order', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) return 1;
  const highestOrder = snap.docs[0].data().order || 0;
  return highestOrder + 1;
};

// ============================================================================
// ANALYTICS / STATS
// ============================================================================

/**
 * Get user statistics for admin dashboard
 */
export const getUserStats = async (): Promise<{
  total: number;
  active7d: number;
  active30d: number;
}> => {
  // Get total user count
  const countSnap = await getCountFromServer(usersRef());
  const total = countSnap.data().count;

  // Get active users in last 7 and 30 days
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Query for active users (users with lastActivityDate within range)
  const active7dQuery = query(
    usersRef(),
    where('lastActivityDate', '>=', sevenDaysAgoStr)
  );
  const active7dSnap = await getCountFromServer(active7dQuery);
  const active7d = active7dSnap.data().count;

  const active30dQuery = query(
    usersRef(),
    where('lastActivityDate', '>=', thirtyDaysAgoStr)
  );
  const active30dSnap = await getCountFromServer(active30dQuery);
  const active30d = active30dSnap.data().count;

  return { total, active7d, active30d };
};

/**
 * Get challenge library statistics
 */
export const getLibraryStats = async (): Promise<{
  totalChallenges: number;
  byCategory: Record<string, number>;
  byBarrierType: Record<string, number>;
}> => {
  const snap = await getDocs(libraryRef());
  const challenges = snap.docs.map((d) => d.data() as LibraryChallenge);

  const byCategory: Record<string, number> = {};
  const byBarrierType: Record<string, number> = {};

  challenges.forEach((c) => {
    // Count by category
    const cat = c.category || 'Unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    // Count by barrier type
    if (c.barrier_type) {
      byBarrierType[c.barrier_type] = (byBarrierType[c.barrier_type] || 0) + 1;
    }
  });

  return {
    totalChallenges: challenges.length,
    byCategory,
    byBarrierType,
  };
};

/**
 * Get today's challenge completions count (across all users)
 * Note: This queries all users' completionLogs subcollections
 * For better performance at scale, consider using Cloud Functions to maintain aggregates
 */
export const getTodaysChallengeCount = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];

  // Get all users
  const usersSnap = await getDocs(usersRef());
  let count = 0;

  // For each user, check their completionLogs for today
  // Note: This is inefficient at scale - consider using Cloud Functions aggregation
  for (const userDoc of usersSnap.docs) {
    const logsRef = collection(db, 'users', userDoc.id, 'completionLogs');
    const logsQuery = query(
      logsRef,
      where('date', '==', today),
      where('type', '==', 'challenge')
    );
    const logsSnap = await getDocs(logsQuery);
    count += logsSnap.size;
  }

  return count;
};

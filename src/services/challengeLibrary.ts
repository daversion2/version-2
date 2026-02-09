import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { LibraryChallenge } from '../types';

/**
 * Public challenge library - curated example challenges users can try.
 * Stored in Firestore at the root level (not per-user).
 *
 * Firestore structure: challengeLibrary/{challengeId}
 */

const libraryRef = collection(db, 'challengeLibrary');

/**
 * Get all challenges from the library
 */
export const getLibraryChallenges = async (): Promise<LibraryChallenge[]> => {
  const snap = await getDocs(query(libraryRef, orderBy('name')));
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LibraryChallenge[];
};

/**
 * Get challenges filtered by category
 */
export const getLibraryChallengesByCategory = async (
  category: string
): Promise<LibraryChallenge[]> => {
  const q = query(
    libraryRef,
    where('category', '==', category),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LibraryChallenge[];
};

/**
 * Get challenges filtered by difficulty
 */
export const getLibraryChallengesByDifficulty = async (
  difficulty: number
): Promise<LibraryChallenge[]> => {
  const q = query(
    libraryRef,
    where('difficulty', '==', difficulty),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LibraryChallenge[];
};

/**
 * Get unique categories from the library
 */
export const getLibraryCategories = async (): Promise<string[]> => {
  const challenges = await getLibraryChallenges();
  const categories = new Set(challenges.map((c) => c.category));
  return Array.from(categories).sort();
};

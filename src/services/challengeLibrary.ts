import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { LibraryChallenge, BarrierType, TimeCategory, ActionType } from '../types';
import {
  TIME_CATEGORIES,
  BARRIER_TYPES,
  ACTION_CATEGORIES,
  SAMPLE_CHALLENGES,
  getTimeCategoryFromMinutes,
} from '../constants/challengeLibrary';

/**
 * Public challenge library - curated example challenges users can try.
 * Stored in Firestore at the root level (not per-user).
 *
 * Firestore structure: challengeLibrary/{challengeId}
 */

const libraryRef = collection(db, 'challengeLibrary');

// =============================================================================
// FILTER INTERFACE
// =============================================================================

export interface ChallengeFilters {
  actionType?: ActionType | null; // Primary filter: 'complete' (Start) or 'resist' (Stop)
  barrierType?: BarrierType | null; // @deprecated - kept for backward compatibility
  timeCategory?: TimeCategory | null;
  category?: string | null; // Life domain (Physical, Mental, etc.)
  beginnerFriendly?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize a challenge from Firestore, computing derived fields if needed
 */
const normalizeChallenge = (challenge: LibraryChallenge): LibraryChallenge => {
  // Compute time_category if not present but time_required_minutes is
  if (!challenge.time_category && challenge.time_required_minutes) {
    challenge.time_category = getTimeCategoryFromMinutes(
      challenge.time_required_minutes
    ) as TimeCategory;
  }

  // Compute beginner_friendly if not explicitly set
  if (challenge.beginner_friendly === undefined) {
    challenge.beginner_friendly = challenge.difficulty <= 2;
  }

  return challenge;
};

/**
 * Apply filters to a list of challenges (client-side filtering)
 */
const applyFilters = (
  challenges: LibraryChallenge[],
  filters?: ChallengeFilters
): LibraryChallenge[] => {
  if (!filters) return challenges;

  return challenges.filter((c) => {
    // Filter by action type (primary filter for Start/Stop)
    if (filters.actionType && c.action_type !== filters.actionType) {
      return false;
    }

    // Filter by barrier type (deprecated but kept for compatibility)
    if (filters.barrierType && c.barrier_type !== filters.barrierType) {
      return false;
    }

    // Filter by time category
    if (filters.timeCategory && c.time_category !== filters.timeCategory) {
      return false;
    }

    // Filter by life domain category
    if (filters.category && c.category !== filters.category) {
      return false;
    }

    // Filter by beginner friendly
    if (filters.beginnerFriendly && !c.beginner_friendly) {
      return false;
    }

    return true;
  });
};

// =============================================================================
// MAIN QUERY FUNCTIONS
// =============================================================================

/**
 * Get all challenges from the library with optional filters
 */
export const getLibraryChallenges = async (
  filters?: ChallengeFilters
): Promise<LibraryChallenge[]> => {
  let challenges: LibraryChallenge[] = [];

  try {
    const snap = await getDocs(query(libraryRef, orderBy('name')));
    challenges = snap.docs.map((doc) =>
      normalizeChallenge({
        id: doc.id,
        ...doc.data(),
      } as LibraryChallenge)
    );
  } catch (error) {
    console.warn('Failed to fetch from Firestore, using sample challenges:', error);
  }

  // If no challenges in Firestore (or fetch failed), return sample challenges for development
  if (challenges.length === 0) {
    console.log('Using sample challenges (Firestore empty or unavailable)');
    challenges = SAMPLE_CHALLENGES.map((c) =>
      normalizeChallenge(c as unknown as LibraryChallenge)
    );
  }

  return applyFilters(challenges, filters);
};

/**
 * Get challenges filtered by action type (Start/Stop)
 * This is the primary filter for browsing challenges.
 */
export const getChallengesByActionType = async (
  actionType: ActionType,
  additionalFilters?: Omit<ChallengeFilters, 'actionType'>
): Promise<LibraryChallenge[]> => {
  return getLibraryChallenges({
    ...additionalFilters,
    actionType,
  });
};

/**
 * Get challenges filtered by barrier type
 * @deprecated Use getChallengesByActionType instead
 */
export const getChallengesByBarrier = async (
  barrierType: BarrierType,
  additionalFilters?: Omit<ChallengeFilters, 'barrierType'>
): Promise<LibraryChallenge[]> => {
  return getLibraryChallenges({
    ...additionalFilters,
    barrierType,
  });
};

/**
 * Get beginner-friendly challenges
 */
export const getBeginnerChallenges = async (
  filters?: Omit<ChallengeFilters, 'beginnerFriendly'>
): Promise<LibraryChallenge[]> => {
  return getLibraryChallenges({
    ...filters,
    beginnerFriendly: true,
  });
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
  let challenges = snap.docs.map((doc) =>
    normalizeChallenge({
      id: doc.id,
      ...doc.data(),
    } as LibraryChallenge)
  );

  // Fallback to sample challenges filtered by category
  if (challenges.length === 0) {
    challenges = SAMPLE_CHALLENGES.filter((c) => c.category === category).map(
      (c) => normalizeChallenge(c as unknown as LibraryChallenge)
    );
  }

  return challenges;
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
  let challenges = snap.docs.map((doc) =>
    normalizeChallenge({
      id: doc.id,
      ...doc.data(),
    } as LibraryChallenge)
  );

  // Fallback to sample challenges filtered by difficulty
  if (challenges.length === 0) {
    challenges = SAMPLE_CHALLENGES.filter((c) => c.difficulty === difficulty).map(
      (c) => normalizeChallenge(c as unknown as LibraryChallenge)
    );
  }

  return challenges;
};

/**
 * Get unique categories from the library
 */
export const getLibraryCategories = async (): Promise<string[]> => {
  const challenges = await getLibraryChallenges();
  const categories = new Set(challenges.map((c) => c.category));
  return Array.from(categories).sort();
};

// =============================================================================
// COUNT FUNCTIONS (for barrier cards)
// =============================================================================

/**
 * Get count of challenges per action type (Start/Stop)
 * Returns a map with keys 'start' and 'stop' -> count
 * Respects any active filters (time, category)
 */
export const getActionTypeCounts = async (
  filters?: Omit<ChallengeFilters, 'actionType'>
): Promise<Record<string, number>> => {
  const challenges = await getLibraryChallenges(filters);

  const counts: Record<string, number> = {
    start: 0, // Maps to action_type 'complete'
    stop: 0,  // Maps to action_type 'resist'
  };

  // Count challenges per action type
  challenges.forEach((c) => {
    if (c.action_type === 'complete') {
      counts.start++;
    } else if (c.action_type === 'resist') {
      counts.stop++;
    }
  });

  return counts;
};

/**
 * Get count of challenges per barrier type
 * Returns a map of barrier_type -> count
 * Respects any active filters (time, category)
 * @deprecated Use getActionTypeCounts instead
 */
export const getBarrierTypeCounts = async (
  filters?: Omit<ChallengeFilters, 'barrierType'>
): Promise<Record<string, number>> => {
  const challenges = await getLibraryChallenges(filters);

  const counts: Record<string, number> = {};

  // Initialize all barrier types with 0
  Object.keys(BARRIER_TYPES).forEach((key) => {
    counts[key] = 0;
  });

  // Count challenges per barrier type
  challenges.forEach((c) => {
    if (c.barrier_type && counts[c.barrier_type] !== undefined) {
      counts[c.barrier_type]++;
    }
  });

  return counts;
};

/**
 * Get count of challenges per time category
 */
export const getTimeCategoryCounts = async (
  filters?: Omit<ChallengeFilters, 'timeCategory'>
): Promise<Record<string, number>> => {
  const challenges = await getLibraryChallenges(filters);

  const counts: Record<string, number> = {};

  // Initialize all time categories with 0
  Object.keys(TIME_CATEGORIES).forEach((key) => {
    counts[key] = 0;
  });

  // Count challenges per time category
  challenges.forEach((c) => {
    if (c.time_category && counts[c.time_category] !== undefined) {
      counts[c.time_category]++;
    }
  });

  return counts;
};

/**
 * Get total count of challenges matching filters
 */
export const getChallengeCount = async (
  filters?: ChallengeFilters
): Promise<number> => {
  const challenges = await getLibraryChallenges(filters);
  return challenges.length;
};

// =============================================================================
// GROUPING FUNCTIONS (for displaying challenges by difficulty)
// =============================================================================

export interface GroupedChallenges {
  beginner: LibraryChallenge[];
  moderate: LibraryChallenge[];
  advanced: LibraryChallenge[];
}

/**
 * Group challenges by difficulty level
 * Beginner: 1-2, Moderate: 3, Advanced: 4-5
 */
export const groupChallengesByDifficulty = (
  challenges: LibraryChallenge[]
): GroupedChallenges => {
  return {
    beginner: challenges.filter((c) => c.difficulty <= 2),
    moderate: challenges.filter((c) => c.difficulty === 3),
    advanced: challenges.filter((c) => c.difficulty >= 4),
  };
};

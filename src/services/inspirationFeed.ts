import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { InspirationFeedEntry, DifficultyTier } from '../types';

// Inspiration feed is a top-level collection shared across all users
const feedRef = () => collection(db, 'inspirationFeed');

/**
 * Map actual difficulty (1-5) to display tier
 * Only difficulties 3+ are shown in the feed
 */
const getDifficultyTier = (difficulty: number): DifficultyTier | null => {
  if (difficulty < 3) return null; // Too easy to inspire
  if (difficulty === 3) return 'moderate';
  if (difficulty === 4) return 'hard';
  return 'very_hard';
};

/**
 * Add jitter to timestamp for privacy (±30 minutes)
 */
const jitterTimestamp = (timestamp: Date): Date => {
  const jitterMs = (Math.random() - 0.5) * 2 * 30 * 60 * 1000; // ±30 min
  return new Date(timestamp.getTime() + jitterMs);
};

/**
 * Truncate challenge name to 50 chars for teaser
 */
const createTeaser = (name: string): string => {
  if (name.length <= 50) return name;
  return name.substring(0, 47) + '...';
};

// ============================================================================
// FEED ENTRY OPERATIONS
// ============================================================================

/**
 * Create a feed entry when a user completes a challenge
 * Only creates entry if difficulty is 3+ and user has opted in
 */
export const createFeedEntry = async (
  userId: string,
  categoryId: string,
  categoryName: string,
  difficulty: number,
  challengeName: string,
  shareTeaser: boolean = true
): Promise<string | null> => {
  // Only include difficulty 3+ challenges
  const tier = getDifficultyTier(difficulty);
  if (!tier) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
  const displayTimestamp = jitterTimestamp(now);

  const entryData: Omit<InspirationFeedEntry, 'id'> = {
    user_id: userId,
    category_id: categoryId,
    category_name: categoryName,
    difficulty_tier: tier,
    completed_at: now.toISOString(),
    display_timestamp: displayTimestamp.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  // Only include teaser if user opted in
  if (shareTeaser) {
    entryData.challenge_teaser = createTeaser(challengeName);
  }

  const docRef = await addDoc(feedRef(), entryData);
  return docRef.id;
};

/**
 * Get inspiration feed entries for display
 * Excludes the current user's entries and expired entries
 * Returns shuffled (not chronological) to protect privacy
 */
export const getInspirationFeed = async (
  currentUserId: string,
  maxEntries: number = 50
): Promise<InspirationFeedEntry[]> => {
  const now = new Date().toISOString();

  // We can't do complex queries in Firestore, so fetch recent entries and filter
  const snap = await getDocs(feedRef());

  const entries = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as InspirationFeedEntry))
    // Filter out expired entries
    .filter((e) => e.expires_at > now)
    // Filter out current user's entries
    .filter((e) => e.user_id !== currentUserId);

  // Shuffle the array for privacy (random order prevents identification)
  const shuffled = entries.sort(() => Math.random() - 0.5);

  // Return limited number of entries
  return shuffled.slice(0, maxEntries);
};

/**
 * Get feed entries filtered by category
 */
export const getInspirationFeedByCategory = async (
  currentUserId: string,
  categoryId: string,
  maxEntries: number = 50
): Promise<InspirationFeedEntry[]> => {
  const allEntries = await getInspirationFeed(currentUserId, 200);
  return allEntries
    .filter((e) => e.category_id === categoryId)
    .slice(0, maxEntries);
};

/**
 * Get feed entries filtered by difficulty tier
 */
export const getInspirationFeedByDifficulty = async (
  currentUserId: string,
  tier: DifficultyTier,
  maxEntries: number = 50
): Promise<InspirationFeedEntry[]> => {
  const allEntries = await getInspirationFeed(currentUserId, 200);
  return allEntries.filter((e) => e.difficulty_tier === tier).slice(0, maxEntries);
};

/**
 * Clean up expired feed entries
 * This should be called periodically (e.g., by a cloud function)
 */
export const cleanExpiredFeedEntries = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snap = await getDocs(feedRef());

  let deletedCount = 0;
  for (const document of snap.docs) {
    const data = document.data() as InspirationFeedEntry;
    if (data.expires_at < now) {
      await deleteDoc(document.ref);
      deletedCount++;
    }
  }

  return deletedCount;
};

/**
 * Get count of active feed entries (for stats/debugging)
 */
export const getActiveFeedCount = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snap = await getDocs(feedRef());

  return snap.docs.filter((d) => {
    const data = d.data() as InspirationFeedEntry;
    return data.expires_at > now;
  }).length;
};

/**
 * Delete all feed entries for a specific user
 * Useful if user opts out or deletes account
 */
export const deleteUserFeedEntries = async (userId: string): Promise<number> => {
  const q = query(feedRef(), where('user_id', '==', userId));
  const snap = await getDocs(q);

  let deletedCount = 0;
  for (const document of snap.docs) {
    await deleteDoc(document.ref);
    deletedCount++;
  }

  return deletedCount;
};

/**
 * Format relative time for display
 */
export const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return `${diffDays} days ago`;
};

/**
 * Get display text for difficulty tier
 */
export const getDifficultyTierDisplay = (tier: DifficultyTier): string => {
  switch (tier) {
    case 'moderate':
      return 'MODERATE';
    case 'hard':
      return 'HARD';
    case 'very_hard':
      return 'VERY HARD';
  }
};

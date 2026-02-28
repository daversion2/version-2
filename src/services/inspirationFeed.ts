import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { InspirationFeedEntry, DifficultyTier, FeedEntryType, FistBump, User } from '../types';

// Inspiration feed is a top-level collection shared across all users
const feedRef = () => collection(db, 'inspirationFeed');
const fistBumpsRef = () => collection(db, 'fistBumps');

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
  shareTeaser: boolean = true,
  categoryIcon?: string,
  username?: string,
  streakTier?: string,
  streakDays?: number,
  willpowerLevel?: number,
  willpowerTitle?: string
): Promise<string | null> => {
  // Only include difficulty 3+ challenges
  const tier = getDifficultyTier(difficulty);
  if (!tier) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
  const displayTimestamp = jitterTimestamp(now);

  const entryData: Omit<InspirationFeedEntry, 'id'> = {
    user_id: userId,
    username: username,
    category_id: categoryId,
    category_name: categoryName,
    category_icon: categoryIcon,
    difficulty_tier: tier,
    completed_at: now.toISOString(),
    display_timestamp: displayTimestamp.toISOString(),
    expires_at: expiresAt.toISOString(),
    entry_type: 'challenge_completion',
    streak_tier: streakTier,
    streak_days: streakDays,
    willpower_level: willpowerLevel,
    willpower_title: willpowerTitle,
    fist_bump_count: 0,
  };

  // Only include teaser if user opted in
  if (shareTeaser) {
    entryData.challenge_teaser = createTeaser(challengeName);
  }

  const docRef = await addDoc(feedRef(), entryData);
  return docRef.id;
};

/**
 * Create a milestone feed entry (streak tier, level up, or repeat milestone)
 * Same privacy model as challenge entries: jittered timestamp, 48-hour expiry
 */
export const createMilestoneFeedEntry = async (
  userId: string,
  username: string | undefined,
  entryType: FeedEntryType,
  milestoneValue?: number,
  milestoneChallengeName?: string,
  streakDays?: number,
  streakTier?: string,
  willpowerLevel?: number,
  willpowerTitle?: string
): Promise<string | null> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const displayTimestamp = jitterTimestamp(now);

  const entryData: Omit<InspirationFeedEntry, 'id'> = {
    user_id: userId,
    username: username,
    category_id: '',
    category_name: '',
    difficulty_tier: 'moderate', // Placeholder, not displayed for milestones
    completed_at: now.toISOString(),
    display_timestamp: displayTimestamp.toISOString(),
    expires_at: expiresAt.toISOString(),
    entry_type: entryType,
    streak_tier: streakTier,
    streak_days: streakDays,
    willpower_level: willpowerLevel,
    willpower_title: willpowerTitle,
    milestone_value: milestoneValue,
    milestone_challenge_name: milestoneChallengeName,
    fist_bump_count: 0,
  };

  const docRef = await addDoc(feedRef(), entryData);
  return docRef.id;
};

/**
 * Create a shared feed entry when both buddy challenge partners complete.
 * "[inviter] and [partner] crushed [challenge] together"
 */
export const createBuddyCompletionFeedEntry = async (
  inviterId: string,
  inviterUsername: string | undefined,
  partnerUsername: string | undefined,
  challengeName: string,
  categoryId: string,
  categoryName: string,
): Promise<string | null> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const displayTimestamp = jitterTimestamp(now);

  const entryData: Omit<InspirationFeedEntry, 'id'> = {
    user_id: inviterId,
    username: inviterUsername,
    category_id: categoryId,
    category_name: categoryName,
    difficulty_tier: 'moderate',
    completed_at: now.toISOString(),
    display_timestamp: displayTimestamp.toISOString(),
    expires_at: expiresAt.toISOString(),
    entry_type: 'buddy_completion',
    buddy_inviter_username: inviterUsername,
    buddy_partner_username: partnerUsername,
    buddy_challenge_name: challengeName,
    fist_bump_count: 0,
  };

  const docRef = await addDoc(feedRef(), entryData);
  return docRef.id;
};

/**
 * Fetch usernames for a list of user IDs
 * Returns a map of userId -> username
 */
const fetchUsernames = async (userIds: string[]): Promise<Record<string, string | undefined>> => {
  const usernames: Record<string, string | undefined> = {};
  const uniqueIds = [...new Set(userIds)];

  const userPromises = uniqueIds.map(async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        usernames[userId] = userData.username;
      }
    } catch {
      // Ignore errors for individual user fetches
    }
  });

  await Promise.all(userPromises);
  return usernames;
};

/**
 * Get inspiration feed entries for display
 * Excludes the current user's entries and expired entries
 * Returns sorted by most recent first
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
    .filter((e) => e.expires_at > now);

  // Fetch usernames for all entries (to get current usernames and fill in missing ones)
  const userIds = entries.map((e) => e.user_id);
  const usernames = await fetchUsernames(userIds);

  // Add/update usernames to entries
  const entriesWithUsernames = entries.map((entry) => ({
    ...entry,
    username: usernames[entry.user_id] || entry.username,
  }));

  // Sort by most recent first (using completed_at timestamp)
  const sorted = entriesWithUsernames.sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  // Return limited number of entries
  return sorted.slice(0, maxEntries);
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
 * Update a feed entry with a completion message
 * Called after user optionally writes a message post-completion
 */
export const updateFeedEntryMessage = async (
  entryId: string,
  message: string
): Promise<void> => {
  const trimmed = message.trim().substring(0, 150);
  if (!trimmed) return;
  const entryRef = doc(db, 'inspirationFeed', entryId);
  await updateDoc(entryRef, { completion_message: trimmed });
};

// ============================================================================
// FIST BUMP OPERATIONS
// ============================================================================

/**
 * Send a fist bump on a feed entry
 * One bump per user per entry — checks for existing bump first
 */
export const sendFistBump = async (
  feedEntryId: string,
  senderId: string
): Promise<boolean> => {
  // Check if already bumped
  const q = query(
    fistBumpsRef(),
    where('feed_entry_id', '==', feedEntryId),
    where('sender_id', '==', senderId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return false; // Already bumped

  await addDoc(fistBumpsRef(), {
    feed_entry_id: feedEntryId,
    sender_id: senderId,
    created_at: new Date().toISOString(),
  });

  // Increment count on the feed entry
  const entryRef = doc(db, 'inspirationFeed', feedEntryId);
  await updateDoc(entryRef, { fist_bump_count: increment(1) });
  return true;
};

/**
 * Remove a fist bump from a feed entry
 */
export const removeFistBump = async (
  feedEntryId: string,
  senderId: string
): Promise<boolean> => {
  const q = query(
    fistBumpsRef(),
    where('feed_entry_id', '==', feedEntryId),
    where('sender_id', '==', senderId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;

  for (const document of snap.docs) {
    await deleteDoc(document.ref);
  }

  // Decrement count on the feed entry (floor at 0)
  const entryRef = doc(db, 'inspirationFeed', feedEntryId);
  await updateDoc(entryRef, { fist_bump_count: increment(-1) });
  return true;
};

/**
 * Get which feed entry IDs a user has fist-bumped
 * Used to set initial toggle state when loading the feed
 */
export const getUserFistBumps = async (
  userId: string,
  entryIds: string[]
): Promise<Set<string>> => {
  if (entryIds.length === 0) return new Set();

  const q = query(
    fistBumpsRef(),
    where('sender_id', '==', userId)
  );
  const snap = await getDocs(q);

  const bumpedEntryIds = new Set<string>();
  for (const document of snap.docs) {
    const data = document.data();
    if (entryIds.includes(data.feed_entry_id)) {
      bumpedEntryIds.add(data.feed_entry_id);
    }
  }
  return bumpedEntryIds;
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

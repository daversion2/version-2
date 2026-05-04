import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { getRandomRewardMessage, getActiveRewardMessages } from './rewardMessages';
import { getActiveGoals, computeGoalFollowThrough } from './goals';
import { Goal } from '../types';

export interface UserRewardMessage {
  id: string;
  text: string;
  category: 'identity' | 'effort' | 'contrast' | 'general' | 'custom';
  is_favorite: boolean;
  is_custom: boolean;
  source_id?: string;
  created_at: string;
}

const userRewardMessagesRef = (userId: string) =>
  collection(db, 'users', userId, 'rewardMessages');

// Session cache
let cachedUserId: string | null = null;
let cachedMessages: UserRewardMessage[] | null = null;

export const clearUserRewardMessageCache = (): void => {
  cachedUserId = null;
  cachedMessages = null;
};

/**
 * Fetch all reward messages in the user's personal pool.
 * Session-cached per user.
 */
export const getUserRewardMessages = async (
  userId: string
): Promise<UserRewardMessage[]> => {
  if (cachedMessages !== null && cachedUserId === userId) return cachedMessages;

  const snap = await getDocs(query(userRewardMessagesRef(userId)));
  cachedMessages = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as UserRewardMessage[];
  cachedUserId = userId;

  return cachedMessages;
};

/**
 * Add a message to the user's pool (custom or from global).
 */
export const addUserRewardMessage = async (
  userId: string,
  data: {
    text: string;
    category: UserRewardMessage['category'];
    is_custom: boolean;
    source_id?: string;
    is_favorite?: boolean;
  }
): Promise<string> => {
  // Duplicate prevention for global messages
  if (data.source_id) {
    const existing = await getUserRewardMessages(userId);
    if (existing.some((m) => m.source_id === data.source_id)) {
      throw new Error('This message is already in your pool.');
    }
  }

  const docRef = await addDoc(userRewardMessagesRef(userId), {
    text: data.text,
    category: data.category,
    is_favorite: data.is_favorite ?? false,
    is_custom: data.is_custom,
    ...(data.source_id ? { source_id: data.source_id } : {}),
    created_at: new Date().toISOString(),
  });

  clearUserRewardMessageCache();
  return docRef.id;
};

/**
 * Remove a message from the user's pool.
 */
export const removeUserRewardMessage = async (
  userId: string,
  messageId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId, 'rewardMessages', messageId));
  clearUserRewardMessageCache();
};

/**
 * Toggle favorite status on a user message.
 */
export const toggleFavorite = async (
  userId: string,
  messageId: string,
  isFavorite: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'rewardMessages', messageId), {
    is_favorite: isFavorite,
  });
  clearUserRewardMessageCache();
};

/**
 * Bulk-add selected global messages to user pool (used by onboarding).
 * All seeded messages are marked as favorites.
 */
export const seedUserRewardMessagesFromGlobals = async (
  userId: string,
  selectedIds: string[]
): Promise<void> => {
  const globals = await getActiveRewardMessages();
  const selected = globals.filter((g) => selectedIds.includes(g.id));

  for (const msg of selected) {
    await addDoc(userRewardMessagesRef(userId), {
      text: msg.text,
      category: msg.category,
      is_favorite: true,
      is_custom: false,
      source_id: msg.id,
      created_at: new Date().toISOString(),
    });
  }

  clearUserRewardMessageCache();
};

/**
 * Generate identity-framing messages from the user's goal CBT data.
 * These are generated on-the-fly, not stored in Firestore.
 */
const generateIdentityMessages = async (userId: string): Promise<string[]> => {
  const messages: string[] = [];
  try {
    const goals = await getActiveGoals(userId);
    for (const goal of goals) {
      // Identity statement (Q16)
      if (goal.identity_statement) {
        messages.push(
          `You said you're becoming "${goal.identity_statement}". This is proof.`
        );
      }
      // Inner voice counter-argument (Q6)
      if (goal.inner_voice_challenge && goal.inner_voice_response) {
        messages.push(
          `Your inner voice said "${goal.inner_voice_challenge}". You said "${goal.inner_voice_response}". You were right.`
        );
      }
      // Confidence baseline (Q3)
      if (goal.confidence_baseline) {
        messages.push(
          `You started at ${goal.confidence_baseline}/10 confidence. Look at you now.`
        );
      }
      // Follow-through stats
      try {
        const ft = await computeGoalFollowThrough(userId, goal.id);
        if (ft.totalCommitments >= 3) {
          const pct = Math.round(ft.followThroughRate * 100);
          messages.push(
            `${goal.name}: ${ft.keptCommitments}/${ft.totalCommitments} commitments kept. ${pct}% follow-through.`
          );
        }
      } catch {
        // Skip if follow-through fails
      }
    }
  } catch {
    // Return empty if goals fail to load
  }
  return messages;
};

/**
 * Get a personalized reward message for the user.
 * - 40% chance: identity-framing message from goal CBT data
 * - Otherwise: weighted random from user pool (favorites 3x weight)
 * - Falls back to global pool, then hardcoded default.
 */
export const getPersonalizedRewardMessage = async (
  userId: string
): Promise<{ text: string }> => {
  try {
    // 40% chance of identity-framing message
    if (Math.random() < 0.4) {
      const identityMessages = await generateIdentityMessages(userId);
      if (identityMessages.length > 0) {
        const pick = identityMessages[Math.floor(Math.random() * identityMessages.length)];
        return { text: pick };
      }
    }

    const messages = await getUserRewardMessages(userId);

    if (messages.length > 0) {
      // Build weighted pool: favorites appear 3x
      const weighted: UserRewardMessage[] = [];
      for (const msg of messages) {
        weighted.push(msg);
        if (msg.is_favorite) {
          weighted.push(msg);
          weighted.push(msg);
        }
      }
      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      return { text: pick.text };
    }

    // Fall back to identity messages if no pool messages
    const identityMessages = await generateIdentityMessages(userId);
    if (identityMessages.length > 0) {
      const pick = identityMessages[Math.floor(Math.random() * identityMessages.length)];
      return { text: pick };
    }

    // Fall back to global pool
    const globalMsg = await getRandomRewardMessage();
    if (globalMsg) return { text: globalMsg.text };
  } catch (err) {
    console.warn('Failed to get personalized reward message:', err);
    // Try global fallback
    try {
      const globalMsg = await getRandomRewardMessage();
      if (globalMsg) return { text: globalMsg.text };
    } catch {
      // Fall through to hardcoded
    }
  }

  return { text: 'One more proof point.' };
};

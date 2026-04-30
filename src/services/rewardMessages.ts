import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface RewardMessage {
  id: string;
  text: string;
  category: 'identity' | 'effort' | 'contrast' | 'general';
  active: boolean;
  created_at: string;
  updated_at: string;
}

const rewardMessagesRef = () => collection(db, 'rewardMessages');

// In-memory session cache
let cachedMessages: RewardMessage[] | null = null;

/**
 * Fetch all active reward messages. Caches in memory for the session.
 * Call clearRewardMessageCache() to force refresh.
 */
export const getActiveRewardMessages = async (): Promise<RewardMessage[]> => {
  if (cachedMessages !== null) return cachedMessages;

  const q = query(rewardMessagesRef(), where('active', '==', true));
  const snapshot = await getDocs(q);
  cachedMessages = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as RewardMessage[];

  return cachedMessages;
};

/**
 * Get a random reward message. Equal weight for now.
 * Structure supports future weighted/favorite selection.
 */
export const getRandomRewardMessage = async (): Promise<RewardMessage | null> => {
  const messages = await getActiveRewardMessages();
  if (messages.length === 0) return null;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
};

/**
 * Clear the in-memory cache (e.g., after admin edits).
 */
export const clearRewardMessageCache = (): void => {
  cachedMessages = null;
};

// ============================================================================
// ADMIN CRUD (for future admin panel)
// ============================================================================

export const createRewardMessage = async (
  text: string,
  category: RewardMessage['category']
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(rewardMessagesRef(), {
    text,
    category,
    active: true,
    created_at: now,
    updated_at: now,
  });
  clearRewardMessageCache();
  return docRef.id;
};

export const updateRewardMessage = async (
  messageId: string,
  updates: Partial<Pick<RewardMessage, 'text' | 'category' | 'active'>>
): Promise<void> => {
  const ref = doc(db, 'rewardMessages', messageId);
  await updateDoc(ref, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
  clearRewardMessageCache();
};

export const deleteRewardMessage = async (messageId: string): Promise<void> => {
  await deleteDoc(doc(db, 'rewardMessages', messageId));
  clearRewardMessageCache();
};

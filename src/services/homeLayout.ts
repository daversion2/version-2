import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { HomeLayoutItem } from '../types';
import { DEFAULT_HOME_LAYOUT, SECTION_IDS } from '../constants/homeLayout';

/**
 * Merges a saved layout with the known section set.
 * - Preserves saved order and visibility
 * - Appends any new sections not in saved (visible by default)
 * - Drops saved IDs no longer in the known set
 */
export const resolveLayout = (saved: HomeLayoutItem[] | undefined): HomeLayoutItem[] => {
  if (!saved || saved.length === 0) return [...DEFAULT_HOME_LAYOUT];

  const knownIds = new Set<string>(SECTION_IDS);
  const seenIds = new Set<string>();

  // Keep saved items that are still known
  const resolved: HomeLayoutItem[] = [];
  for (const item of saved) {
    if (knownIds.has(item.id) && !seenIds.has(item.id)) {
      resolved.push({ id: item.id, visible: item.visible });
      seenIds.add(item.id);
    }
  }

  // Append any new sections not in saved layout
  for (const id of SECTION_IDS) {
    if (!seenIds.has(id)) {
      resolved.push({ id, visible: true });
    }
  }

  return resolved;
};

export const saveHomeLayout = async (userId: string, layout: HomeLayoutItem[]): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { home_layout: layout });
};

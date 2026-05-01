import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { HomeLayoutItem } from '../types';
import { DEFAULT_HOME_LAYOUT, SECTION_IDS, ZONE_CONFIG, SECTION_TO_ZONE, HomeSectionId } from '../constants/homeLayout';

/**
 * Merges a saved layout with the known section set, grouped by zone.
 * - Groups sections into their assigned zones
 * - Preserves within-zone order and visibility from saved layout
 * - Inserts new sections at their default position within the zone
 * - Drops saved IDs no longer in the known set
 */
export const resolveLayout = (saved: HomeLayoutItem[] | undefined): HomeLayoutItem[] => {
  if (!saved || saved.length === 0) return [...DEFAULT_HOME_LAYOUT];

  const knownIds = new Set<string>(SECTION_IDS);
  const seenIds = new Set<string>();

  // Build a map of saved items (preserving visibility)
  const savedMap = new Map<string, HomeLayoutItem>();
  for (const item of saved) {
    if (knownIds.has(item.id) && !seenIds.has(item.id)) {
      savedMap.set(item.id, { id: item.id, visible: item.visible });
      seenIds.add(item.id);
    }
  }

  // Build resolved layout zone by zone
  const resolved: HomeLayoutItem[] = [];

  for (const zone of ZONE_CONFIG) {
    // Get saved items that belong to this zone, in their saved order
    const savedZoneItems: HomeLayoutItem[] = [];
    for (const item of saved) {
      if (
        zone.sectionIds.includes(item.id as HomeSectionId) &&
        savedMap.has(item.id)
      ) {
        savedZoneItems.push(savedMap.get(item.id)!);
      }
    }

    // Append any new sections for this zone not in saved
    for (const sectionId of zone.sectionIds) {
      if (!seenIds.has(sectionId)) {
        savedZoneItems.push({ id: sectionId, visible: true });
      }
    }

    resolved.push(...savedZoneItems);
  }

  return resolved;
};

export const saveHomeLayout = async (userId: string, layout: HomeLayoutItem[]): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { home_layout: layout });
};

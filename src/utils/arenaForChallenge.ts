import { ArenaId } from '../types';
import { CHALLENGE_LIBRARY_SEED_DATA } from '../data/challengeSeedData';
import { CATEGORY_FALLBACK_ARENA } from '../constants/arenas';

// Name -> arena lookup derived from the (arena-tagged) seed data. Lets challenges
// that predate arena tagging — Firestore library docs AND the user's existing
// challenges — resolve to an arena for display without a data backfill.
// See docs/phase-0-arena-taxonomy.md
const SEED_ARENA_BY_NAME: Record<string, { arena_id?: ArenaId; off_thesis?: boolean }> =
  CHALLENGE_LIBRARY_SEED_DATA.reduce((acc, c) => {
    acc[c.name] = { arena_id: c.arena_id, off_thesis: c.off_thesis };
    return acc;
  }, {} as Record<string, { arena_id?: ArenaId; off_thesis?: boolean }>);

/**
 * Resolve a challenge's arena for display:
 * explicit `arena_id` → seed lookup by name → coarse category fallback.
 * Returns undefined for off-thesis items (no chip).
 */
export const getChallengeArenaId = (challenge: {
  arena_id?: ArenaId;
  name?: string;
  category?: string;
  off_thesis?: boolean;
}): ArenaId | undefined => {
  if (challenge.arena_id) return challenge.arena_id;
  if (challenge.off_thesis) return undefined;
  const seed = challenge.name ? SEED_ARENA_BY_NAME[challenge.name] : undefined;
  if (seed?.off_thesis) return undefined;
  if (seed?.arena_id) return seed.arena_id;
  return challenge.category ? CATEGORY_FALLBACK_ARENA[challenge.category] : undefined;
};

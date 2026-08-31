import { HabitDifficulty } from '../types';

// =============================================================================
// RESISTANCE — the app's headline metric.
//
// Every check-in asks one question: how hard was it to start? The answer is a
// 1–10 rating stored on CompletionLog.resistance. Watching that number fall for
// a given habit over weeks is the product's core proof of change.
//
// WHY A NEW FIELD RATHER THAN WIDENING `difficulty`:
// logs written before this change store difficulty as 1 ('easy') or 2
// ('challenging'). If resistance reused that field, a legacy 2 ("it was hard")
// and a new 2 ("that was trivial") would be indistinguishable and every
// historical trend would be silently wrong. `resistance` is therefore additive,
// and `difficulty` keeps being written (derived) so existing analytics, streak
// logic and the adaptation insight keep working untouched.
// =============================================================================

export const RESISTANCE_MIN = 1;
export const RESISTANCE_MAX = 10;
export const RESISTANCE_DEFAULT = 5;

/** Above this, a check-in counts as "challenging" for the legacy binary field. */
export const CHALLENGING_THRESHOLD = 6;

/**
 * Derive the legacy binary difficulty from a resistance rating, so a single
 * check-in writes both and nothing downstream has to know about the change yet.
 */
export const resistanceToDifficulty = (resistance: number): HabitDifficulty =>
  resistance >= CHALLENGING_THRESHOLD ? 'challenging' : 'easy';

/**
 * Approximate a resistance value for a legacy log that only has the binary
 * field. Used for trends so pre-change history still plots rather than leaving
 * a gap — deliberately conservative: 'easy' → 3, 'challenging' → 7.
 *
 * Returns undefined for anything unrecognized, so callers can exclude it rather
 * than plot a fabricated point.
 */
export const legacyDifficultyToResistance = (difficulty?: number): number | undefined => {
  if (difficulty === 1) return 3;
  if (difficulty === 2) return 7;
  return undefined;
};

/**
 * The resistance for a log, preferring the real rating and falling back to the
 * legacy binary. This is the single accessor analytics should use.
 */
export const logResistance = (log: {
  resistance?: number;
  difficulty?: number;
}): number | undefined =>
  typeof log.resistance === 'number'
    ? log.resistance
    : legacyDifficultyToResistance(log.difficulty);

/** Short label for a rating, used under the slider and on history rows. */
export const resistanceLabel = (resistance: number): string => {
  if (resistance <= 2) return 'Barely noticed it';
  if (resistance <= 4) return 'A little pull';
  if (resistance <= 6) return 'Had to push';
  if (resistance <= 8) return 'Really hard';
  return 'Nearly didn’t';
};

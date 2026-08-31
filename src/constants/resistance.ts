import { HabitDifficulty } from '../types';

// =============================================================================
// RESISTANCE — the app's headline metric.
//
// Every check-in asks one question: how hard was it? The answer is one of THREE
// levels. Watching that number fall for a habit over weeks is the product's
// core proof of change.
//
// WHY THREE AND NOT TEN: a 10-point scale asks for precision people don't have.
// Nobody reliably distinguishes a 6 from a 7, so the extra resolution is noise
// dressed as data. Three levels are genuinely distinguishable, and because the
// charts plot WEEKLY AVERAGES the trend keeps fractional resolution anyway — a
// week can read 2.4 and fall to 1.8 over a month.
//
// WHY LOGS RECORD THEIR SCALE: values written before this change are on the old
// 1–10 scale, and the two ranges OVERLAP. A stored 2 means "very easy" under the
// old scale and "difficult but manageable" under the new one. Without knowing
// which scale produced a value there is no way to read history correctly, so
// every new log stores `resistance_scale`. A log with a resistance but no scale
// predates this change and is therefore 1–10.
// =============================================================================

export const RESISTANCE_MIN = 1;
export const RESISTANCE_MAX = 3;

/** Written onto every new log so historical values stay interpretable. */
export const RESISTANCE_SCALE = 3;

/** The scale used before the 3-point levels existed. */
export const LEGACY_RESISTANCE_MAX = 10;

export interface ResistanceLevel {
  value: 1 | 2 | 3;
  label: string;
  /** One line under the label, clarifying where the boundary sits. */
  sublabel: string;
}

export const RESISTANCE_LEVELS: ResistanceLevel[] = [
  { value: 1, label: 'Easy today', sublabel: 'Barely had to think about it' },
  { value: 2, label: 'Difficult but manageable', sublabel: 'Had to push, but never in doubt' },
  { value: 3, label: 'Took everything I had', sublabel: 'Nearly didn’t' },
];

/** Above this, a check-in counts as "challenging" for the legacy binary field. */
export const CHALLENGING_THRESHOLD = 2;

/**
 * Smallest weekly-average movement worth calling a trend. On a 3-point scale a
 * full point is an enormous shift, so the bar is half a level — enough to be
 * real, small enough to be reachable.
 */
export const MEANINGFUL_RESISTANCE_CHANGE = 0.5;

export const getResistanceLevel = (value?: number): ResistanceLevel | undefined =>
  RESISTANCE_LEVELS.find((l) => l.value === value);

/**
 * Derive the legacy binary difficulty from a rating, so a single check-in writes
 * both and nothing downstream has to know about the change yet.
 */
export const resistanceToDifficulty = (resistance: number): HabitDifficulty =>
  resistance >= CHALLENGING_THRESHOLD ? 'challenging' : 'easy';

/**
 * Fold a value from an older, wider scale onto the current three levels.
 * 1–3 → easy, 4–7 → middle, 8–10 → hardest. Clamped, so a malformed value can
 * never produce a level that doesn't exist.
 */
export const normalizeResistance = (
  value: number,
  scale: number = LEGACY_RESISTANCE_MAX
): number => {
  if (scale === RESISTANCE_MAX) {
    return Math.min(RESISTANCE_MAX, Math.max(RESISTANCE_MIN, Math.round(value)));
  }
  // Proportional thirds of the old range.
  const third = scale / 3;
  if (value <= third) return 1;
  if (value <= third * 2.35) return 2; // 4–7 on a 1–10 scale
  return 3;
};

/**
 * Approximate a level for a legacy log that only has the binary field.
 * 'easy' → 1, 'challenging' → 2 (the middle, deliberately conservative: the old
 * binary lumped "had to push" and "nearly didn't" together, so promoting all of
 * it to the hardest level would overstate the history).
 *
 * Returns undefined for anything unrecognized, so callers can exclude it rather
 * than plot a fabricated point.
 */
export const legacyDifficultyToResistance = (difficulty?: number): number | undefined => {
  if (difficulty === 1) return 1;
  if (difficulty === 2) return 2;
  return undefined;
};

/**
 * The resistance for a log ON THE CURRENT SCALE. Prefers the real rating,
 * normalizing it from whatever scale it was recorded on, and falls back to the
 * legacy binary. This is the single accessor analytics should use.
 */
export const logResistance = (log: {
  resistance?: number;
  resistance_scale?: number;
  difficulty?: number;
}): number | undefined =>
  typeof log.resistance === 'number'
    ? normalizeResistance(log.resistance, log.resistance_scale ?? LEGACY_RESISTANCE_MAX)
    : legacyDifficultyToResistance(log.difficulty);

/** Short label for a rating, used on history rows and the Today list. */
export const resistanceLabel = (resistance: number): string =>
  getResistanceLevel(normalizeResistance(resistance, RESISTANCE_MAX))?.label ?? '';

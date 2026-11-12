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
  /**
   * What the rating button says under its number. About the START, not the
   * session: "Easy / Med / Hard" read as how hard the workout was.
   */
  anchor: string;
}

export const RESISTANCE_LEVELS: ResistanceLevel[] = [
  { value: 1, label: 'Easy today', sublabel: 'Barely had to think about it', anchor: 'Barely thought about it' },
  { value: 2, label: 'Difficult but manageable', sublabel: 'Had to push, but never in doubt', anchor: 'Had to push' },
  { value: 3, label: 'Took everything I had', sublabel: 'Nearly didn’t', anchor: 'Nearly didn’t' },
];

// =============================================================================
// TWO RATINGS (2026-11-11). The override above is "how hard was it to START" —
// getting from a cold stop to going. A session now also gets PUSH: once in
// motion, how hard did you push yourself? A hard start and an easy workout is
// a 3 then a 1, and the two say different things, so they are never added.
//
// WHEN EACH IS ASKED:
//   - Started in the app (Workouts, Meditate): the override on the Start
//     buttons themselves, while the resistance is there to feel; push at the
//     end. Logs say `override_rated: 'start'`.
//   - Done it / a past session: both at the end, back to back, the override in
//     the past tense. `override_rated: 'after'` — a remembered start may read
//     easier than one rated in the moment, so the two stay tellable apart.
//   - Meals: no single start, so one rating per logged day, at close:
//     `day_rating`, kept out of both the override and push lines.
//
// "Suck factor" was the working name for push; on screen it is "Push", and
// every word below can be changed in the copy editor.
// =============================================================================

/** The override, asked as the session starts — present tense. */
export const START_LEVELS: ResistanceLevel[] = [
  { value: 1, label: 'Easy start', sublabel: 'Barely thinking about it', anchor: 'Barely thinking about it' },
  { value: 2, label: 'Have to push', sublabel: 'Talking myself into it', anchor: 'Talking myself into it' },
  { value: 3, label: 'Took everything', sublabel: 'Almost talked myself out of it', anchor: 'Almost talked myself out of it' },
];

/** Which app's words push uses. */
export type PushApp = 'workouts' | 'meditate';

export const PUSH_QUESTION: Record<PushApp, string> = {
  workouts: 'How hard did you push?',
  meditate: 'How hard was it to stay with it?',
};

/** Push, after the session. For Meditate, pushing is staying with it when your mind pulls away. */
export const PUSH_LEVELS: Record<PushApp, ResistanceLevel[]> = {
  workouts: [
    { value: 1, label: 'Cruised', sublabel: 'Had plenty left', anchor: 'Had plenty left' },
    { value: 2, label: 'Worked', sublabel: 'Pushed, a little left', anchor: 'Pushed, a little left' },
    { value: 3, label: 'Emptied the tank', sublabel: 'Nothing left at the end', anchor: 'Nothing left at the end' },
  ],
  meditate: [
    { value: 1, label: 'Settled in', sublabel: 'Mind mostly stayed put', anchor: 'Mind mostly stayed put' },
    { value: 2, label: 'Kept coming back', sublabel: 'Wandered, I brought it back', anchor: 'Wandered, I brought it back' },
    { value: 3, label: 'Fought it', sublabel: 'Restless the whole time', anchor: 'Restless the whole time' },
  ],
};

export const MEALS_DAY_QUESTION = 'How hard was it to eat this way today?';

/** Meals' one rating a day: the pull of the day's choices, not a start. */
export const MEALS_DAY_LEVELS: ResistanceLevel[] = [
  { value: 1, label: 'Didn’t think about it', sublabel: 'An easy day', anchor: 'An easy day' },
  { value: 2, label: 'Said no a few times', sublabel: 'Some pull, I held', anchor: 'Some pull, I held' },
  { value: 3, label: 'Fought it all day', sublabel: 'Cravings the whole way', anchor: 'Cravings the whole way' },
];

/** Where an override came from: rated live at the start, or remembered afterwards. */
export type OverrideRated = 'start' | 'after';

/** A 1–3 rating, or undefined for anything else. */
export const asLevel = (value: unknown): 1 | 2 | 3 | undefined =>
  value === 1 || value === 2 || value === 3 ? value : undefined;

/** Above this, a check-in counts as "challenging" for the legacy binary field. */
export const CHALLENGING_THRESHOLD = 2;

/**
 * Smallest weekly-average movement worth calling a trend. On a 3-point scale a
 * full point is an enormous shift, so the bar is half a level — enough to be
 * real, small enough to be reachable.
 */
export const MEANINGFUL_RESISTANCE_CHANGE = 0.5;

/**
 * At or above this, a rep counts as HARD and the reflection asks what got the
 * user through it (see data/overrideTactics.ts).
 *
 * Levels 2 and 3 — "Had to push" and "Nearly didn't". Level 1 is excluded
 * because a tactic tagged on a rep that took nothing is not a fact about the
 * user's override, and asking every check-in is what made the pre-2026-07
 * version of this question feel like paperwork.
 *
 * It also makes the playbook's denominator honest: "3 of your last 4 HARD
 * reps" is a claim about what works under resistance. The same line over all
 * reps would mostly be a claim about which days were easy.
 */
export const TACTIC_GATE_RESISTANCE = 2;

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

/**
 * Did this rep cost the user something? Reads through logResistance, so a log
 * recorded on the old 1–10 scale is folded onto the current levels before the
 * comparison rather than being read as a raw 2.
 *
 * A log with no rating at all returns false: unrated is not the same as easy,
 * but including it would silently inflate the "hard reps" denominator behind
 * the playbook with reps we know nothing about.
 */
export const isHardRep = (log: {
  resistance?: number;
  resistance_scale?: number;
  difficulty?: number;
}): boolean => {
  const r = logResistance(log);
  return typeof r === 'number' && r >= TACTIC_GATE_RESISTANCE;
};

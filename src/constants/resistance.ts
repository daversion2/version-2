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
// THE OVERRIDE, TWICE (2026-11-20; two ratings since 2026-11-11). Discipline is
// one skill used twice. You override the resistance to START, and once you're
// going you override it again to KEEP GOING: the "this sucks, stop" in a
// workout, the "I'll stop a little early" in a meditation. Each gets its own
// 1–3, and on both a lower number over the weeks is the override getting
// stronger. A hard start and an easy finish is a 3 then a 1; the two say
// different things, so they are never added.
//
// WHEN EACH IS ASKED:
//   - Started in the app (Workouts, Meditate): the start on the Start
//     buttons themselves, while the resistance is there to feel; keep going
//     at the end. Logs say `override_rated: 'start'`.
//   - Done it / a past session: both at the end, back to back, the start in
//     the past tense. `override_rated: 'after'` — a remembered start may read
//     easier than one rated in the moment, so the start line prefers live ones
//     (homeDashboard.appFriction).
//   - Logged more than a day late: keep going only (services/checkinRating.ts).
//   - Meals: no single start; the whole day is one long keep-going. One rating
//     per logged day, at close: `day_rating`.
//
// Until 2026-11-20 the second rating was "push" — how hard you went — which
// read the wrong way for Meditate and for easy training weeks. Those logs keep
// `push`; nothing reads it. Every word below can be changed in the copy editor.
// =============================================================================

/** The start override — present tense on Start, the past tense asked afterwards. */
export const START_LEVELS: ResistanceLevel[] = [
  { value: 1, label: 'Easy start', sublabel: 'Barely thought about it', anchor: 'Barely thought about it' },
  { value: 2, label: 'Had to talk myself into it', sublabel: 'Got there', anchor: 'Talked myself into it' },
  { value: 3, label: 'Almost didn’t', sublabel: 'Nearly talked myself out of it', anchor: 'Almost didn’t' },
];

/** Which app's words keep going uses. */
export type KeepGoingApp = 'workouts' | 'meditate';

export const KEEP_GOING_QUESTION: Record<KeepGoingApp, string> = {
  workouts: 'How hard was it to keep going?',
  meditate: 'How hard was it not to stop early?',
};

/** Keep going, after the session: how loud the urge to stop was, and that you overrode it. */
export const KEEP_GOING_LEVELS: Record<KeepGoingApp, ResistanceLevel[]> = {
  workouts: [
    { value: 1, label: 'Barely there', sublabel: 'Never really wanted to stop', anchor: 'Never wanted to stop' },
    {
      value: 2,
      label: 'Talked myself through it',
      sublabel: '“This sucks” showed up, I kept going',
      anchor: 'Talked myself through it',
    },
    { value: 3, label: 'Took everything', sublabel: 'Wanted to quit, kept going anyway', anchor: 'Wanted to quit, kept going' },
  ],
  meditate: [
    { value: 1, label: 'Barely there', sublabel: 'Never thought about stopping', anchor: 'Never thought of stopping' },
    {
      value: 2,
      label: 'Talked myself through it',
      sublabel: '“I’ll stop early” crept in, I stayed',
      anchor: 'Talked myself through it',
    },
    { value: 3, label: 'Took everything', sublabel: 'Wanted to stop the whole time', anchor: 'Wanted to stop, stayed' },
  ],
};

export const MEALS_DAY_QUESTION = 'How hard was it to eat this way today?';

/** Meals' one rating a day: keeping going all day, against the pull of the day's choices. */
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

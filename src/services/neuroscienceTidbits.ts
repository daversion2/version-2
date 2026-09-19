import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { HabitDifficulty, NeuroscienceTidbit } from '../types';
import { RESISTANCE_SCALE, normalizeResistance } from '../constants/resistance';

// ============================================================================
// Collection References
// ============================================================================

const tidbitsRef = () => collection(db, 'neuroscienceTidbits');
const shownTidbitsRef = (userId: string) =>
  collection(db, 'users', userId, 'shownTidbits');

// ============================================================================
// Session Cache
// ============================================================================

let cachedTidbits: NeuroscienceTidbit[] | null = null;

export const clearTidbitCache = (): void => {
  cachedTidbits = null;
};

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Fetch all active tidbits. Session-cached.
 */
export const getAllActiveTidbits = async (): Promise<NeuroscienceTidbit[]> => {
  if (cachedTidbits !== null) return cachedTidbits;

  const q = query(tidbitsRef(), where('active', '==', true));
  const snapshot = await getDocs(q);
  cachedTidbits = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as NeuroscienceTidbit[];

  return cachedTidbits;
};

/**
 * Fetch all tidbits (including inactive) for admin use. Not cached.
 */
export const getAllTidbits = async (): Promise<NeuroscienceTidbit[]> => {
  const snapshot = await getDocs(tidbitsRef());
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as NeuroscienceTidbit[];
};

/**
 * Get tidbit IDs shown to this user within the last 14 days.
 */
export const getRecentlyShownTidbitIds = async (
  userId: string
): Promise<string[]> => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString();

  const q = query(
    shownTidbitsRef(userId),
    where('shown_at', '>=', cutoff)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data().tidbit_id as string);
};

// ============================================================================
// Context Mapping
// ============================================================================

export interface TidbitContext {
  challengeType?: string;  // e.g. 'workout', 'cold', 'meditation'
  category?: string;       // e.g. 'physical', 'mental'
  states: string[];        // e.g. ['comeback', 'rated_hard', 'streak_7']
}

/**
 * Habit name → habit type, for the `habit_type` tidbits.
 *
 * Order matters: the FIRST pattern that matches wins, so the narrow ones sit
 * above the broad ones. "Cold shower" would otherwise be caught by nothing, but
 * "Screen-free wind-down" has to reach `sleep` rather than `screen_limit`, and
 * "No phone for the first 30 minutes" has to reach `screen_limit` rather than
 * `deep_work`.
 *
 * A habit that matches nothing simply gets no type-specific tidbit and falls
 * through to the state buckets — that is the expected case for most of the
 * library, not a failure.
 */
const HABIT_TYPE_PATTERNS: [RegExp, string][] = [
  [/cold shower|ice bath|cold exposure|cold plunge|cold/i, 'cold'],
  [/meditat|stillness/i, 'meditation'],
  [/breathwork|breathing|breathe|wim hof/i, 'breathwork'],
  [/bed ?time|wind[- ]down|sleep|snooze|alarm|wake up early|wake early|lights out/i, 'sleep'],
  [/journal|gratitude|one good thing/i, 'journaling'],
  [/screen|social media|digital|phone/i, 'screen_limit'],
  [
    /workout|exercise|gym|run(?:ning)?|push[- ]?up|squat|plank|lift|movement|move |walk|steps|stretch|cardio|yoga/i,
    'workout',
  ],
  [/diet|eat(?:ing)?|food|sugar|fast(?:ing)?|no junk|nutrition|vegetable|water|meal/i, 'diet'],
  [/focus|deep work|study|read(?:ing)?/i, 'deep_work'],
];

/**
 * Derive a habit type from the habit's name via keyword matching.
 */
export const deriveHabitType = (habitName: string): string | undefined => {
  for (const [pattern, type] of HABIT_TYPE_PATTERNS) {
    if (pattern.test(habitName)) return type;
  }
  return undefined;
};

/**
 * @deprecated Retired with the Challenges tab. Alias kept so the archived
 * challenge completion path still resolves; use `deriveHabitType`.
 */
export const deriveChallengeType = deriveHabitType;

/**
 * Map a category name to the tidbit context value.
 */
const mapCategory = (categoryId: string): string => {
  const lower = categoryId.toLowerCase();
  if (lower === 'physical') return 'physical';
  if (lower === 'mind') return 'mental';
  if (lower === 'social') return 'social';
  return lower;
};

/**
 * Build a TidbitContext from challenge data and completion state.
 */
export const buildTidbitContext = (
  challenge: { name: string; category_id?: string },
  state: {
    totalCount: number;
    streakDays: number;
    difficulty: number;
    repeatMilestone: number | null;
    previousStreak: number;
  }
): TidbitContext => {
  const challengeType = deriveChallengeType(challenge.name);
  const category = challenge.category_id ? mapCategory(challenge.category_id) : undefined;

  const states: string[] = [];
  if (state.totalCount === 1) states.push('new_user');
  if (state.previousStreak === 0 && state.streakDays >= 1 && state.totalCount > 1) states.push('comeback');
  if (state.difficulty >= 4) states.push('rated_hard');
  if (state.streakDays === 3) states.push('streak_3');
  if (state.streakDays === 7) states.push('streak_7');
  if (state.streakDays === 30) states.push('streak_30');
  if (state.repeatMilestone) states.push('repeat_milestone');

  // Extinction burst window: days 5-10 of a streak, or difficulty spike
  if (state.streakDays >= 5 && state.streakDays <= 10) {
    states.push('extinction_burst');
  }

  return { challengeType, category, states };
};

// ============================================================================
// Selection Algorithm
// ============================================================================

/**
 * Pick a random element from an array.
 */
const randomPick = <T>(arr: T[]): T | null => {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Select the best tidbit for this completion, using a priority cascade.
 * Returns null if no tidbits are available.
 */
export const selectTidbitForCompletion = async (
  userId: string,
  context: TidbitContext
): Promise<NeuroscienceTidbit | null> => {
  const [allTidbits, recentIds] = await Promise.all([
    getAllActiveTidbits(),
    getRecentlyShownTidbitIds(userId),
  ]);

  if (allTidbits.length === 0) {
    return null;
  }

  const recentSet = new Set(recentIds);
  const notRecent = (t: NeuroscienceTidbit) => !recentSet.has(t.id);

  // Priority 1: Challenge-type specific
  if (context.challengeType) {
    const matches = allTidbits.filter(
      (t) => t.context_type === 'challenge_type' && t.context_value === context.challengeType && notRecent(t)
    );
    const pick = randomPick(matches);
    if (pick) return pick;
  }

  // Priority 2: Category specific
  if (context.category) {
    const matches = allTidbits.filter(
      (t) => t.context_type === 'category' && t.context_value === context.category && notRecent(t)
    );
    const pick = randomPick(matches);
    if (pick) return pick;
  }

  // Priority 3: State specific (try each state)
  for (const state of context.states) {
    const matches = allTidbits.filter(
      (t) => t.context_type === 'state' && t.context_value === state && notRecent(t)
    );
    const pick = randomPick(matches);
    if (pick) return pick;
  }

  // Priority 4: Generic fallback
  const genericMatches = allTidbits.filter(
    (t) => t.context_type === 'generic' && notRecent(t)
  );
  const pick = randomPick(genericMatches);
  if (pick) return pick;

  // If everything has been shown recently, pick any generic tidbit
  const anyGeneric = allTidbits.filter((t) => t.context_type === 'generic');
  return randomPick(anyGeneric);
};

// ============================================================================
// Habit Tidbit Selection
// ============================================================================

export interface HabitTidbitContext {
  /** Streak BEFORE this check-in was counted. */
  streakDays: number;
  /**
   * The habit's name. Used to match a `habit_type` tidbit — the science of this
   * particular kind of habit. Omitted means the type step is skipped.
   */
  habitName?: string;
  /**
   * How hard it was, on the scale in `resistanceScale`. This is what buckets the
   * check-in; prefer it over `difficulty`.
   */
  resistance?: number;
  /** The scale `resistance` was recorded on. Defaults to the current 3. */
  resistanceScale?: number;
  /**
   * Legacy binary rating. Only consulted when `resistance` is absent, and it can
   * never reach the `hardest` bucket — the old binary lumped "had to push" in
   * with "nearly didn't", so promoting all of it would overstate the day.
   */
  difficulty?: HabitDifficulty;
  /** Returning after a missed day. */
  isReturn?: boolean;
}

/**
 * A level-1 rating only tells the resistance-curve story once there is a curve.
 * "This got easier" on day two is not the habit bedding in, it is one easy day.
 */
const EASING_MIN_STREAK = 7;

/**
 * Bucket a check-in by how hard it was, on the current 3-point scale.
 * Returns undefined when nothing was captured.
 */
const resolveLevel = (context: HabitTidbitContext): number | undefined => {
  if (typeof context.resistance === 'number') {
    return normalizeResistance(context.resistance, context.resistanceScale ?? RESISTANCE_SCALE);
  }
  if (context.difficulty === 'challenging') return 2;
  if (context.difficulty === 'easy') return 1;
  return undefined;
};

/**
 * Select the tidbit to show after a habit check-in.
 *
 * The cascade is ordered by what has the best claim on the moment:
 *
 *   1. The day itself, when it was notable — they came back from a miss
 *      (`struggle`), or it took everything they had (`hardest`).
 *   2. The science of this kind of habit (`habit_type`), matched off the name.
 *      Below the urgent states because a comeback deserves a response, not a
 *      lecture on BDNF; above the rest because it is the most specific thing
 *      the pool knows about this habit.
 *   3. The remaining states — `easing`, `established`, `streak`, `new_habit`.
 *   4. `generic`, then a recycle if the 14-day window has excluded everything.
 *
 * Note what is NOT here: a level-2 rating no longer routes anywhere special.
 * Under the old binary, `resistance >= 2` meant "challenging" and sent two of
 * the three levels into `struggle`, so most check-ins drew from the same two
 * tidbits. Level 2 is the ordinary answer and now falls through to the streak
 * buckets, where the variety is.
 */
export const selectHabitTidbit = async (
  userId: string,
  context: HabitTidbitContext
): Promise<NeuroscienceTidbit | null> => {
  const [allTidbits, recentIds] = await Promise.all([
    getAllActiveTidbits(),
    getRecentlyShownTidbitIds(userId),
  ]);

  const habitTidbits = allTidbits.filter((t) => t.context_type === 'habit');
  const typeTidbits = allTidbits.filter((t) => t.context_type === 'habit_type');
  if (habitTidbits.length === 0 && typeTidbits.length === 0) return null;

  const recentSet = new Set(recentIds);
  const notRecent = (t: NeuroscienceTidbit) => !recentSet.has(t.id);

  const level = resolveLevel(context);

  const pickBucket = (bucket: string): NeuroscienceTidbit | null =>
    randomPick(habitTidbits.filter((t) => t.context_value === bucket && notRecent(t)));

  // 1. The states that are a response to today.
  const urgentStates: string[] = [];
  if (context.isReturn) urgentStates.push('struggle');
  if (level === 3) urgentStates.push('hardest');

  for (const state of urgentStates) {
    const pick = pickBucket(state);
    if (pick) return pick;
  }

  // 2. The science of this kind of habit.
  if (context.habitName) {
    const habitType = deriveHabitType(context.habitName);
    if (habitType) {
      const pick = randomPick(
        typeTidbits.filter((t) => t.context_value === habitType && notRecent(t))
      );
      if (pick) return pick;
    }
  }

  // 3. Where they are in the arc of the habit.
  const standardStates: string[] = [];
  if (level === 1 && context.streakDays >= EASING_MIN_STREAK) standardStates.push('easing');
  if (context.streakDays >= 30) standardStates.push('established');
  if (context.streakDays >= 7) standardStates.push('streak');
  if (context.streakDays <= 14) standardStates.push('new_habit');

  for (const state of standardStates) {
    const pick = pickBucket(state);
    if (pick) return pick;
  }

  // 4. Generic, then recycle.
  const genericPick = pickBucket('generic');
  if (genericPick) return genericPick;

  return randomPick(habitTidbits.length > 0 ? habitTidbits : typeTidbits);
};

// ============================================================================
// Tracking
// ============================================================================

/**
 * Record that a tidbit was shown to the user.
 */
export const recordTidbitShown = async (
  userId: string,
  tidbitId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'shownTidbits', tidbitId);
  await setDoc(ref, {
    tidbit_id: tidbitId,
    shown_at: new Date().toISOString(),
    tapped_learn_more: false,
  });
};

/**
 * Record that the user tapped "learn more" on a tidbit.
 */
export const recordLearnMoreTap = async (
  userId: string,
  tidbitId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'shownTidbits', tidbitId);
  await updateDoc(ref, { tapped_learn_more: true });
};

// ============================================================================
// Admin CRUD
// ============================================================================

export const createTidbit = async (
  data: Omit<NeuroscienceTidbit, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(tidbitsRef(), {
    ...data,
    created_at: now,
    updated_at: now,
  });
  clearTidbitCache();
  return docRef.id;
};

export const updateTidbit = async (
  id: string,
  updates: Partial<Omit<NeuroscienceTidbit, 'id' | 'created_at'>>
): Promise<void> => {
  const ref = doc(db, 'neuroscienceTidbits', id);
  await updateDoc(ref, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
  clearTidbitCache();
};

export const deleteTidbit = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'neuroscienceTidbits', id));
  clearTidbitCache();
};

/**
 * Flip `active` on every tidbit currently in the opposite state, and report how
 * many moved.
 *
 * This exists for the reseed path. The seeder is append-only and dedupes on
 * exact text, so shipping rewritten copy ADDS a second set rather than
 * replacing the first — and both halves then compete in the same buckets. The
 * fix is to retire everything before seeding, which is not a thing anyone
 * should do one row at a time.
 *
 * Deactivation rather than deletion on purpose: `getAllActiveTidbits` filters
 * on `active`, so an inactive tidbit is already invisible to users, and this
 * stays reversible by calling it with the other argument. Nothing here is
 * destructive.
 *
 * Already-correct docs are skipped, so calling it twice is a no-op the second
 * time.
 */
export const setAllTidbitsActive = async (active: boolean): Promise<number> => {
  const all = await getAllTidbits();
  const toChange = all.filter((t) => t.active !== active);
  const now = new Date().toISOString();

  await Promise.all(
    toChange.map((t) =>
      updateDoc(doc(db, 'neuroscienceTidbits', t.id), { active, updated_at: now })
    )
  );

  clearTidbitCache();
  return toChange.length;
};

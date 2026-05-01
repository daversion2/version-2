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
import { NeuroscienceTidbit, TidbitContextType } from '../types';

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

const CHALLENGE_TYPE_PATTERNS: [RegExp, string][] = [
  [/workout|exercise|gym|run(?:ning)?|push[- ]?up|squat|plank|lift/i, 'workout'],
  [/cold shower|ice bath|cold exposure|cold plunge/i, 'cold'],
  [/meditat/i, 'meditation'],
  [/breathwork|breathing|wim hof/i, 'breathwork'],
  [/journal/i, 'journaling'],
  [/diet|eat(?:ing)?|food|sugar|fast(?:ing)?|no junk|nutrition/i, 'diet'],
  [/focus|deep work|study|read(?:ing)?|no phone/i, 'deep_work'],
  [/screen|social media|digital/i, 'screen_limit'],
];

/**
 * Derive a challenge type from the challenge name via keyword matching.
 */
export const deriveChallengeType = (challengeName: string): string | undefined => {
  for (const [pattern, type] of CHALLENGE_TYPE_PATTERNS) {
    if (pattern.test(challengeName)) return type;
  }
  return undefined;
};

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
  challenge: { name: string; category_id: string },
  state: {
    totalCount: number;
    streakDays: number;
    difficulty: number;
    repeatMilestone: number | null;
    previousStreak: number;
  }
): TidbitContext => {
  const challengeType = deriveChallengeType(challenge.name);
  const category = mapCategory(challenge.category_id);

  const states: string[] = [];
  if (state.totalCount === 1) states.push('new_user');
  if (state.previousStreak === 0 && state.streakDays >= 1 && state.totalCount > 1) states.push('comeback');
  if (state.difficulty >= 4) states.push('rated_hard');
  if (state.streakDays === 3) states.push('streak_3');
  if (state.streakDays === 7) states.push('streak_7');
  if (state.streakDays === 30) states.push('streak_30');
  if (state.repeatMilestone) states.push('repeat_milestone');

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

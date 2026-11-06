import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { MealsDay, MealsPrefs } from '../types/meals';
import { DEFAULT_MEALS_PREFS, DEFAULT_MEALS_SCORING } from '../data/mealGroups';
import { stripUndefined } from './labWorkouts';
import { clampOnTargetThreshold, normalizeDay } from './mealsMath';

// =============================================================================
// Meals (Lab) storage, in the user's own users/{uid}/lab_meals_* subcollections
// — the wildcard rule already covers them. Nothing here writes completionLogs:
// an on-target day's check-in goes through Today's normal path (see
// services/miniApps.ts). An off-target day writes nothing outside this app; its
// "why" stays on the day doc.
// =============================================================================

const COL = {
  days: 'lab_meals_days',
  prefs: 'lab_meals_prefs',
} as const;

const PREFS_DOC = 'main';

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

export const getMealsPrefs = async (userId: string): Promise<MealsPrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  const data: Partial<MealsPrefs> = snap.exists() ? (snap.data() as Partial<MealsPrefs>) : {};
  // `scoring` merges one level deep — an old prefs doc predates it entirely,
  // and a future weight added to the shape shouldn't vanish from an old doc either.
  const scoring = { ...DEFAULT_MEALS_SCORING, ...(data.scoring ?? {}) };
  // A threshold saved before it had a floor (it could be set to 0) is lifted to it.
  return {
    ...DEFAULT_MEALS_PREFS,
    ...data,
    scoring: { ...scoring, on_target_threshold: clampOnTargetThreshold(scoring.on_target_threshold) },
  };
};

/**
 * Merged at the top level: each field sent replaces that field whole — a map
 * included, so a chip score reset out of `score_overrides` is really gone (a
 * plain merge would deep-merge the map and keep it). Fields not sent stay.
 */
export const saveMealsPrefs = async (userId: string, changes: Partial<MealsPrefs>): Promise<void> => {
  const data = stripUndefined(changes);
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), data, { mergeFields: Object.keys(data) });
};

/**
 * Days from `from` to `to` inclusive (YYYY-MM-DD), keyed by date. A day saved
 * before plates (named meals + extras) comes back as plates; it's written in
 * the new shape the next time it's saved, never migrated in bulk.
 */
export const listMealsDays = async (userId: string, from: string, to: string): Promise<Record<string, MealsDay>> => {
  // One field, two bounds: a single-field index, so no composite index needed.
  const snap = await getDocs(query(col(userId, COL.days), where('date', '>=', from), where('date', '<=', to)));
  const out: Record<string, MealsDay> = {};
  for (const d of snap.docs) {
    const day = d.data() as MealsDay;
    out[day.date] = normalizeDay(day);
  }
  return out;
};

/** The whole day, keyed by its date — a retried save overwrites rather than duplicates. */
export const saveMealsDay = async (userId: string, day: MealsDay): Promise<void> => {
  await setDoc(ref(userId, COL.days, day.date), stripUndefined(day));
};

/** A fresh id for a plate, a food or a goal. */
export const newMealsId = (userId: string): string => doc(col(userId, COL.days)).id;

import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { MealsDay, MealsPrefs } from '../types/meals';
import { DEFAULT_MEALS_PREFS } from '../data/mealGroups';
import { stripUndefined } from './labWorkouts';

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
  return { ...DEFAULT_MEALS_PREFS, ...(snap.exists() ? (snap.data() as Partial<MealsPrefs>) : {}) };
};

/** Merged at the top level; an array field (slots, goals) is replaced whole. */
export const saveMealsPrefs = async (userId: string, changes: Partial<MealsPrefs>): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

/** Days from `from` to `to` inclusive (YYYY-MM-DD), keyed by date. */
export const listMealsDays = async (userId: string, from: string, to: string): Promise<Record<string, MealsDay>> => {
  // One field, two bounds: a single-field index, so no composite index needed.
  const snap = await getDocs(query(col(userId, COL.days), where('date', '>=', from), where('date', '<=', to)));
  const out: Record<string, MealsDay> = {};
  for (const d of snap.docs) {
    const day = d.data() as MealsDay;
    out[day.date] = { ...day, meals: day.meals ?? {}, extras: day.extras ?? [] };
  }
  return out;
};

/** The whole day, keyed by its date — a retried save overwrites rather than duplicates. */
export const saveMealsDay = async (userId: string, day: MealsDay): Promise<void> => {
  await setDoc(ref(userId, COL.days, day.date), stripUndefined(day));
};

/** A fresh id for an extra, a meal or a goal. */
export const newMealsId = (userId: string): string => doc(col(userId, COL.days)).id;

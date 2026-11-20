import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { PainDay, PainPlan, PainPrefs } from '../types/pain';
import { DEFAULT_PAIN_PREFS } from '../data/painPlan';
import { stripUndefined } from './labWorkouts';

// =============================================================================
// Back Pain (Lab) storage, in the user's own users/{uid}/lab_pain_*
// subcollections — the wildcard rule already covers them. Nothing here writes
// completionLogs or habits: the friction rating lives on the day doc until the
// app graduates (docs/micro-apps/pain.md).
// =============================================================================

const COL = {
  days: 'lab_pain_days',
  plans: 'lab_pain_plans',
  prefs: 'lab_pain_prefs',
} as const;

const PREFS_DOC = 'main';

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

export const getPainPrefs = async (userId: string): Promise<PainPrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  const saved: Partial<PainPrefs> = snap.exists() ? (snap.data() as Partial<PainPrefs>) : {};
  return { ...DEFAULT_PAIN_PREFS, ...saved };
};

export const savePainPrefs = async (userId: string, changes: Partial<PainPrefs>): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

/** Every check-in: one small doc a day, and the streak and plans need them all. */
export const listPainDays = async (userId: string): Promise<PainDay[]> => {
  const snap = await getDocs(col(userId, COL.days));
  return snap.docs.map((d) => ({ ...(d.data() as PainDay), date: d.id }));
};

/** Keyed by date, so an edit or a second check-in that day overwrites. */
export const savePainDay = async (userId: string, day: PainDay): Promise<void> => {
  await setDoc(ref(userId, COL.days, day.date), stripUndefined(day));
};

export const deletePainDay = async (userId: string, date: string): Promise<void> => {
  await deleteDoc(ref(userId, COL.days, date));
};

export const listPainPlans = async (userId: string): Promise<PainPlan[]> => {
  const snap = await getDocs(col(userId, COL.plans));
  return snap.docs.map((d) => ({ ...(d.data() as PainPlan), id: d.id }));
};

/** New plans, retests and endings all write the whole doc. */
export const savePainPlan = async (userId: string, plan: PainPlan): Promise<void> => {
  await setDoc(ref(userId, COL.plans, plan.id), stripUndefined(plan));
};

export const newPainPlanId = (userId: string): string => doc(col(userId, COL.plans)).id;

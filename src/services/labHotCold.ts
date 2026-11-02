import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { HotColdPrefs, HotColdSession } from '../types/hotcold';
import { DEFAULT_HOTCOLD_PREFS } from '../data/hotcold';
import { defaultUnit } from './hotcoldMath';
import { stripUndefined } from './labWorkouts';

// =============================================================================
// Hot & Cold (Lab) storage, in the user's own users/{uid}/lab_hotcold_*
// subcollections — the wildcard rule already covers them. Nothing here writes
// completionLogs or habits: the friction rating lives on the session doc until
// the app graduates (docs/micro-apps/hotcold.md).
// =============================================================================

const COL = {
  sessions: 'lab_hotcold_sessions',
  prefs: 'lab_hotcold_prefs',
} as const;

const PREFS_DOC = 'main';

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

/** Saved prefs over the defaults; an unsaved unit follows the phone's region. */
export const getHotColdPrefs = async (userId: string, locale?: string): Promise<HotColdPrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  const saved: Partial<HotColdPrefs> = snap.exists() ? (snap.data() as Partial<HotColdPrefs>) : {};
  return { ...DEFAULT_HOTCOLD_PREFS, unit: defaultUnit(locale), ...saved };
};

export const saveHotColdPrefs = async (userId: string, changes: Partial<HotColdPrefs>): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

/**
 * Sessions on or after `from` (YYYY-MM-DD) — every session without it, which
 * records and the streak need. One field, so no composite index.
 */
export const listHotColdSessions = async (userId: string, from?: string): Promise<HotColdSession[]> => {
  const sessions = col(userId, COL.sessions);
  const snap = await getDocs(from ? query(sessions, where('date', '>=', from)) : sessions);
  return snap.docs.map((d) => ({ ...(d.data() as HotColdSession), id: d.id }));
};

/** Keyed by its id, so a retried save or an edit overwrites rather than duplicates. */
export const saveHotColdSession = async (userId: string, session: HotColdSession): Promise<void> => {
  await setDoc(ref(userId, COL.sessions, session.id), stripUndefined(session));
};

export const deleteHotColdSession = async (userId: string, id: string): Promise<void> => {
  await deleteDoc(ref(userId, COL.sessions, id));
};

export const newHotColdId = (userId: string): string => doc(col(userId, COL.sessions)).id;

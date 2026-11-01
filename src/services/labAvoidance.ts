import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { AvoidancePrefs, AvoidanceTask } from '../types/avoidance';
import { DEFAULT_AVOIDANCE_PREFS } from '../data/avoidance';
import { stripUndefined } from './labWorkouts';

// =============================================================================
// Avoidance Training (Lab) storage, in users/{uid}/lab_avoidance_* — the
// wildcard rule already covers them. Nothing here writes completionLogs or
// habits, and the old users/{uid}/avoidanceTasks is only ever read
// (services/avoidanceTasks.ts). Spec: docs/micro-apps/avoidance.md.
// =============================================================================

const COL = {
  tasks: 'lab_avoidance_tasks',
  prefs: 'lab_avoidance_prefs',
} as const;

const PREFS_DOC = 'main';

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

export const getAvoidancePrefs = async (userId: string): Promise<AvoidancePrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  return { ...DEFAULT_AVOIDANCE_PREFS, ...(snap.exists() ? (snap.data() as Partial<AvoidancePrefs>) : {}) };
};

export const saveAvoidancePrefs = async (userId: string, changes: Partial<AvoidancePrefs>): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

/** The whole list: a short personal one, so no window or index. */
export const listAvoidanceTasks = async (userId: string): Promise<AvoidanceTask[]> => {
  const snap = await getDocs(col(userId, COL.tasks));
  return snap.docs.map((d) => ({ ...(d.data() as AvoidanceTask), id: d.id }));
};

/**
 * The whole task, keyed by its id: a retried save or an edit overwrites rather
 * than duplicates, and a field set to undefined (an un-cleared rating) goes.
 */
export const saveAvoidanceTask = async (userId: string, task: AvoidanceTask): Promise<void> => {
  await setDoc(ref(userId, COL.tasks, task.id), stripUndefined(task));
};

/** Several at once (bringing over the old list): all or nothing. */
export const saveAvoidanceTasks = async (userId: string, tasks: AvoidanceTask[]): Promise<void> => {
  const batch = writeBatch(db);
  for (const t of tasks) batch.set(ref(userId, COL.tasks, t.id), stripUndefined(t));
  await batch.commit();
};

export const deleteAvoidanceTask = async (userId: string, id: string): Promise<void> => {
  await deleteDoc(ref(userId, COL.tasks, id));
};

export const newAvoidanceId = (userId: string): string => doc(col(userId, COL.tasks)).id;

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { AvoidanceTask } from '../types';

const tasksRef = (userId: string) =>
  collection(db, 'users', userId, 'avoidanceTasks');

export async function getAvoidanceTasks(userId: string): Promise<AvoidanceTask[]> {
  const snap = await getDocs(query(tasksRef(userId), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<AvoidanceTask, 'id'>),
  }));
}

export async function addAvoidanceTask(
  userId: string,
  text: string,
  category: string,
): Promise<string> {
  const ref = await addDoc(tasksRef(userId), {
    userId,
    text,
    category,
    createdAt: new Date().toISOString(),
    completedDates: [],
  });
  return ref.id;
}

export async function markTaskCompleted(
  userId: string,
  taskId: string,
  dateStr: string,
): Promise<void> {
  await updateDoc(doc(tasksRef(userId), taskId), {
    completedDates: arrayUnion(dateStr),
  });
}

export async function markTaskUncompleted(
  userId: string,
  taskId: string,
  dateStr: string,
): Promise<void> {
  await updateDoc(doc(tasksRef(userId), taskId), {
    completedDates: arrayRemove(dateStr),
  });
}

export async function deleteAvoidanceTask(userId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(tasksRef(userId), taskId));
}

/** Returns how many consecutive days (ending today) had at least one completed task. */
export function computeAvoidanceStreak(tasks: AvoidanceTask[], todayStr: string): number {
  const datesWithCompletion = new Set<string>();
  for (const task of tasks) {
    for (const date of task.completedDates) {
      datesWithCompletion.add(date);
    }
  }

  const [y, m, d] = todayStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const dt = new Date(base);
    dt.setDate(dt.getDate() - i);
    const ds = [
      dt.getFullYear(),
      String(dt.getMonth() + 1).padStart(2, '0'),
      String(dt.getDate()).padStart(2, '0'),
    ].join('-');
    if (datesWithCompletion.has(ds)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

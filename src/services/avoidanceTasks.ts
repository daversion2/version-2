import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
  category?: string,
): Promise<string> {
  const ref = await addDoc(tasksRef(userId), {
    userId,
    text,
    category: category || '',
    createdAt: new Date().toISOString(),
    status: 'active',
  });
  return ref.id;
}

/** Conquer a task for good: mark it done, stamp the completion date/time. */
export async function completeTask(
  userId: string,
  taskId: string,
  dateStr: string,
  isoNow: string,
): Promise<void> {
  await updateDoc(doc(tasksRef(userId), taskId), {
    status: 'done',
    completedDate: dateStr,
    completedAt: isoNow,
  });
}

/** Undo a conquer — put the task back in the active queue. */
export async function uncompleteTask(userId: string, taskId: string): Promise<void> {
  await updateDoc(doc(tasksRef(userId), taskId), {
    status: 'active',
    completedDate: deleteField(),
    completedAt: deleteField(),
  });
}

/** Remove a task entirely — does NOT count as conquered. */
export async function deleteAvoidanceTask(userId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(tasksRef(userId), taskId));
}

/** Consecutive days (ending today) on which at least one task was conquered. */
export function computeAvoidanceStreak(tasks: AvoidanceTask[], todayStr: string): number {
  const conqueredDates = new Set<string>();
  for (const task of tasks) {
    if (task.status === 'done' && task.completedDate) {
      conqueredDates.add(task.completedDate);
    }
  }
  if (conqueredDates.size === 0) return 0;

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
    if (conqueredDates.has(ds)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

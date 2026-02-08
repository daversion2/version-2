import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Nudge, HabitDifficulty } from '../types';

const habitsRef = (userId: string) =>
  collection(db, 'users', userId, 'habits');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

/**
 * Returns the Monday 00:00 and Sunday 23:59:59.999 of the current week in local time,
 * formatted as ISO date strings (YYYY-MM-DD).
 */
export const getCurrentWeekBounds = (): { mondayStr: string; sundayStr: string } => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { mondayStr: fmt(monday), sundayStr: fmt(sunday) };
};

export const getActiveHabits = async (userId: string): Promise<Nudge[]> => {
  const q = query(habitsRef(userId), where('is_active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    // Default for habits created before this field existed
    target_count_per_week: d.data().target_count_per_week ?? 3,
  } as Nudge));
};

export const createHabit = async (
  userId: string,
  data: { name: string; category_id: string; target_count_per_week: number }
): Promise<string> => {
  const docRef = await addDoc(habitsRef(userId), {
    ...data,
    user_id: userId,
    is_active: true,
    created_by_user: true,
  });
  return docRef.id;
};

export const updateHabit = async (
  userId: string,
  habitId: string,
  data: Partial<Nudge>
) => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  await updateDoc(ref, data);
};

/**
 * Log a habit completion with optional backdating
 * @param userId - User ID
 * @param habitId - Habit ID
 * @param difficulty - 'easy' (1 pt) or 'challenging' (2 pts)
 * @param date - Optional YYYY-MM-DD date string for backdating (defaults to today)
 */
export const logHabitCompletion = async (
  userId: string,
  habitId: string,
  difficulty: HabitDifficulty,
  date?: string
) => {
  const points = difficulty === 'easy' ? 1 : 2;
  const now = new Date();
  const logDate = date || now.toISOString().split('T')[0];

  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'nudge',
    reference_id: habitId,
    points,
    difficulty: points,
    date: logDate,
    completed_at: now.toISOString(), // Actual time logged
  });
};

/**
 * Returns a map of habitId -> completion count for the current Monday–Sunday week.
 */
export const getWeeklyCompletionCounts = async (
  userId: string
): Promise<Record<string, number>> => {
  const { mondayStr, sundayStr } = getCurrentWeekBounds();

  // Single-field query to avoid needing a composite index; filter dates client-side
  const q = query(logsRef(userId), where('type', '==', 'nudge'));
  const snap = await getDocs(q);

  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const date = data.date as string;
    if (date >= mondayStr && date <= sundayStr) {
      const refId = data.reference_id as string;
      counts[refId] = (counts[refId] || 0) + 1;
    }
  });

  return counts;
};

/**
 * Returns active habits that have NOT been logged for a specific date.
 * Useful for showing available habits to backdate.
 */
export const getUnloggedHabitsForDate = async (
  userId: string,
  date: string
): Promise<Nudge[]> => {
  // Get all active habits
  const activeHabits = await getActiveHabits(userId);

  // Get all habit logs for the specified date
  const q = query(logsRef(userId), where('type', '==', 'nudge'));
  const snap = await getDocs(q);

  const loggedHabitIds = new Set<string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.date === date) {
      loggedHabitIds.add(data.reference_id as string);
    }
  });

  // Return habits not logged for that date
  return activeHabits.filter((habit) => !loggedHabitIds.has(habit.id));
};

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Nudge, HabitDifficulty, CompletionLog, HabitStreakInfo, HabitStats } from '../types';

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
 * Log a habit completion with optional backdating and notes
 * @param userId - User ID
 * @param habitId - Habit ID
 * @param difficulty - 'easy' (1 pt) or 'challenging' (2 pts)
 * @param date - Optional YYYY-MM-DD date string for backdating (defaults to today)
 * @param notes - Optional notes for this completion
 */
export const logHabitCompletion = async (
  userId: string,
  habitId: string,
  difficulty: HabitDifficulty,
  date?: string,
  notes?: string
) => {
  const points = difficulty === 'easy' ? 1 : 2;
  const now = new Date();
  const logDate = date || now.toISOString().split('T')[0];

  const logData: Record<string, any> = {
    user_id: userId,
    type: 'nudge',
    reference_id: habitId,
    points,
    difficulty: points,
    date: logDate,
    completed_at: now.toISOString(), // Actual time logged
  };

  // Only add notes if provided and non-empty
  if (notes && notes.trim()) {
    logData.notes = notes.trim();
  }

  await addDoc(logsRef(userId), logData);
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

/**
 * Get a single habit by ID
 */
export const getHabitById = async (
  userId: string,
  habitId: string
): Promise<Nudge | null> => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    target_count_per_week: snap.data().target_count_per_week ?? 3,
  } as Nudge;
};

/**
 * Get all completion logs for a specific habit
 */
export const getHabitCompletionLogs = async (
  userId: string,
  habitId: string
): Promise<CompletionLog[]> => {
  const q = query(
    logsRef(userId),
    where('type', '==', 'nudge'),
    where('reference_id', '==', habitId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as CompletionLog));
};

/**
 * Calculate current and longest streak for a habit
 * A streak is consecutive days with at least one completion
 */
export const getHabitStreak = async (
  userId: string,
  habitId: string
): Promise<HabitStreakInfo> => {
  const logs = await getHabitCompletionLogs(userId, habitId);

  if (logs.length === 0) {
    return { habitId, currentStreak: 0, longestStreak: 0 };
  }

  // Get unique dates sorted in descending order (newest first)
  const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse();

  // Helper to get date string for a Date object
  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Get today and yesterday as strings
  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  // Calculate current streak (must include today or yesterday)
  let currentStreak = 0;
  const dateSet = new Set(uniqueDates);

  // Start from today or yesterday
  let checkDate = new Date(today);
  if (!dateSet.has(todayStr)) {
    if (!dateSet.has(yesterdayStr)) {
      // No recent activity, streak is 0
      currentStreak = 0;
    } else {
      // Start from yesterday
      checkDate = new Date(yesterday);
    }
  }

  if (dateSet.has(toDateStr(checkDate))) {
    while (dateSet.has(toDateStr(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedAsc = [...uniqueDates].sort();

  for (let i = 0; i < sortedAsc.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedAsc[i - 1]);
      const curr = new Date(sortedAsc[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return { habitId, currentStreak, longestStreak };
};

/**
 * Get streaks for multiple habits at once
 */
export const getHabitsStreaks = async (
  userId: string,
  habitIds: string[]
): Promise<Record<string, HabitStreakInfo>> => {
  // Fetch all nudge logs once to avoid multiple queries
  const q = query(logsRef(userId), where('type', '==', 'nudge'));
  const snap = await getDocs(q);

  // Group logs by habit ID
  const logsByHabit: Record<string, string[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const refId = data.reference_id as string;
    if (habitIds.includes(refId)) {
      if (!logsByHabit[refId]) logsByHabit[refId] = [];
      logsByHabit[refId].push(data.date as string);
    }
  });

  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  const result: Record<string, HabitStreakInfo> = {};

  for (const habitId of habitIds) {
    const dates = logsByHabit[habitId] || [];

    if (dates.length === 0) {
      result[habitId] = { habitId, currentStreak: 0, longestStreak: 0 };
      continue;
    }

    const uniqueDates = [...new Set(dates)].sort().reverse();
    const dateSet = new Set(uniqueDates);

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    if (!dateSet.has(todayStr)) {
      if (!dateSet.has(yesterdayStr)) {
        currentStreak = 0;
      } else {
        checkDate = new Date(yesterday);
      }
    }

    if (dateSet.has(toDateStr(checkDate))) {
      while (dateSet.has(toDateStr(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedAsc = [...uniqueDates].sort();

    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    result[habitId] = { habitId, currentStreak, longestStreak };
  }

  return result;
};

/**
 * Get comprehensive stats for a habit (for detail screen)
 */
export const getHabitStats = async (
  userId: string,
  habitId: string
): Promise<HabitStats> => {
  const logs = await getHabitCompletionLogs(userId, habitId);
  const streakInfo = await getHabitStreak(userId, habitId);

  if (logs.length === 0) {
    return {
      habitId,
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      totalPoints: 0,
      firstCompletionDate: null,
      weeklyTrend: [0, 0, 0, 0, 0, 0, 0, 0],
      completionsByDate: {},
    };
  }

  // Total completions and points
  const totalCompletions = logs.length;
  const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);

  // First completion date
  const sortedDates = logs.map((l) => l.date).sort();
  const firstCompletionDate = sortedDates[0];

  // Completions by date for calendar heat map
  const completionsByDate: Record<string, number> = {};
  logs.forEach((l) => {
    completionsByDate[l.date] = (completionsByDate[l.date] || 0) + 1;
  });

  // Weekly trend: last 8 weeks (including current week)
  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // Get start of current week (Monday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const weeklyTrend: number[] = [];

  for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - weekOffset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = toDateStr(weekStart);
    const endStr = toDateStr(weekEnd);

    const weekCount = logs.filter((l) => l.date >= startStr && l.date <= endStr).length;
    weeklyTrend.push(weekCount);
  }

  return {
    habitId,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    totalCompletions,
    totalPoints,
    firstCompletionDate,
    weeklyTrend,
    completionsByDate,
  };
};

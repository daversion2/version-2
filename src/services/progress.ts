import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { subtractWillpowerPoints, recalculateUserStats } from './willpower';
import { getTodayString } from '../utils/date';
import { getActiveHabits, getWeeklyCompletionCounts, getHabitsStreaks } from './habits';
import { db } from './firebase';
import { CompletionLog, Challenge, Nudge, Goal } from '../types';
import { NO_GOAL_COLOR } from '../constants/goalColors';

export interface EnrichedCompletionLog extends CompletionLog {
  name: string;
}

export const getCompletionLogsWithNames = async (
  userId: string,
  date: string
): Promise<EnrichedCompletionLog[]> => {
  const habitsRef = collection(db, 'users', userId, 'habits');

  const [logSnap, challengeSnap, habitSnap] = await Promise.all([
    getDocs(query(logsRef(userId))),
    getDocs(query(challengesRef(userId))),
    getDocs(query(habitsRef)),
  ]);

  const challengeMap = new Map<string, { name: string }>();
  challengeSnap.docs.forEach((d) => {
    const data = d.data() as Challenge;
    challengeMap.set(d.id, { name: data.name });
  });

  const habitMap = new Map<string, { name: string }>();
  habitSnap.docs.forEach((d) => {
    const data = d.data() as Nudge;
    habitMap.set(d.id, { name: data.name });
  });

  return logSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as CompletionLog))
    .filter((log) => log.date === date)
    .map((log) => {
      const ref =
        log.type === 'challenge'
          ? challengeMap.get(log.reference_id)
          : habitMap.get(log.reference_id);
      return {
        ...log,
        name: ref?.name || 'Unknown',
      };
    })
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));
};

export interface GoalStat {
  goalId: string;
  goalName: string;
  goalColor: string;
  points: number;
  completions: number;
}

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

const challengesRef = (userId: string) =>
  collection(db, 'users', userId, 'challenges');

export const getCompletionLogs = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CompletionLog[]> => {
  const snap = await getDocs(query(logsRef(userId)));
  let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionLog));

  if (startDate) {
    logs = logs.filter((l) => l.date >= startDate);
  }
  if (endDate) {
    logs = logs.filter((l) => l.date <= endDate);
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
};

export const calculateWPQ = async (userId: string): Promise<number> => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const startDate = tenDaysAgo.toISOString().split('T')[0];
  const today = getTodayString();

  const snap = await getDocs(query(challengesRef(userId)));
  const challenges = snap.docs
    .map((d) => d.data() as Challenge)
    .filter(
      (c) =>
        (c.status === 'completed' || c.status === 'failed') &&
        c.date >= startDate &&
        c.date <= today
    );

  if (challenges.length === 0) return 0;

  const total = challenges.reduce((sum, c) => sum + (c.difficulty_actual || 0), 0);
  return Math.round((total / challenges.length) * 10) / 10;
};

export const calculateStreak = async (userId: string): Promise<number> => {
  const snap = await getDocs(query(logsRef(userId)));
  if (snap.empty) return 0;

  const dates = [
    ...new Set(snap.docs.map((d) => d.data().date as string)),
  ].sort().reverse();

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

export const getTotalPoints = async (
  userId: string,
  startDate?: string
): Promise<number> => {
  const snap = await getDocs(query(logsRef(userId)));
  let docs = snap.docs.map((d) => d.data());

  if (startDate) {
    docs = docs.filter((d) => (d.date as string) >= startDate);
  }

  return docs.reduce((sum, d) => sum + (d.points as number), 0);
};

export const getGoalBreakdown = async (
  userId: string,
  goals: Goal[],
  startDate?: string
): Promise<GoalStat[]> => {
  const habitsRef = collection(db, 'users', userId, 'habits');

  // Fetch logs, challenges, and habits in parallel
  const [logSnap, challengeSnap, habitSnap] = await Promise.all([
    getDocs(query(logsRef(userId))),
    getDocs(query(challengesRef(userId))),
    getDocs(query(habitsRef)),
  ]);

  // Build lookup maps: reference_id -> goal_ids
  const challengeGoalMap = new Map<string, string[]>();
  challengeSnap.docs.forEach((d) => {
    const data = d.data() as Challenge;
    challengeGoalMap.set(d.id, data.goal_ids || []);
  });

  const habitGoalMap = new Map<string, string[]>();
  habitSnap.docs.forEach((d) => {
    const data = d.data() as Nudge;
    habitGoalMap.set(d.id, data.goal_ids || []);
  });

  // Build goal lookup
  const goalMap = new Map<string, Goal>();
  goals.forEach((g) => goalMap.set(g.id, g));

  // Filter logs by date and aggregate by goal
  const stats = new Map<string, { points: number; completions: number }>();

  logSnap.docs.forEach((d) => {
    const log = d.data() as CompletionLog;
    if (startDate && log.date < startDate) return;

    const goalIds =
      log.type === 'challenge'
        ? challengeGoalMap.get(log.reference_id)
        : habitGoalMap.get(log.reference_id);

    // Attribute to first linked goal, or 'no-goal'
    const goalId = goalIds && goalIds.length > 0 ? goalIds[0] : 'no-goal';
    const existing = stats.get(goalId) || { points: 0, completions: 0 };
    existing.points += log.points;
    existing.completions += 1;
    stats.set(goalId, existing);
  });

  return Array.from(stats.entries())
    .map(([goalId, data]) => {
      const goal = goalMap.get(goalId);
      return {
        goalId,
        goalName: goal?.name || 'No Goal',
        goalColor: goal?.color || NO_GOAL_COLOR,
        ...data,
      };
    })
    .sort((a, b) => b.points - a.points);
};

// Delete a completion log by ID (for habit deletions)
export const deleteCompletionLog = async (
  userId: string,
  logId: string
): Promise<{ pointsRemoved: number }> => {
  const logRef = doc(db, 'users', userId, 'completionLogs', logId);
  const logSnap = await getDoc(logRef);

  if (!logSnap.exists()) {
    throw new Error('Completion log not found');
  }

  const logData = logSnap.data() as CompletionLog;
  const points = logData.points || 0;

  // Delete the log
  await deleteDoc(logRef);

  // Subtract points from user's total
  if (points > 0) {
    await subtractWillpowerPoints(userId, points);
  }

  // Recalculate streak
  await recalculateUserStats(userId);

  return { pointsRemoved: points };
};

// Update a completion log (for editing points/difficulty)
export const updateCompletionLog = async (
  userId: string,
  logId: string,
  data: Partial<CompletionLog>
): Promise<void> => {
  const logRef = doc(db, 'users', userId, 'completionLogs', logId);
  await updateDoc(logRef, data);
};

// Get a single completion log by ID
export const getCompletionLogById = async (
  userId: string,
  logId: string
): Promise<CompletionLog | null> => {
  const logRef = doc(db, 'users', userId, 'completionLogs', logId);
  const snap = await getDoc(logRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CompletionLog;
};

// --- Progress Analytics ---

export const get7DayCompletionRate = async (
  userId: string
): Promise<{ rate: number; activeDays: number; totalDays: 7 }> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const today = getTodayString();
  const logs = await getCompletionLogs(userId, startDate, today);
  const activeDays = new Set(logs.map((l) => l.date)).size;
  return { rate: activeDays / 7, activeDays, totalDays: 7 };
};

export const getWeekComparison = async (
  userId: string
): Promise<{ thisWeek: number; lastWeek: number; bestWeek: number }> => {
  const allLogs = await getCompletionLogs(userId);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  const thisMondayStr = thisMonday.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().split('T')[0];
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  const lastSundayStr = lastSunday.toISOString().split('T')[0];

  let thisWeek = 0;
  let lastWeek = 0;
  const dateCountMap = new Map<string, number>();

  allLogs.forEach((log) => {
    if (log.date >= thisMondayStr && log.date <= todayStr) thisWeek++;
    if (log.date >= lastMondayStr && log.date <= lastSundayStr) lastWeek++;
    dateCountMap.set(log.date, (dateCountMap.get(log.date) || 0) + 1);
  });

  // Find best 7-day window
  const sortedDates = [...dateCountMap.keys()].sort();
  let bestWeek = thisWeek;
  for (const startStr of sortedDates) {
    const windowEnd = new Date(startStr);
    windowEnd.setDate(windowEnd.getDate() + 6);
    const windowEndStr = windowEnd.toISOString().split('T')[0];
    const count = allLogs.filter((l) => l.date >= startStr && l.date <= windowEndStr).length;
    if (count > bestWeek) bestWeek = count;
  }

  return { thisWeek, lastWeek, bestWeek };
};

export const getRecoverySpeed = async (
  userId: string
): Promise<{ avgDaysToRecover: number; totalGaps: number }> => {
  const allLogs = await getCompletionLogs(userId);
  if (allLogs.length === 0) return { avgDaysToRecover: 0, totalGaps: 0 };

  const uniqueDates = [...new Set(allLogs.map((l) => l.date))].sort();
  const gaps: number[] = [];

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000) - 1;
    if (diffDays > 0) gaps.push(Math.min(diffDays, 30));
  }

  if (gaps.length === 0) return { avgDaysToRecover: 0, totalGaps: 0 };
  const avg = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  return { avgDaysToRecover: Math.round(avg * 10) / 10, totalGaps: gaps.length };
};

export const getDayOfWeekPattern = async (
  userId: string
): Promise<Record<number, number>> => {
  const allLogs = await getCompletionLogs(userId);
  const pattern: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  allLogs.forEach((log) => {
    const [y, m, d] = log.date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    pattern[dow] = (pattern[dow] || 0) + 1;
  });

  return pattern;
};

export interface HabitHealthScore {
  id: string;
  name: string;
  score: number;
  weekCompletions: number;
  weekTarget: number;
  currentStreak: number;
}

// --- New Progress Analytics (accumulation-focused) ---

export const getTotalActions = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<number> => {
  const logs = await getCompletionLogs(userId, startDate, endDate);
  return logs.length;
};

export const getActiveDaysCount = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<number> => {
  const logs = await getCompletionLogs(userId, startDate, endDate);
  return new Set(logs.map((l) => l.date)).size;
};

export interface WeeklyTrendPoint {
  weekStart: string;
  count: number;
}

export const getActivityTrendByWeek = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<WeeklyTrendPoint[]> => {
  const logs = await getCompletionLogs(userId, startDate, endDate);
  if (logs.length === 0) return [];

  // Group logs by ISO week (Monday start)
  const weekMap = new Map<string, number>();

  logs.forEach((log) => {
    const d = new Date(log.date + 'T00:00:00');
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];
    weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1);
  });

  return [...weekMap.entries()]
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};

export const getBestStreak = async (userId: string): Promise<number> => {
  const allLogs = await getCompletionLogs(userId);
  if (allLogs.length === 0) return 0;

  const uniqueDates = [...new Set(allLogs.map((l) => l.date))].sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
    const curr = new Date(uniqueDates[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
};

export const getPeriodBreakdown = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{ habits: number; challenges: number }> => {
  const logs = await getCompletionLogs(userId, startDate, endDate);
  let habits = 0;
  let challenges = 0;

  logs.forEach((log) => {
    if (log.type === 'nudge') habits++;
    else if (log.type === 'challenge') challenges++;
  });

  return { habits, challenges };
};

export const getHabitHealthScores = async (userId: string): Promise<HabitHealthScore[]> => {
  const [habits, weeklyCounts] = await Promise.all([
    getActiveHabits(userId),
    getWeeklyCompletionCounts(userId),
  ]);
  if (habits.length === 0) return [];

  const streaks = await getHabitsStreaks(userId, habits.map((h) => h.id));

  return habits
    .map((h) => {
      const weekCompletions = weeklyCounts[h.id] || 0;
      const weekTarget = h.target_count_per_week || 3;
      return {
        id: h.id,
        name: h.name,
        score: Math.min(1, weekCompletions / weekTarget),
        weekCompletions,
        weekTarget,
        currentStreak: streaks[h.id]?.currentStreak || 0,
      };
    })
    .sort((a, b) => b.score - a.score);
};

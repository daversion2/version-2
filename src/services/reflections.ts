import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  DailyReflection,
  DailySummary,
  ReflectionGrade,
  ReflectionStats,
  Challenge,
  Nudge,
  CompletionLog,
} from '../types';
import { getActiveChallenges, getActiveExtendedChallenges, getCurrentDayNumber } from './challenges';
import { getActiveHabits, getCurrentWeekBounds } from './habits';
import { getActiveEnrollment, getTodaysProgramContent } from './programs';

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

const reflectionsRef = (userId: string) =>
  collection(db, 'users', userId, 'reflections');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

// ============================================================================
// GRADE HELPERS
// ============================================================================

const GRADE_TO_NUM: Record<ReflectionGrade, number> = {
  A: 5, B: 4, C: 3, D: 2, F: 1,
};

const NUM_TO_GRADE: [number, ReflectionGrade][] = [
  [4.5, 'A'], [3.5, 'B'], [2.5, 'C'], [1.5, 'D'], [0, 'F'],
];

export function gradeToNumber(grade: ReflectionGrade): number {
  return GRADE_TO_NUM[grade];
}

export function numberToGrade(num: number): ReflectionGrade {
  for (const [threshold, grade] of NUM_TO_GRADE) {
    if (num >= threshold) return grade;
  }
  return 'F';
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ============================================================================
// DAILY SUMMARY BUILDER
// ============================================================================

export const buildDailySummary = async (
  userId: string,
  date: string
): Promise<DailySummary> => {
  const [
    activeDailyChallenges,
    activeExtendedChallenges,
    activeHabits,
    activeEnrollment,
  ] = await Promise.all([
    getActiveChallenges(userId),
    getActiveExtendedChallenges(userId),
    getActiveHabits(userId),
    getActiveEnrollment(userId),
  ]);

  // Get today's completion logs for habits
  const logSnap = await getDocs(query(logsRef(userId), where('type', '==', 'nudge')));
  const todayHabitLogs = logSnap.docs
    .map(d => d.data() as CompletionLog)
    .filter(l => l.date === date);

  // Count completions per habit today
  const habitCompletionsToday: Record<string, number> = {};
  todayHabitLogs.forEach(l => {
    habitCompletionsToday[l.reference_id] = (habitCompletionsToday[l.reference_id] || 0) + 1;
  });

  // Get this week's habit completions for determining optional vs missed
  const { mondayStr, sundayStr } = getCurrentWeekBounds();
  const allNudgeLogs = logSnap.docs
    .map(d => d.data() as CompletionLog)
    .filter(l => l.date >= mondayStr && l.date <= sundayStr);
  const weeklyHabitCounts: Record<string, number> = {};
  allNudgeLogs.forEach(l => {
    weeklyHabitCounts[l.reference_id] = (weeklyHabitCounts[l.reference_id] || 0) + 1;
  });

  // Get today's challenge completion logs
  const challengeLogSnap = await getDocs(query(logsRef(userId), where('type', '==', 'challenge')));
  const todayChallengeLogIds = new Set(
    challengeLogSnap.docs
      .map(d => d.data() as CompletionLog)
      .filter(l => l.date === date)
      .map(l => l.reference_id)
  );

  // Build challenge summary
  const completedChallenges: DailySummary['completed_challenges'] = [];
  const missedChallenges: DailySummary['missed_challenges'] = [];

  // Active daily challenges still not completed = missed
  activeDailyChallenges.forEach(c => {
    if (todayChallengeLogIds.has(c.id)) {
      completedChallenges.push({ name: c.name, difficulty: c.difficulty_actual || c.difficulty_expected });
    } else {
      missedChallenges.push({ name: c.name });
    }
  });

  // Extended challenges - check today's milestone
  activeExtendedChallenges.forEach(c => {
    if (!c.milestones || !c.start_date) return;
    const dayNum = getCurrentDayNumber(c.start_date);
    const todayMilestone = c.milestones.find(m => m.day_number === dayNum);
    if (todayMilestone?.completed) {
      completedChallenges.push({ name: `${c.name} (Day ${dayNum})`, difficulty: todayMilestone.points_awarded });
    } else {
      missedChallenges.push({ name: `${c.name} (Day ${dayNum} check-in)` });
    }
  });

  // Build habit summary
  const completedHabits: DailySummary['completed_habits'] = [];
  const missedHabits: DailySummary['missed_habits'] = [];
  const optionalHabits: DailySummary['optional_habits'] = [];

  const dayOfWeek = new Date().getDay(); // 0=Sun
  const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Mon=1 through Sun=7
  const daysRemaining = 7 - daysPassedThisWeek;

  activeHabits.forEach(habit => {
    const doneToday = habitCompletionsToday[habit.id] || 0;
    const doneThisWeek = weeklyHabitCounts[habit.id] || 0;
    const target = habit.target_count_per_week;
    const remaining = target - doneThisWeek;

    if (doneToday > 0) {
      completedHabits.push({ name: habit.name, target, done: doneThisWeek });
    } else if (remaining > daysRemaining) {
      // They need to do it today to stay on track
      missedHabits.push({ name: habit.name, target, done: doneThisWeek });
    } else {
      // They still have enough days remaining — optional
      optionalHabits.push({ name: habit.name, remaining });
    }
  });

  // Build program summary
  let programStatus: DailySummary['program_status'];
  if (activeEnrollment) {
    try {
      const content = await getTodaysProgramContent(userId, activeEnrollment.id);
      programStatus = {
        name: activeEnrollment.program_name,
        checked_in: content?.isCheckedIn ?? false,
        day_number: content?.dayNumber,
      };
    } catch {
      programStatus = {
        name: activeEnrollment.program_name,
        checked_in: false,
      };
    }
  }

  return {
    completed_challenges: completedChallenges,
    missed_challenges: missedChallenges,
    completed_habits: completedHabits,
    missed_habits: missedHabits,
    optional_habits: optionalHabits,
    program_status: programStatus,
  };
};

// ============================================================================
// CRUD
// ============================================================================

export const saveReflection = async (
  userId: string,
  reflection: Omit<DailyReflection, 'id'>
): Promise<string> => {
  // Use date as document ID so only one reflection per day
  const docId = reflection.date;
  const docRef = doc(db, 'users', userId, 'reflections', docId);

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(reflection).filter(([_, v]) => v !== undefined)
  );

  await setDoc(docRef, cleanData);

  // Update user profile with reflection date and streak
  await updateReflectionStreak(userId, reflection.date);

  return docId;
};

export const getReflection = async (
  userId: string,
  date: string
): Promise<DailyReflection | null> => {
  const docRef = doc(db, 'users', userId, 'reflections', date);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DailyReflection;
};

export const getReflections = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyReflection[]> => {
  const snap = await getDocs(query(reflectionsRef(userId)));
  let reflections = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyReflection));

  if (startDate) {
    reflections = reflections.filter(r => r.date >= startDate);
  }
  if (endDate) {
    reflections = reflections.filter(r => r.date <= endDate);
  }

  return reflections.sort((a, b) => b.date.localeCompare(a.date));
};

export const hasReflectedToday = async (userId: string): Promise<boolean> => {
  const today = getTodayStr();
  const docRef = doc(db, 'users', userId, 'reflections', today);
  const snap = await getDoc(docRef);
  return snap.exists();
};

// ============================================================================
// STREAK CALCULATION
// ============================================================================

const updateReflectionStreak = async (
  userId: string,
  date: string
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const lastDate = userData?.last_reflection_date;
  let currentStreak = userData?.reflection_streak || 0;

  if (!lastDate) {
    currentStreak = 1;
  } else {
    // Check if this is the next consecutive day
    const last = new Date(lastDate);
    const current = new Date(date);
    last.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diffDays = Math.round((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays === 0) {
      // Same day, don't change streak
    } else {
      // Streak broken
      currentStreak = 1;
    }
  }

  await updateDoc(userRef, {
    last_reflection_date: date,
    reflection_streak: currentStreak,
  });
};

export const getReflectionStreak = async (
  userId: string
): Promise<{ current: number; longest: number }> => {
  const reflections = await getReflections(userId);
  if (reflections.length === 0) return { current: 0, longest: 0 };

  const dates = reflections.map(r => r.date).sort().reverse();
  const dateSet = new Set(dates);

  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  // Current streak
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

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedAsc = [...dates].sort();

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

  return { current: currentStreak, longest: longestStreak };
};

// ============================================================================
// STATS & AGGREGATION
// ============================================================================

export const getReflectionStats = async (
  userId: string,
  startDate?: string
): Promise<ReflectionStats> => {
  const reflections = await getReflections(userId, startDate);
  const streak = await getReflectionStreak(userId);

  const distribution: Record<ReflectionGrade, number> = {
    A: 0, B: 0, C: 0, D: 0, F: 0,
  };

  if (reflections.length === 0) {
    return {
      totalReflections: 0,
      averageGrade: 0,
      averageGradeLetter: 'F',
      currentStreak: streak.current,
      longestStreak: streak.longest,
      gradeDistribution: distribution,
    };
  }

  let gradeSum = 0;
  reflections.forEach(r => {
    distribution[r.grade]++;
    gradeSum += gradeToNumber(r.grade);
  });

  const avg = gradeSum / reflections.length;

  return {
    totalReflections: reflections.length,
    averageGrade: Math.round(avg * 10) / 10,
    averageGradeLetter: numberToGrade(avg),
    currentStreak: streak.current,
    longestStreak: streak.longest,
    gradeDistribution: distribution,
  };
};

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
  DailySummaryComparisons,
  ReflectionGrade,
  ReflectionStats,
  CompletionLog,
  JournalSearchResult,
} from '../types';
import { getPastChallenges } from './challenges';

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

const fmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const buildDailySummary = async (
  userId: string,
  date: string
): Promise<DailySummary> => {
  const now = new Date();

  // Compute all date range boundaries
  const yesterday = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const thisMondayStr = fmt(thisMonday);
  const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
  const lastMondayStr = fmt(lastMonday);
  const lastSundayStr = fmt(new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1));

  const firstOfThisMonth = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const firstOfLastMonth = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastDayOfLastMonth = fmt(new Date(now.getFullYear(), now.getMonth(), 0));

  // Single broad query: all logs from start of last month to today
  const [logSnap, userSnap] = await Promise.all([
    getDocs(query(logsRef(userId), where('date', '>=', firstOfLastMonth))),
    getDoc(doc(db, 'users', userId)),
  ]);

  const userData = userSnap.data() || {};
  const allLogs = logSnap.docs.map(d => d.data() as CompletionLog);

  const habitLogs = allLogs.filter(l => l.type === 'nudge');
  const challengeLogs = allLogs.filter(l => l.type === 'challenge');

  // Time-bucket counts
  const countIn = (logs: CompletionLog[], from: string, to: string) =>
    logs.filter(l => l.date >= from && l.date <= to).length;

  const habitsThisWeek = countIn(habitLogs, thisMondayStr, date);
  const habitsLastWeek = countIn(habitLogs, lastMondayStr, lastSundayStr);
  const habitsThisMonth = countIn(habitLogs, firstOfThisMonth, date);
  const habitsLastMonth = countIn(habitLogs, firstOfLastMonth, lastDayOfLastMonth);
  const habitsToday = countIn(habitLogs, date, date);
  const habitsYesterday = countIn(habitLogs, yesterday, yesterday);

  const challengesThisWeek = countIn(challengeLogs, thisMondayStr, date);
  const challengesLastWeek = countIn(challengeLogs, lastMondayStr, lastSundayStr);
  const challengesThisMonth = countIn(challengeLogs, firstOfThisMonth, date);
  const challengesLastMonth = countIn(challengeLogs, firstOfLastMonth, lastDayOfLastMonth);
  const challengesToday = countIn(challengeLogs, date, date);
  const challengesYesterday = countIn(challengeLogs, yesterday, yesterday);

  // Build comparisons — only store positive diffs
  const comparisons: DailySummaryComparisons = {};
  const habitDiffWeek = habitsThisWeek - habitsLastWeek;
  const challengeDiffWeek = challengesThisWeek - challengesLastWeek;
  const habitDiffMonth = habitsThisMonth - habitsLastMonth;
  const challengeDiffMonth = challengesThisMonth - challengesLastMonth;
  const habitDiffDay = habitsToday - habitsYesterday;
  const challengeDiffDay = challengesToday - challengesYesterday;

  if (habitDiffWeek > 0) comparisons.habits_more_vs_last_week = habitDiffWeek;
  if (challengeDiffWeek > 0) comparisons.challenges_more_vs_last_week = challengeDiffWeek;
  if (habitDiffMonth > 0) comparisons.habits_more_vs_last_month = habitDiffMonth;
  if (challengeDiffMonth > 0) comparisons.challenges_more_vs_last_month = challengeDiffMonth;
  if (habitDiffDay > 0) comparisons.habits_more_vs_yesterday = habitDiffDay;
  if (challengeDiffDay > 0) comparisons.challenges_more_vs_yesterday = challengeDiffDay;

  return {
    habits_this_week: habitsThisWeek,
    challenges_this_week: challengesThisWeek,
    total_xp: userData.totalWillpowerPoints ?? 0,
    total_habits_all_time: userData.totalHabitsCompleted ?? 0,
    total_challenges_all_time: userData.totalChallengesCompleted ?? 0,
    comparisons,
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

// ============================================================================
// JOURNAL SEARCH
// ============================================================================

const REFLECTION_FIELDS = [
  { key: 'prompt_went_well' as const, label: 'What went well' },
  { key: 'prompt_hardest' as const, label: 'What was hardest' },
  { key: 'prompt_tomorrow' as const, label: 'Plan for tomorrow' },
  { key: 'prompt_why_connection' as const, label: 'Why connection' },
];

const CHALLENGE_FIELDS = [
  { key: 'reflection_note' as const, label: 'Post-challenge journal' },
  { key: 'failure_reflection' as const, label: 'What got in the way' },
];

export const searchJournalEntries = async (
  userId: string,
  searchQuery: string,
  cachedReflections?: DailyReflection[],
): Promise<JournalSearchResult[]> => {
  const q = searchQuery.toLowerCase().trim();
  if (q.length < 2) return [];

  const [reflections, challenges] = await Promise.all([
    cachedReflections ? Promise.resolve(cachedReflections) : getReflections(userId),
    getPastChallenges(userId),
  ]);

  const results: JournalSearchResult[] = [];

  // Search reflections
  for (const r of reflections) {
    for (const field of REFLECTION_FIELDS) {
      const text = r[field.key];
      if (text && text.toLowerCase().includes(q)) {
        results.push({
          id: r.id,
          source: 'reflection',
          date: r.date,
          matchedText: text,
          matchedField: field.label,
          contextLabel: 'Daily Reflection',
          grade: r.grade,
        });
        break; // one result per reflection, prioritize first matching field
      }
    }
  }

  // Search challenge journals
  for (const c of challenges) {
    for (const field of CHALLENGE_FIELDS) {
      const text = c[field.key];
      if (text && text.toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          source: 'challenge',
          date: c.date || c.completed_at?.split('T')[0] || c.created_at.split('T')[0],
          matchedText: text,
          matchedField: field.label,
          contextLabel: c.name,
          difficulty: c.difficulty_actual || c.difficulty_expected,
          status: c.status as 'completed' | 'failed',
        });
        break;
      }
    }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
};

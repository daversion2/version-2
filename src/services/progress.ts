import {
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { CompletionLog, Challenge, Nudge } from '../types';

export interface CategoryStat {
  category: string;
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
  const today = new Date().toISOString().split('T')[0];

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

export const getCategoryBreakdown = async (
  userId: string,
  startDate?: string
): Promise<CategoryStat[]> => {
  const habitsRef = collection(db, 'users', userId, 'habits');

  // Fetch logs, challenges, and habits in parallel
  const [logSnap, challengeSnap, habitSnap] = await Promise.all([
    getDocs(query(logsRef(userId))),
    getDocs(query(challengesRef(userId))),
    getDocs(query(habitsRef)),
  ]);

  // Build lookup maps: reference_id -> category
  const challengeMap = new Map<string, string>();
  challengeSnap.docs.forEach((d) => {
    const data = d.data() as Challenge;
    challengeMap.set(d.id, data.category_id);
  });

  const habitMap = new Map<string, string>();
  habitSnap.docs.forEach((d) => {
    const data = d.data() as Nudge;
    habitMap.set(d.id, data.category_id);
  });

  // Filter logs by date and aggregate by category
  const stats = new Map<string, { points: number; completions: number }>();

  logSnap.docs.forEach((d) => {
    const log = d.data() as CompletionLog;
    if (startDate && log.date < startDate) return;

    const category =
      log.type === 'challenge'
        ? challengeMap.get(log.reference_id)
        : habitMap.get(log.reference_id);

    const cat = category || 'Uncategorized';
    const existing = stats.get(cat) || { points: 0, completions: 0 };
    existing.points += log.points;
    existing.completions += 1;
    stats.set(cat, existing);
  });

  return Array.from(stats.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.points - a.points);
};

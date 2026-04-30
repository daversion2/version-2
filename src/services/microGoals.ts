import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MicroGoal, MicroGoalStatus } from '../types';
import { MICRO_GOAL_CONSTANTS } from '../constants/microGoals';

const microGoalsRef = (userId: string) =>
  collection(db, 'users', userId, 'microGoals');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Get all micro-goals for today, sorted by deadline ascending.
 */
export const getTodaysMicroGoals = async (userId: string): Promise<MicroGoal[]> => {
  const today = getTodayStr();
  const q = query(microGoalsRef(userId), where('date', '==', today));
  const snap = await getDocs(q);

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as MicroGoal))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
};

/**
 * Get micro-goals for a specific date (for daily summary).
 */
export const getMicroGoalsForDate = async (
  userId: string,
  date: string
): Promise<MicroGoal[]> => {
  const q = query(microGoalsRef(userId), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as MicroGoal))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
};

/**
 * Get count of today's micro-goals (for cap enforcement).
 */
export const getTodaysCount = async (userId: string): Promise<number> => {
  const today = getTodayStr();
  const q = query(microGoalsRef(userId), where('date', '==', today));
  const snap = await getDocs(q);
  return snap.size;
};

/**
 * Create a new micro-goal for today.
 * Enforces the daily cap of MAX_PER_DAY.
 */
export const createMicroGoal = async (
  userId: string,
  data: {
    description: string;
    deadline: string; // HH:MM
    goal_ids?: string[];
  }
): Promise<string> => {
  const today = getTodayStr();

  const currentCount = await getTodaysCount(userId);
  if (currentCount >= MICRO_GOAL_CONSTANTS.MAX_PER_DAY) {
    throw new Error(`Maximum ${MICRO_GOAL_CONSTANTS.MAX_PER_DAY} sprints per day`);
  }

  const docRef = await addDoc(microGoalsRef(userId), {
    user_id: userId,
    description: data.description.trim(),
    date: today,
    deadline: data.deadline,
    status: 'active' as MicroGoalStatus,
    goal_ids: data.goal_ids || [],
    created_at: new Date().toISOString(),
    order: currentCount,
  });

  return docRef.id;
};

/**
 * Complete a micro-goal. Creates a completion log entry.
 * Returns whether this completion triggers a clean sweep.
 */
export const completeMicroGoal = async (
  userId: string,
  microGoalId: string,
  pointsAwarded: number
): Promise<{ isCleanSweep: boolean }> => {
  const ref = doc(db, 'users', userId, 'microGoals', microGoalId);
  const now = new Date();

  await updateDoc(ref, {
    status: 'completed' as MicroGoalStatus,
    completed_at: now.toISOString(),
    points_awarded: pointsAwarded,
  });

  // Create completion log
  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'micro_goal',
    reference_id: microGoalId,
    points: pointsAwarded,
    difficulty: 1,
    date: getTodayStr(),
    completed_at: now.toISOString(),
  });

  // Check for clean sweep
  const todaysGoals = await getTodaysMicroGoals(userId);
  const totalGoals = todaysGoals.length;
  const completedGoals = todaysGoals.filter(g => g.status === 'completed').length;
  const isCleanSweep =
    totalGoals >= MICRO_GOAL_CONSTANTS.MIN_FOR_CLEAN_SWEEP &&
    completedGoals === totalGoals;

  return { isCleanSweep };
};

/**
 * Delete a micro-goal (only allowed while status is 'active').
 */
export const deleteMicroGoal = async (
  userId: string,
  microGoalId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'microGoals', microGoalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Sprint not found');

  const data = snap.data();
  if (data.status !== 'active') {
    throw new Error('Can only delete active sprints');
  }

  await deleteDoc(ref);
};

/**
 * Check if a micro-goal's deadline has passed (pure function for UI).
 */
export const isExpired = (microGoal: MicroGoal): boolean => {
  if (microGoal.status === 'completed') return false;

  const now = new Date();
  const todayStr = getTodayStr();

  // Past day = expired
  if (microGoal.date < todayStr) return true;

  // Same day, check time
  if (microGoal.date === todayStr) {
    const [hours, minutes] = microGoal.deadline.split(':').map(Number);
    const deadlineDate = new Date();
    deadlineDate.setHours(hours, minutes, 0, 0);
    return now > deadlineDate;
  }

  return false;
};

/**
 * Get micro-goal summary data for a date (for DailySummary).
 */
export const getMicroGoalSummary = async (
  userId: string,
  date: string
): Promise<{
  completed: { description: string; deadline: string }[];
  missed: { description: string; deadline: string }[];
  cleanSweep: boolean;
}> => {
  const goals = await getMicroGoalsForDate(userId, date);

  const completed = goals
    .filter(g => g.status === 'completed')
    .map(g => ({ description: g.description, deadline: g.deadline }));

  const missed = goals
    .filter(g => g.status !== 'completed')
    .map(g => ({ description: g.description, deadline: g.deadline }));

  const cleanSweep =
    goals.length >= MICRO_GOAL_CONSTANTS.MIN_FOR_CLEAN_SWEEP &&
    missed.length === 0 &&
    completed.length > 0;

  return { completed, missed, cleanSweep };
};

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Goal, GoalStatus, Challenge, Nudge, MicroGoal, ProgramEnrollment } from '../types';
import { GOAL_CONSTANTS } from '../constants/goals';

const goalsRef = (userId: string) =>
  collection(db, 'users', userId, 'goals');

const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Get all active goals, sorted by end_date ascending.
 */
export const getActiveGoals = async (userId: string): Promise<Goal[]> => {
  const q = query(
    goalsRef(userId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  const goals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
  return goals.sort((a, b) => a.end_date.localeCompare(b.end_date));
};

/**
 * Get all goals (any status), sorted by created_at descending.
 */
export const getAllGoals = async (userId: string): Promise<Goal[]> => {
  const snap = await getDocs(goalsRef(userId));
  const goals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
  return goals.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

/**
 * Get a single goal by ID.
 */
export const getGoalById = async (
  userId: string,
  goalId: string
): Promise<Goal | null> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Goal;
};

/**
 * Create a new goal. Enforces MAX_ACTIVE cap.
 */
export const createGoal = async (
  userId: string,
  data: {
    name: string;
    description?: string;
    end_date: string;
  }
): Promise<string> => {
  const active = await getActiveGoals(userId);
  if (active.length >= GOAL_CONSTANTS.MAX_ACTIVE) {
    throw new Error(`Maximum ${GOAL_CONSTANTS.MAX_ACTIVE} active goals allowed`);
  }

  const now = new Date().toISOString();
  const docRef = await addDoc(goalsRef(userId), {
    user_id: userId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    status: 'active' as GoalStatus,
    start_date: getTodayStr(),
    end_date: data.end_date,
    manual_progress: 0,
    created_at: now,
  });

  return docRef.id;
};

/**
 * Update a goal's editable fields.
 */
export const updateGoal = async (
  userId: string,
  goalId: string,
  updates: {
    name?: string;
    description?: string;
    end_date?: string;
    manual_progress?: number;
  }
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) clean.name = updates.name.trim();
  if (updates.description !== undefined) clean.description = updates.description.trim() || null;
  if (updates.end_date !== undefined) clean.end_date = updates.end_date;
  if (updates.manual_progress !== undefined) clean.manual_progress = Math.max(0, Math.min(100, updates.manual_progress));
  await updateDoc(ref, clean);
};

/**
 * Mark a goal as completed.
 */
export const completeGoal = async (
  userId: string,
  goalId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, {
    status: 'completed' as GoalStatus,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

/**
 * Mark a goal as not completed (used at expiry).
 */
export const markGoalNotCompleted = async (
  userId: string,
  goalId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, {
    status: 'not_completed' as GoalStatus,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Extend a goal's deadline. Only allowed if goal is still active and not expired.
 */
export const extendGoal = async (
  userId: string,
  goalId: string,
  newEndDate: string
): Promise<void> => {
  const goal = await getGoalById(userId, goalId);
  if (!goal) throw new Error('Goal not found');
  if (goal.status !== 'active') throw new Error('Can only extend active goals');
  if (isGoalExpired(goal)) throw new Error('Cannot extend an expired goal');

  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, {
    end_date: newEndDate,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Archive a goal.
 */
export const archiveGoal = async (
  userId: string,
  goalId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, {
    status: 'archived' as GoalStatus,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Check if a goal is past its end_date.
 */
export const isGoalExpired = (goal: Goal): boolean => {
  return goal.end_date < getTodayStr();
};

/**
 * Get active goals that are past their end_date (need resolution).
 */
export const getExpiredUnresolvedGoals = async (userId: string): Promise<Goal[]> => {
  const active = await getActiveGoals(userId);
  const today = getTodayStr();
  return active.filter(g => g.end_date < today);
};

/**
 * Get all items tagged to a specific goal.
 */
export const getItemsForGoal = async (
  userId: string,
  goalId: string
): Promise<{
  challenges: Challenge[];
  habits: Nudge[];
  microGoals: MicroGoal[];
  programEnrollments: ProgramEnrollment[];
}> => {
  const challengesQ = query(
    collection(db, 'users', userId, 'challenges'),
    where('goal_ids', 'array-contains', goalId)
  );
  const habitsQ = query(
    collection(db, 'users', userId, 'habits'),
    where('goal_ids', 'array-contains', goalId)
  );
  const microGoalsQ = query(
    collection(db, 'users', userId, 'microGoals'),
    where('goal_ids', 'array-contains', goalId)
  );
  const programsQ = query(
    collection(db, 'users', userId, 'programEnrollments'),
    where('goal_ids', 'array-contains', goalId)
  );

  const [challengesSnap, habitsSnap, microGoalsSnap, programsSnap] = await Promise.all([
    getDocs(challengesQ),
    getDocs(habitsQ),
    getDocs(microGoalsQ),
    getDocs(programsQ),
  ]);

  return {
    challenges: challengesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)),
    habits: habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Nudge)),
    microGoals: microGoalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MicroGoal)),
    programEnrollments: programsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramEnrollment)),
  };
};

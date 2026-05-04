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
import { Goal, GoalStatus, GoalFollowThrough, Challenge, Nudge, MicroGoal, ProgramEnrollment } from '../types';
import { GOAL_CONSTANTS } from '../constants/goals';
import { createHabit } from './habits';
import { createChallenge } from './challenges';

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
 * CBT fields accepted during goal creation.
 */
interface GoalCBTFields {
  deeper_why?: string;
  confidence_baseline?: number;
  negative_story?: string;
  past_attempt_story?: string;
  inner_voice_challenge?: string;
  inner_voice_response?: string;
  good_week_description?: string;
  minimum_action?: string;
  bonus_actions?: string[];
  triggers?: string[];
  trigger_substitutes?: string[];
  environment_changes?: string;
  recovery_plan?: string;
  identity_statement?: string;
  support_person?: string;
  cognitive_distortions?: string[];
}

/**
 * Create a new goal. Enforces MAX_ACTIVE cap. Accepts optional CBT fields.
 */
export const createGoal = async (
  userId: string,
  data: {
    name: string;
    description?: string;
    end_date: string;
  } & GoalCBTFields
): Promise<string> => {
  const active = await getActiveGoals(userId);
  if (active.length >= GOAL_CONSTANTS.MAX_ACTIVE) {
    throw new Error(`Maximum ${GOAL_CONSTANTS.MAX_ACTIVE} active goals allowed`);
  }

  const now = new Date().toISOString();

  // Build doc, stripping undefined values
  const goalDoc: Record<string, unknown> = {
    user_id: userId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    status: 'active' as GoalStatus,
    start_date: getTodayStr(),
    end_date: data.end_date,
    manual_progress: 0,
    created_at: now,
  };

  // Add CBT fields if present
  const cbtKeys: (keyof GoalCBTFields)[] = [
    'deeper_why', 'confidence_baseline', 'negative_story', 'past_attempt_story',
    'inner_voice_challenge', 'inner_voice_response', 'good_week_description',
    'minimum_action', 'bonus_actions', 'triggers', 'trigger_substitutes',
    'environment_changes', 'recovery_plan', 'identity_statement', 'support_person',
    'cognitive_distortions',
  ];
  for (const key of cbtKeys) {
    const val = data[key];
    if (val !== undefined && val !== null && val !== '') {
      goalDoc[key] = typeof val === 'string' ? val.trim() : val;
    }
  }

  const docRef = await addDoc(goalsRef(userId), goalDoc);
  return docRef.id;
};

/**
 * Create a goal along with habits and a first challenge from the onboarding flow.
 */
export const createGoalWithActions = async (
  userId: string,
  goalData: Parameters<typeof createGoal>[1],
  actions: {
    habits: { name: string; category_id: string; target_count_per_week: number }[];
    firstChallenge?: { name: string; category_id: string; difficulty_expected: number };
  }
): Promise<string> => {
  // 1. Create the goal
  const goalId = await createGoal(userId, goalData);

  // 2. Create habits tagged to this goal
  await Promise.all(
    actions.habits.map(h =>
      createHabit(userId, { ...h, goal_ids: [goalId] })
    )
  );

  // 3. Create the first challenge tagged to this goal
  if (actions.firstChallenge) {
    await createChallenge(userId, {
      name: actions.firstChallenge.name,
      category_id: actions.firstChallenge.category_id,
      difficulty_expected: actions.firstChallenge.difficulty_expected,
      date: getTodayStr(),
      challenge_type: 'daily',
      goal_ids: [goalId],
    } as Omit<Challenge, 'id' | 'user_id' | 'status' | 'created_at'>);
  }

  return goalId;
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

/**
 * Compute follow-through stats for a goal based on its tagged items.
 */
export const computeGoalFollowThrough = async (
  userId: string,
  goalId: string
): Promise<GoalFollowThrough> => {
  const items = await getItemsForGoal(userId, goalId);

  // Challenges: completed vs total (active + completed + failed)
  const challengeTotal = items.challenges.length;
  const challengeKept = items.challenges.filter(
    c => c.status === 'completed'
  ).length;

  // Habits: sum weekly target counts vs completion log counts
  // We count total target as sum of target_count_per_week for each habit
  // and kept as the actual completions logged this week
  const habitsQ = query(
    collection(db, 'users', userId, 'completionLogs'),
    where('type', '==', 'nudge')
  );
  const habitsSnap = await getDocs(habitsQ);
  const habitIds = new Set(items.habits.map(h => h.id));

  // Get current week bounds
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  let weeklyHabitKept = 0;
  habitsSnap.docs.forEach(d => {
    const data = d.data();
    if (habitIds.has(data.reference_id) && data.date >= mondayStr && data.date <= sundayStr) {
      weeklyHabitKept++;
    }
  });

  const weeklyHabitTarget = items.habits.reduce(
    (sum, h) => sum + h.target_count_per_week, 0
  );

  // Programs: count completed days vs total days
  let programTotal = 0;
  let programKept = 0;
  for (const enrollment of items.programEnrollments) {
    const e = enrollment as any;
    if (e.completed_days) programKept += (e.completed_days as string[]).length;
    if (e.total_days) programTotal += e.total_days;
    else programTotal += 21; // default program length
  }

  const totalCommitments = challengeTotal + weeklyHabitTarget + programTotal;
  const keptCommitments = challengeKept + weeklyHabitKept + programKept;

  return {
    totalCommitments,
    keptCommitments,
    followThroughRate: totalCommitments > 0 ? keptCommitments / totalCommitments : 0,
    currentWeekCommitments: weeklyHabitTarget + items.challenges.filter(c => c.date >= mondayStr && c.date <= sundayStr).length,
    currentWeekKept: weeklyHabitKept + items.challenges.filter(c => c.status === 'completed' && c.date >= mondayStr && c.date <= sundayStr).length,
  };
};

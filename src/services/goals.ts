import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Goal, GoalStatus, GoalFollowThrough, Challenge, Nudge, ProgramEnrollment,
  MeasurementType, MeasurementConfig, GoalObstacle, VisualizationSettings, GoalDraftStatus,
} from '../types';
import { GOAL_CONSTANTS } from '../constants/goals';
import { pickNextGoalColor, GOAL_COLOR_PALETTE } from '../constants/goalColors';
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
  const goals = snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, color: data.color || GOAL_COLOR_PALETTE[0] } as Goal;
  });
  // Exclude drafts from active goals list
  return goals.filter(g => g.draft_status !== 'draft').sort((a, b) => a.end_date.localeCompare(b.end_date));
};

/**
 * Get all goals (any status), sorted by created_at descending.
 */
export const getAllGoals = async (userId: string): Promise<Goal[]> => {
  const snap = await getDocs(goalsRef(userId));
  const goals = snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, color: data.color || GOAL_COLOR_PALETTE[0] } as Goal;
  });
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
  const data = snap.data();
  return { id: snap.id, ...data, color: data.color || GOAL_COLOR_PALETTE[0] } as Goal;
};

/**
 * CBT fields accepted during goal creation.
 */
interface GoalCBTFields {
  deeper_why?: string;
  why_connection?: string;
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
 * v2 creation flow fields.
 */
interface GoalV2Fields {
  measurement_type?: MeasurementType;
  measurement_config?: MeasurementConfig;
  obstacles?: GoalObstacle[];
  visualization_settings?: VisualizationSettings;
  tracking_habit_id?: string;
  draft_status?: GoalDraftStatus;
}

/**
 * Create a new goal. Enforces MAX_ACTIVE cap (unless draft). Accepts optional CBT and v2 fields.
 */
export const createGoal = async (
  userId: string,
  data: {
    name: string;
    description?: string;
    end_date: string;
  } & GoalCBTFields & GoalV2Fields
): Promise<string> => {
  const isDraft = data.draft_status === 'draft';

  // Only enforce cap for committed goals
  const active = await getActiveGoals(userId);
  if (!isDraft && active.length >= GOAL_CONSTANTS.MAX_ACTIVE) {
    throw new Error(`Maximum ${GOAL_CONSTANTS.MAX_ACTIVE} active goals allowed`);
  }

  const now = new Date().toISOString();

  // Build doc, stripping undefined values
  const goalDoc: Record<string, unknown> = {
    user_id: userId,
    name: data.name.trim(),
    color: pickNextGoalColor(active),
    description: data.description?.trim() || null,
    status: 'active' as GoalStatus,
    start_date: getTodayStr(),
    end_date: data.end_date,
    manual_progress: 0,
    created_at: now,
  };

  // Add draft_status if present
  if (data.draft_status) {
    goalDoc.draft_status = data.draft_status;
  }

  // Add CBT fields if present
  const cbtKeys: (keyof GoalCBTFields)[] = [
    'deeper_why', 'why_connection', 'confidence_baseline', 'negative_story', 'past_attempt_story',
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

  // Add v2 fields if present
  if (data.measurement_type) goalDoc.measurement_type = data.measurement_type;
  if (data.measurement_config) {
    // Strip undefined values — Firestore rejects them
    const cleanConfig: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.measurement_config)) {
      if (v !== undefined) cleanConfig[k] = v;
    }
    goalDoc.measurement_config = cleanConfig;
  }
  if (data.obstacles && data.obstacles.length > 0) goalDoc.obstacles = data.obstacles;
  if (data.visualization_settings) goalDoc.visualization_settings = data.visualization_settings;
  if (data.tracking_habit_id) goalDoc.tracking_habit_id = data.tracking_habit_id;

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
    habits: { name: string; category_id?: string; target_count_per_week: number }[];
    firstChallenge?: { name: string; category_id?: string; difficulty_expected: number };
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
 * Save CBT fields to an existing goal (used by deferred onboarding).
 */
export const saveGoalCBTData = async (
  userId: string,
  goalId: string,
  data: {
    deeper_why?: string;
    why_connection?: string;
    confidence_baseline?: number;
    negative_story?: string;
    inner_voice_challenge?: string;
    inner_voice_response?: string;
    minimum_action?: string;
    bonus_actions?: string[];
    triggers?: string[];
    trigger_substitutes?: string[];
    recovery_plan?: string;
    identity_statement?: string;
  }
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.trim()) clean[key] = val.trim();
    else if (Array.isArray(val) && val.length > 0) clean[key] = val;
    else if (typeof val === 'number') clean[key] = val;
  }
  await updateDoc(ref, clean);
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
    color?: string;
  }
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) clean.name = updates.name.trim();
  if (updates.description !== undefined) clean.description = updates.description.trim() || null;
  if (updates.end_date !== undefined) clean.end_date = updates.end_date;
  if (updates.manual_progress !== undefined) clean.manual_progress = Math.max(0, Math.min(100, updates.manual_progress));
  if (updates.color !== undefined) clean.color = updates.color;
  await updateDoc(ref, clean);
};

/**
 * Set the tracking habit for a hit_total goal.
 */
export const updateGoalTrackingHabit = async (
  userId: string,
  goalId: string,
  habitId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, {
    tracking_habit_id: habitId,
    updated_at: new Date().toISOString(),
  });
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
  const programsQ = query(
    collection(db, 'users', userId, 'programEnrollments'),
    where('goal_ids', 'array-contains', goalId)
  );

  const [challengesSnap, habitsSnap, programsSnap] = await Promise.all([
    getDocs(challengesQ),
    getDocs(habitsQ),
    getDocs(programsQ),
  ]);

  return {
    challenges: challengesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)),
    habits: habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Nudge)),
    programEnrollments: programsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramEnrollment)),
  };
};

// ============================================================================
// DRAFT GOALS
// ============================================================================

/**
 * Create a goal draft. Does NOT enforce MAX_ACTIVE cap.
 */
export const createGoalDraft = async (
  userId: string,
  data: Partial<{
    name: string;
    deeper_why: string;
    identity_statement: string;
    measurement_type: MeasurementType;
    measurement_config: MeasurementConfig;
    obstacles: GoalObstacle[];
  }>
): Promise<string> => {
  const active = await getActiveGoals(userId);
  const now = new Date().toISOString();
  const today = getTodayStr();

  const goalDoc: Record<string, unknown> = {
    user_id: userId,
    name: data.name?.trim() || '',
    color: pickNextGoalColor(active),
    status: 'active' as GoalStatus,
    start_date: today,
    end_date: deriveEndDate(data.measurement_config),
    manual_progress: 0,
    created_at: now,
    draft_status: 'draft' as GoalDraftStatus,
  };

  if (data.deeper_why?.trim()) goalDoc.deeper_why = data.deeper_why.trim();
  if (data.identity_statement?.trim()) goalDoc.identity_statement = data.identity_statement.trim();
  if (data.measurement_type) goalDoc.measurement_type = data.measurement_type;
  if (data.measurement_config) {
    const cleanCfg: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.measurement_config)) {
      if (v !== undefined) cleanCfg[k] = v;
    }
    goalDoc.measurement_config = cleanCfg;
  }
  if (data.obstacles && data.obstacles.length > 0) goalDoc.obstacles = data.obstacles;

  const docRef = await addDoc(goalsRef(userId), goalDoc);
  return docRef.id;
};

/**
 * Update an existing goal draft with the latest form state.
 */
export const updateGoalDraft = async (
  userId: string,
  draftId: string,
  data: Partial<{
    name: string;
    deeper_why: string;
    identity_statement: string;
    measurement_type: MeasurementType;
    measurement_config: MeasurementConfig;
    obstacles: GoalObstacle[];
  }>
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', draftId);
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) clean.name = data.name.trim();
  if (data.deeper_why !== undefined) clean.deeper_why = data.deeper_why.trim();
  if (data.identity_statement !== undefined) clean.identity_statement = data.identity_statement.trim();
  if (data.measurement_type !== undefined) clean.measurement_type = data.measurement_type;
  if (data.measurement_config !== undefined) {
    const cleanCfg: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.measurement_config)) {
      if (v !== undefined) cleanCfg[k] = v;
    }
    clean.measurement_config = cleanCfg;
    clean.end_date = deriveEndDate(data.measurement_config);
  }
  if (data.obstacles !== undefined) clean.obstacles = data.obstacles;

  await updateDoc(ref, clean);
};

/**
 * Commit a draft goal. Enforces MAX_ACTIVE cap.
 */
export const commitGoalDraft = async (
  userId: string,
  draftId: string
): Promise<void> => {
  const active = await getActiveGoals(userId);
  if (active.length >= GOAL_CONSTANTS.MAX_ACTIVE) {
    throw new Error(`Maximum ${GOAL_CONSTANTS.MAX_ACTIVE} active goals allowed`);
  }

  const ref = doc(db, 'users', userId, 'goals', draftId);
  await updateDoc(ref, {
    draft_status: 'committed' as GoalDraftStatus,
    start_date: getTodayStr(),
    updated_at: new Date().toISOString(),
  });
};

/**
 * Get all draft goals for a user.
 */
export const getDraftGoals = async (userId: string): Promise<Goal[]> => {
  const q = query(
    goalsRef(userId),
    where('draft_status', '==', 'draft')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, color: data.color || GOAL_COLOR_PALETTE[0] } as Goal;
  });
};

/**
 * Delete a draft goal.
 */
export const deleteDraft = async (userId: string, draftId: string): Promise<void> => {
  const ref = doc(db, 'users', userId, 'goals', draftId);
  await deleteDoc(ref);
};

/**
 * Derive end_date from measurement config, defaulting to 90 days.
 */
const deriveEndDate = (config?: MeasurementConfig): string => {
  if (config) {
    if (config.type === 'done_by_date') return config.target_date;
    if (config.type === 'hit_total' && config.deadline) return config.deadline;
  }
  const d = new Date();
  d.setDate(d.getDate() + GOAL_CONSTANTS.DEFAULT_GOAL_DURATION_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Compute follow-through stats for a goal based on its tagged items.
 * Optionally accepts pre-fetched nudge logs to avoid redundant Firestore reads.
 */
export const computeGoalFollowThrough = async (
  userId: string,
  goalId: string,
  cachedNudgeLogs?: { reference_id: string; date: string }[]
): Promise<GoalFollowThrough> => {
  const items = await getItemsForGoal(userId, goalId);

  // Challenges: completed vs total (active + completed + failed)
  const challengeTotal = items.challenges.length;
  const challengeKept = items.challenges.filter(
    c => c.status === 'completed'
  ).length;

  // Use cached logs if provided, otherwise fetch from Firestore
  let nudgeLogs: { reference_id: string; date: string }[];
  if (cachedNudgeLogs) {
    nudgeLogs = cachedNudgeLogs;
  } else {
    const habitsQ = query(
      collection(db, 'users', userId, 'completionLogs'),
      where('type', '==', 'nudge')
    );
    const habitsSnap = await getDocs(habitsQ);
    nudgeLogs = habitsSnap.docs.map(d => {
      const data = d.data();
      return { reference_id: data.reference_id as string, date: data.date as string };
    });
  }

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
  for (const log of nudgeLogs) {
    if (habitIds.has(log.reference_id) && log.date >= mondayStr && log.date <= sundayStr) {
      weeklyHabitKept++;
    }
  }

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

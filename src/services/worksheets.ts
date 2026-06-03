import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { WorksheetEntry } from '../types';
import { MicroExerciseTrigger } from '../types/worksheets';
import { updateWillpowerStats } from './willpower';
import { getTodayString } from '../utils/date';

const WORKSHEET_BASE_POINTS = 2;
const MOOD_IMPROVEMENT_BONUS_THRESHOLD = 3;
const MOOD_IMPROVEMENT_BONUS_POINTS = 1;

const worksheetsRef = (userId: string) =>
  collection(db, 'users', userId, 'worksheets');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

/**
 * Save a new worksheet entry. Awards XP if not a draft.
 */
export const saveWorksheetEntry = async (
  userId: string,
  data: Omit<WorksheetEntry, 'id' | 'user_id' | 'created_at'>
): Promise<{ id: string; pointsAwarded: number }> => {
  const now = new Date().toISOString();

  let pointsAwarded = 0;
  if (!data.is_draft) {
    pointsAwarded = WORKSHEET_BASE_POINTS;
    if (
      data.mood_before &&
      data.mood_after &&
      data.mood_after - data.mood_before >= MOOD_IMPROVEMENT_BONUS_THRESHOLD
    ) {
      pointsAwarded += MOOD_IMPROVEMENT_BONUS_POINTS;
    }
  }

  const entryDoc: Record<string, unknown> = {
    user_id: userId,
    template_id: data.template_id,
    template_name: data.template_name,
    responses: data.responses,
    is_draft: data.is_draft,
    created_at: now,
    completed_at: data.is_draft ? null : now,
    points_awarded: pointsAwarded,
  };

  if (data.mood_before !== undefined) entryDoc.mood_before = data.mood_before;
  if (data.mood_after !== undefined) entryDoc.mood_after = data.mood_after;
  if (data.goal_ids && data.goal_ids.length > 0) entryDoc.goal_ids = data.goal_ids;

  const docRef = await addDoc(worksheetsRef(userId), entryDoc);

  if (!data.is_draft && pointsAwarded > 0) {
    await updateWillpowerStats(userId, pointsAwarded);
    await addDoc(logsRef(userId), {
      user_id: userId,
      type: 'worksheet',
      reference_id: docRef.id,
      points: pointsAwarded,
      difficulty: 1,
      date: now.split('T')[0],
    });
  }

  return { id: docRef.id, pointsAwarded };
};

/**
 * Update a draft worksheet entry (to complete it or edit responses).
 */
export const updateWorksheetEntry = async (
  userId: string,
  entryId: string,
  updates: {
    responses?: Record<string, string | string[]>;
    mood_after?: number;
    is_draft?: boolean;
    goal_ids?: string[];
  }
): Promise<{ pointsAwarded: number }> => {
  const ref = doc(db, 'users', userId, 'worksheets', entryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Worksheet entry not found');

  const existing = snap.data() as WorksheetEntry;
  const updateData: Record<string, unknown> = {};

  if (updates.responses !== undefined) updateData.responses = updates.responses;
  if (updates.mood_after !== undefined) updateData.mood_after = updates.mood_after;
  if (updates.goal_ids !== undefined) updateData.goal_ids = updates.goal_ids;

  let pointsAwarded = 0;

  // Transitioning from draft to completed
  if (updates.is_draft === false && existing.is_draft) {
    updateData.is_draft = false;
    updateData.completed_at = new Date().toISOString();

    pointsAwarded = WORKSHEET_BASE_POINTS;
    const moodBefore = existing.mood_before;
    const moodAfter = updates.mood_after ?? existing.mood_after;
    if (
      moodBefore &&
      moodAfter &&
      moodAfter - moodBefore >= MOOD_IMPROVEMENT_BONUS_THRESHOLD
    ) {
      pointsAwarded += MOOD_IMPROVEMENT_BONUS_POINTS;
    }
    updateData.points_awarded = pointsAwarded;

    await updateWillpowerStats(userId, pointsAwarded);
    await addDoc(logsRef(userId), {
      user_id: userId,
      type: 'worksheet',
      reference_id: entryId,
      points: pointsAwarded,
      difficulty: 1,
      date: getTodayString(),
    });
  }

  await updateDoc(ref, updateData);
  return { pointsAwarded };
};

/**
 * Get all completed worksheet entries (full worksheets only, not micro-exercises),
 * ordered by most recent.
 */
export const getWorksheetHistory = async (
  userId: string,
  templateId?: string
): Promise<WorksheetEntry[]> => {
  let q;
  if (templateId) {
    q = query(
      worksheetsRef(userId),
      where('template_id', '==', templateId),
      where('is_draft', '==', false),
      orderBy('completed_at', 'desc')
    );
  } else {
    q = query(
      worksheetsRef(userId),
      where('is_draft', '==', false),
      orderBy('completed_at', 'desc')
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorksheetEntry));
};

/**
 * Get draft entries for a user.
 */
export const getDraftWorksheets = async (
  userId: string
): Promise<WorksheetEntry[]> => {
  const q = query(
    worksheetsRef(userId),
    where('is_draft', '==', true),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorksheetEntry));
};

/**
 * Get a single worksheet entry by ID.
 */
export const getWorksheetEntryById = async (
  userId: string,
  entryId: string
): Promise<WorksheetEntry | null> => {
  const ref = doc(db, 'users', userId, 'worksheets', entryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorksheetEntry;
};

/**
 * Delete a worksheet entry.
 */
export const deleteWorksheetEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'worksheets', entryId);
  await deleteDoc(ref);
};

/**
 * Get entries linked to a specific goal.
 */
export const getWorksheetsByGoal = async (
  userId: string,
  goalId: string
): Promise<WorksheetEntry[]> => {
  const q = query(
    worksheetsRef(userId),
    where('goal_ids', 'array-contains', goalId),
    where('is_draft', '==', false)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorksheetEntry));
};

/**
 * Save a completed micro-exercise entry.
 * Awards 2 XP (same as worksheet base).
 */
export const saveMicroExerciseEntry = async (
  userId: string,
  data: {
    feeling: string;
    trigger_context: MicroExerciseTrigger;
    responses: Record<string, string>;
    micro_commitment: string;
    mood_before?: number;
    mood_after?: number;
    goal_ids?: string[];
  }
): Promise<{ id: string; pointsAwarded: number }> => {
  const now = new Date().toISOString();
  const pointsAwarded = WORKSHEET_BASE_POINTS;

  const entryDoc: Record<string, unknown> = {
    user_id: userId,
    type: 'micro_exercise',
    template_id: `micro_${data.feeling}`,
    template_name: 'Micro Exercise',
    feeling: data.feeling,
    trigger_context: data.trigger_context,
    responses: data.responses,
    micro_commitment: data.micro_commitment,
    commitment_follow_up_sent: false,
    commitment_followed_through: null,
    is_draft: false,
    created_at: now,
    completed_at: now,
    points_awarded: pointsAwarded,
  };

  if (data.mood_before !== undefined) entryDoc.mood_before = data.mood_before;
  if (data.mood_after !== undefined) entryDoc.mood_after = data.mood_after;
  if (data.goal_ids && data.goal_ids.length > 0) entryDoc.goal_ids = data.goal_ids;

  const docRef = await addDoc(worksheetsRef(userId), entryDoc);

  await updateWillpowerStats(userId, pointsAwarded);
  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'worksheet',
    reference_id: docRef.id,
    points: pointsAwarded,
    difficulty: 1,
    date: now.split('T')[0],
  });

  return { id: docRef.id, pointsAwarded };
};

/**
 * Record the user's follow-up response to a micro-exercise commitment.
 */
export const updateMicroExerciseFollowUp = async (
  userId: string,
  entryId: string,
  followedThrough: boolean
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'worksheets', entryId);
  await updateDoc(ref, { commitment_followed_through: followedThrough });
};

/**
 * Get completed micro-exercise entries, newest first.
 */
export const getMicroExerciseHistory = async (
  userId: string,
  limitCount = 20
): Promise<WorksheetEntry[]> => {
  const q = query(
    worksheetsRef(userId),
    where('type', '==', 'micro_exercise'),
    where('is_draft', '==', false),
    orderBy('completed_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorksheetEntry));
};

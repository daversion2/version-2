import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { subtractWillpowerPoints, adjustWillpowerPoints, recalculateUserStats } from './willpower';
import { db } from './firebase';
import { Challenge, ChallengeStatus, CompletionLog, ChallengeMilestone, ChallengeRepeatStats } from '../types';

const challengesRef = (userId: string) =>
  collection(db, 'users', userId, 'challenges');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

export const getActiveChallenge = async (userId: string): Promise<Challenge | null> => {
  const q = query(
    challengesRef(userId),
    where('status', '==', 'active'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const challenge = { id: snap.docs[0].id, ...snap.docs[0].data() } as Challenge;
  // Filter to daily challenges only (or challenges without type for backwards compat)
  if (challenge.challenge_type === 'extended') return null;
  return challenge;
};

// Get active extended challenge (separate from daily)
export const getActiveExtendedChallenge = async (
  userId: string
): Promise<Challenge | null> => {
  const q = query(
    challengesRef(userId),
    where('status', '==', 'active'),
    where('challenge_type', '==', 'extended'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Challenge;
};

// Auto-generate milestones for duration
export function generateMilestones(durationDays: number): ChallengeMilestone[] {
  return Array.from({ length: durationDays }, (_, i) => ({
    id: `day-${i + 1}`,
    day_number: i + 1,
    completed: false,
  }));
}

// Check if all milestones are complete
export function areAllMilestonesComplete(milestones: ChallengeMilestone[]): boolean {
  return milestones.every(m => m.completed);
}

// Calculate current day of extended challenge
export function getCurrentDayNumber(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the start date
}

export const createChallenge = async (
  userId: string,
  data: Omit<Challenge, 'id' | 'user_id' | 'status' | 'created_at'>
): Promise<string> => {
  // Check for existing active challenge based on type
  const challengeType = data.challenge_type || 'daily';

  if (challengeType === 'daily') {
    const existing = await getActiveChallenge(userId);
    if (existing) throw new Error('An active daily challenge already exists.');
  } else if (challengeType === 'extended') {
    const existingExtended = await getActiveExtendedChallenge(userId);
    if (existingExtended) throw new Error('An active extended challenge already exists.');
  }

  // Prepare challenge data
  let challengeData: Record<string, unknown> = { ...data };

  // For extended challenges, auto-generate milestones
  if (challengeType === 'extended' && data.duration_days) {
    challengeData.milestones = generateMilestones(data.duration_days);
    challengeData.start_date = new Date().toISOString().split('T')[0];
    // Calculate end_date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + data.duration_days - 1);
    challengeData.end_date = endDate.toISOString().split('T')[0];
  }

  // Filter out undefined values as Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(challengeData).filter(([_, value]) => value !== undefined)
  );

  const docRef = await addDoc(challengesRef(userId), {
    ...cleanData,
    user_id: userId,
    status: 'active' as ChallengeStatus,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const completeChallenge = async (
  userId: string,
  challengeId: string,
  result: {
    status: 'completed' | 'failed';
    difficulty_actual: number;
    reflection_note?: string;
    failure_reflection?: string;
  }
) => {
  const points = result.difficulty_actual;
  const ref = doc(db, 'users', userId, 'challenges', challengeId);

  // Get the challenge to access its name for repeat stats
  const challenge = await getChallengeById(userId, challengeId);

  const updateData: Record<string, unknown> = {
    status: result.status,
    difficulty_actual: result.difficulty_actual,
    points_awarded: points,
    reflection_note: result.reflection_note || '',
    completed_at: new Date().toISOString(),
  };

  // Add failure_reflection if provided
  if (result.failure_reflection) {
    updateData.failure_reflection = result.failure_reflection;
  }

  await updateDoc(ref, updateData);

  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'challenge',
    reference_id: challengeId,
    points,
    difficulty: result.difficulty_actual,
    date: new Date().toISOString().split('T')[0],
  });

  // Update repeat stats
  if (challenge) {
    await updateChallengeRepeatStats(userId, challenge, result.status);
  }
};

/**
 * Cancel an active challenge without any penalty.
 * No points are awarded or deducted, and streak is not affected.
 */
export const cancelChallenge = async (
  userId: string,
  challengeId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'challenges', challengeId);
  await updateDoc(ref, {
    status: 'cancelled' as ChallengeStatus,
  });
};

export const getPastChallenges = async (userId: string): Promise<Challenge[]> => {
  const snap = await getDocs(query(challengesRef(userId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Challenge))
    .filter((c) => ['completed', 'failed', 'archived'].includes(c.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
};

export const getChallengeById = async (
  userId: string,
  challengeId: string
): Promise<Challenge | null> => {
  const ref = doc(db, 'users', userId, 'challenges', challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Challenge;
};

export const saveReflectionAnswers = async (
  userId: string,
  challengeId: string,
  reflectionNote: string
) => {
  const ref = doc(db, 'users', userId, 'challenges', challengeId);
  await updateDoc(ref, { reflection_note: reflectionNote });
};

export const getAllChallenges = async (userId: string): Promise<Challenge[]> => {
  const snap = await getDocs(query(challengesRef(userId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Challenge))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

// Delete a challenge and its associated completion log, subtract points
export const deleteChallenge = async (
  userId: string,
  challengeId: string
): Promise<{ pointsRemoved: number }> => {
  // 1. Get challenge to find points_awarded
  const challengeRef = doc(db, 'users', userId, 'challenges', challengeId);
  const challengeSnap = await getDoc(challengeRef);

  if (!challengeSnap.exists()) {
    throw new Error('Challenge not found');
  }

  const challenge = challengeSnap.data() as Challenge;

  // Cannot delete active challenge
  if (challenge.status === 'active') {
    throw new Error('Cannot delete an active challenge');
  }

  const pointsAwarded = challenge.points_awarded || 0;

  // 2. Find and delete associated CompletionLog
  const logQ = query(
    logsRef(userId),
    where('type', '==', 'challenge'),
    where('reference_id', '==', challengeId)
  );
  const logSnap = await getDocs(logQ);

  // Delete all matching logs (should be at most one)
  for (const logDoc of logSnap.docs) {
    await deleteDoc(logDoc.ref);
  }

  // 3. Delete challenge document
  await deleteDoc(challengeRef);

  // 4. Subtract points from user's total
  if (pointsAwarded > 0) {
    await subtractWillpowerPoints(userId, pointsAwarded);
  }

  // 5. Recalculate streak
  await recalculateUserStats(userId);

  return { pointsRemoved: pointsAwarded };
};

// Update challenge difficulty for previous day editing
export const updateChallengeCompletion = async (
  userId: string,
  challengeId: string,
  newDifficultyActual: number
): Promise<{ pointsDelta: number; newPoints: number }> => {
  // 1. Get current challenge
  const challengeRef = doc(db, 'users', userId, 'challenges', challengeId);
  const challengeSnap = await getDoc(challengeRef);

  if (!challengeSnap.exists()) {
    throw new Error('Challenge not found');
  }

  const challenge = challengeSnap.data() as Challenge;
  const oldPoints = challenge.points_awarded || 0;

  // New points = new difficulty (base points are difficulty_actual)
  const newPoints = newDifficultyActual;
  const pointsDelta = newPoints - oldPoints;

  // 2. Update challenge document
  await updateDoc(challengeRef, {
    difficulty_actual: newDifficultyActual,
    points_awarded: newPoints,
  });

  // 3. Update CompletionLog entry
  const logQ = query(
    logsRef(userId),
    where('type', '==', 'challenge'),
    where('reference_id', '==', challengeId)
  );
  const logSnap = await getDocs(logQ);

  for (const logDoc of logSnap.docs) {
    await updateDoc(logDoc.ref, {
      points: newPoints,
      difficulty: newDifficultyActual,
    });
  }

  // 4. Adjust user's totalWillpowerPoints
  if (pointsDelta !== 0) {
    await adjustWillpowerPoints(userId, pointsDelta);
  }

  return { pointsDelta, newPoints };
};

// ============================================================================
// EXTENDED CHALLENGE FUNCTIONS
// ============================================================================

const challengeStatsRef = (userId: string) =>
  collection(db, 'users', userId, 'challengeStats');

// Mark a daily milestone as complete
export const completeMilestone = async (
  userId: string,
  challengeId: string,
  dayNumber: number,
  succeeded: boolean,
  note?: string
): Promise<void> => {
  const challengeRef = doc(db, 'users', userId, 'challenges', challengeId);
  const challenge = await getChallengeById(userId, challengeId);
  if (!challenge || !challenge.milestones) throw new Error('Challenge not found');

  const updatedMilestones = challenge.milestones.map(m => {
    if (m.day_number === dayNumber) {
      const updatedMilestone: typeof m = {
        ...m,
        completed: true,
        completed_at: new Date().toISOString(),
        succeeded,
      };
      // Only add note if it has a value (Firestore doesn't accept undefined)
      if (note) {
        updatedMilestone.note = note;
      }
      return updatedMilestone;
    }
    return m;
  });

  await updateDoc(challengeRef, { milestones: updatedMilestones });
};

// Complete an extended challenge (when all milestones are done or ending early)
export const completeExtendedChallenge = async (
  userId: string,
  challengeId: string,
  result: {
    status: 'completed' | 'failed';
    difficulty_actual: number;
    reflection_note?: string;
  }
): Promise<void> => {
  const challenge = await getChallengeById(userId, challengeId);
  if (!challenge) throw new Error('Challenge not found');

  // Calculate points based on milestones completed
  const completedMilestones = challenge.milestones?.filter(m => m.completed && m.succeeded) || [];
  const totalMilestones = challenge.milestones?.length || 1;
  const completionBonus = result.status === 'completed' ? result.difficulty_actual : 0;
  const points = completedMilestones.length + completionBonus;

  const ref = doc(db, 'users', userId, 'challenges', challengeId);

  await updateDoc(ref, {
    status: result.status,
    difficulty_actual: result.difficulty_actual,
    points_awarded: points,
    reflection_note: result.reflection_note || '',
    completed_at: new Date().toISOString(),
  });

  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'challenge',
    reference_id: challengeId,
    points,
    difficulty: result.difficulty_actual,
    date: new Date().toISOString().split('T')[0],
  });

  // Update repeat stats
  await updateChallengeRepeatStats(userId, challenge, result.status);
};

// ============================================================================
// REPEAT TRACKING FUNCTIONS
// ============================================================================

// Normalize challenge name for consistent matching
function normalizeChallengeName(name: string): string {
  return name.toLowerCase().trim();
}

// Get repeat stats for a challenge name
export const getChallengeRepeatStats = async (
  userId: string,
  challengeName: string
): Promise<ChallengeRepeatStats | null> => {
  const normalizedId = normalizeChallengeName(challengeName);
  const docRef = doc(db, 'users', userId, 'challengeStats', normalizedId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as ChallengeRepeatStats;
};

// Update repeat stats when challenge completed
export const updateChallengeRepeatStats = async (
  userId: string,
  challenge: Challenge,
  result: 'completed' | 'failed'
): Promise<ChallengeRepeatStats> => {
  const normalizedId = normalizeChallengeName(challenge.name);
  const docRef = doc(db, 'users', userId, 'challengeStats', normalizedId);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    // Create new stats document
    const newStats: ChallengeRepeatStats = {
      id: normalizedId,
      name: challenge.name,
      total_completions: result === 'completed' ? 1 : 0,
      total_attempts: 1,
      first_completed_at: result === 'completed' ? new Date().toISOString() : undefined,
      last_completed_at: result === 'completed' ? new Date().toISOString() : undefined,
      challenge_ids: [challenge.id],
    };

    // Filter out undefined values
    const cleanStats = Object.fromEntries(
      Object.entries(newStats).filter(([_, value]) => value !== undefined)
    );

    await setDoc(docRef, cleanStats);

    return newStats;
  } else {
    // Update existing
    const existingData = existing.data() as ChallengeRepeatStats;
    const updates: Partial<ChallengeRepeatStats> = {
      total_attempts: existingData.total_attempts + 1,
      challenge_ids: [...existingData.challenge_ids, challenge.id],
    };

    if (result === 'completed') {
      updates.total_completions = (existingData.total_completions || 0) + 1;
      updates.last_completed_at = new Date().toISOString();
      if (!existingData.first_completed_at) {
        updates.first_completed_at = new Date().toISOString();
      }
    }

    await updateDoc(docRef, updates);
    return { ...existingData, ...updates } as ChallengeRepeatStats;
  }
};

// Check for milestone completions (5, 10, 25, 50, 100)
export function getRepeatMilestone(completions: number): number | null {
  const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
  return milestones.includes(completions) ? completions : null;
}

// ============================================================================
// BARRIER TYPE ANALYTICS
// ============================================================================

import { BarrierType } from '../types';

/**
 * Get count of completed challenges grouped by barrier type
 * @param userId User's ID
 * @param startDate Optional start date filter (YYYY-MM-DD)
 * @param endDate Optional end date filter (YYYY-MM-DD)
 */
export const getChallengesByBarrierType = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Record<BarrierType, number>> => {
  // Initialize counts for all barrier types
  const counts: Record<BarrierType, number> = {
    'comfort-zone': 0,
    'delayed-gratification': 0,
    'discipline': 0,
    'ego': 0,
    'energy-drainer': 0,
  };

  // Query all completed challenges
  const q = query(
    challengesRef(userId),
    where('status', '==', 'completed')
  );

  const snap = await getDocs(q);
  const challenges = snap.docs.map(d => d.data() as Challenge);

  // Filter by date range if provided and count by barrier type
  for (const challenge of challenges) {
    // Apply date filters if provided
    if (startDate && challenge.date < startDate) continue;
    if (endDate && challenge.date > endDate) continue;

    // Count by barrier type (only if barrier_type is set)
    if (challenge.barrier_type && challenge.barrier_type in counts) {
      counts[challenge.barrier_type]++;
    }
  }

  return counts;
};

/**
 * Get consecutive days streak for a specific barrier type
 * @param userId User's ID
 * @param barrierType The barrier type to check
 */
export const getBarrierTypeStreak = async (
  userId: string,
  barrierType: BarrierType
): Promise<number> => {
  // Query completed challenges with the specific barrier type
  const q = query(
    challengesRef(userId),
    where('status', '==', 'completed'),
    where('barrier_type', '==', barrierType),
    orderBy('date', 'desc'),
    limit(100) // Check last 100 to find streak
  );

  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const challenges = snap.docs.map(d => d.data() as Challenge);

  // Calculate streak by checking consecutive days
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique dates in descending order
  const uniqueDates = [...new Set(challenges.map(c => c.date))].sort((a, b) => b.localeCompare(a));

  // Check if most recent is today or yesterday
  if (uniqueDates.length === 0) return 0;

  const mostRecentDate = new Date(uniqueDates[0]);
  mostRecentDate.setHours(0, 0, 0, 0);

  const daysSinceMostRecent = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

  // If most recent is more than 1 day ago, streak is broken
  if (daysSinceMostRecent > 1) return 0;

  // Count consecutive days
  let expectedDate = mostRecentDate;
  for (const dateStr of uniqueDates) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((expectedDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (dayDiff === 1) {
      // Same as expected next day
      streak++;
      expectedDate = date;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Gap in dates, streak broken
      break;
    }
  }

  return streak;
};

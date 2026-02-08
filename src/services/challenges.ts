import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
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
import { Challenge, ChallengeStatus, CompletionLog } from '../types';

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
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Challenge;
};

export const createChallenge = async (
  userId: string,
  data: Omit<Challenge, 'id' | 'user_id' | 'status' | 'created_at'>
): Promise<string> => {
  const existing = await getActiveChallenge(userId);
  if (existing) throw new Error('An active challenge already exists.');

  // Filter out undefined values as Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
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
  }
) => {
  const points = result.difficulty_actual;
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
  answers: {
    reflection_hardest_moment?: string;
    reflection_push_through?: string;
    reflection_next_time?: string;
  }
) => {
  const ref = doc(db, 'users', userId, 'challenges', challengeId);
  await updateDoc(ref, answers);
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

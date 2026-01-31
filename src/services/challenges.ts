import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
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

  const docRef = await addDoc(challengesRef(userId), {
    ...data,
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

export const getAllChallenges = async (userId: string): Promise<Challenge[]> => {
  const snap = await getDocs(query(challengesRef(userId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Challenge))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

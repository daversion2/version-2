import {
  collection,
  doc,
  addDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { ProofPoint } from '../types';
import { updateWillpowerStats } from './willpower';

const PROOF_POINT_POINTS = 2;

const proofPointsRef = (userId: string) =>
  collection(db, 'users', userId, 'proofPoints');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

/**
 * Save a new proof point. Awards 2 XP.
 */
export const saveProofPoint = async (
  userId: string,
  data: { hard_moment: string; what_you_did: string }
): Promise<{ id: string; pointsAwarded: number }> => {
  const now = new Date().toISOString();

  const docRef = await addDoc(proofPointsRef(userId), {
    user_id: userId,
    hard_moment: data.hard_moment,
    what_you_did: data.what_you_did,
    points_awarded: PROOF_POINT_POINTS,
    created_at: now,
  });

  await updateWillpowerStats(userId, PROOF_POINT_POINTS);
  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'proof_point',
    reference_id: docRef.id,
    points: PROOF_POINT_POINTS,
    difficulty: 1,
    date: now.split('T')[0],
  });

  return { id: docRef.id, pointsAwarded: PROOF_POINT_POINTS };
};

/**
 * Get all proof points ordered by newest first.
 */
export const getProofPoints = async (
  userId: string
): Promise<ProofPoint[]> => {
  const q = query(proofPointsRef(userId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProofPoint));
};

/**
 * Get count of proof points (for landing screen counter).
 */
export const getProofPointCount = async (
  userId: string
): Promise<number> => {
  const snap = await getCountFromServer(proofPointsRef(userId));
  return snap.data().count;
};

/**
 * Get a random proof point (for triggered surface).
 */
export const getRandomProofPoint = async (
  userId: string
): Promise<ProofPoint | null> => {
  const all = await getProofPoints(userId);
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
};

/**
 * Delete a proof point.
 */
export const deleteProofPoint = async (
  userId: string,
  proofPointId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'proofPoints', proofPointId);
  await deleteDoc(ref);
};

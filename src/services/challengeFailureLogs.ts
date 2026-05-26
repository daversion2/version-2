import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getTodayString } from '../utils/date';

export interface ChallengeFailureLog {
  date: string;
  challenge_id: string;
  challenge_name: string;
  barrier_reason: string;
  next_action: string;
  created_at: string;
}

export async function saveChallengeFailureLog(
  userId: string,
  data: {
    challengeId: string;
    challengeName: string;
    barrierReason: string;
    nextAction: string;
  }
): Promise<void> {
  const colRef = collection(db, 'users', userId, 'challengeFailureLogs');
  await addDoc(colRef, {
    date: getTodayString(),
    challenge_id: data.challengeId,
    challenge_name: data.challengeName,
    barrier_reason: data.barrierReason,
    next_action: data.nextAction,
    created_at: new Date().toISOString(),
  });
}

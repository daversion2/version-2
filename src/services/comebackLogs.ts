import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getTodayString } from '../utils/date';

export interface ComebackLog {
  date: string;
  barrier_reason: string;
  committed_habit_id: string;
  committed_habit_name: string;
  created_at: string;
}

export async function saveComebackLog(
  userId: string,
  data: { barrierReason: string; committedHabitId: string; committedHabitName: string }
): Promise<void> {
  const colRef = collection(db, 'users', userId, 'comebackLogs');
  await addDoc(colRef, {
    date: getTodayString(),
    barrier_reason: data.barrierReason,
    committed_habit_id: data.committedHabitId,
    committed_habit_name: data.committedHabitName,
    created_at: new Date().toISOString(),
  });
}

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Nudge, HabitDifficulty } from '../types';

const habitsRef = (userId: string) =>
  collection(db, 'users', userId, 'habits');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

export const getActiveHabits = async (userId: string): Promise<Nudge[]> => {
  const q = query(habitsRef(userId), where('is_active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Nudge));
};

export const createHabit = async (
  userId: string,
  data: { name: string; category_id: string }
): Promise<string> => {
  const docRef = await addDoc(habitsRef(userId), {
    ...data,
    user_id: userId,
    is_active: true,
    created_by_user: true,
  });
  return docRef.id;
};

export const updateHabit = async (
  userId: string,
  habitId: string,
  data: Partial<Nudge>
) => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  await updateDoc(ref, data);
};

export const logHabitCompletion = async (
  userId: string,
  habitId: string,
  difficulty: HabitDifficulty
) => {
  const points = difficulty === 'easy' ? 1 : 2;
  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'nudge',
    reference_id: habitId,
    points,
    difficulty: points,
    date: new Date().toISOString().split('T')[0],
  });
};

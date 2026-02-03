import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as User) : null;
};

export const markOnboardingComplete = async (userId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), { has_completed_onboarding: true });
};

export const markWalkthroughComplete = async (userId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), { has_completed_walkthrough: true });
};

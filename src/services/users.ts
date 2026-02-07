import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as User) : null;
};

export const markOnboardingComplete = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_completed_onboarding: true }, { merge: true });
};

export const markWalkthroughComplete = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_completed_walkthrough: true }, { merge: true });
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { expoPushToken: token }, { merge: true });
};

export const saveTimezone = async (userId: string, timezone: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { timezone }, { merge: true });
};

export const savePushTokenAndTimezone = async (
  userId: string,
  token: string,
  timezone: string
): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { expoPushToken: token, timezone }, { merge: true });
};

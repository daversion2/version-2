import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { FunFact } from '../types';

const funFactsRef = () => collection(db, 'funFacts');

/**
 * Get the day of the year (1-366)
 */
const getDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

/**
 * Fetch all fun facts from Firestore
 */
export const getAllFunFacts = async (): Promise<FunFact[]> => {
  const q = query(funFactsRef(), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FunFact[];
};

/**
 * Get today's fun fact based on day of year
 * Same fact for all users on the same day
 */
export const getTodaysFunFact = async (): Promise<FunFact | null> => {
  const facts = await getAllFunFacts();
  if (facts.length === 0) return null;

  const dayOfYear = getDayOfYear();
  const index = dayOfYear % facts.length;
  return facts[index];
};

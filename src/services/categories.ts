import {
  collection,
  query,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Category, DEFAULT_CATEGORIES } from '../types';

const MAX_CATEGORIES = 8;

const categoriesRef = (userId: string) =>
  collection(db, 'users', userId, 'categories');

/**
 * Get a single category by ID
 */
export const getCategory = async (
  userId: string,
  categoryId: string
): Promise<Category | null> => {
  const ref = doc(db, 'users', userId, 'categories', categoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Category;
};

export const getUserCategories = async (userId: string): Promise<Category[]> => {
  const snap = await getDocs(query(categoriesRef(userId)));
  if (snap.empty) {
    // Seed defaults on first access
    const seeded: Category[] = [];
    for (const cat of DEFAULT_CATEGORIES) {
      const docRef = await addDoc(categoriesRef(userId), cat);
      seeded.push({ id: docRef.id, ...cat });
    }
    return seeded;
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
};

export const addCategory = async (
  userId: string,
  data: { name: string; color: string }
): Promise<string> => {
  const existing = await getUserCategories(userId);
  if (existing.length >= MAX_CATEGORIES) {
    throw new Error(`Maximum of ${MAX_CATEGORIES} categories allowed.`);
  }
  if (existing.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) {
    throw new Error('A category with that name already exists.');
  }
  const docRef = await addDoc(categoriesRef(userId), data);
  return docRef.id;
};

export const deleteCategory = async (userId: string, categoryId: string) => {
  await deleteDoc(doc(db, 'users', userId, 'categories', categoryId));
};

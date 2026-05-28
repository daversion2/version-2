import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Mantra, User } from '../types';

/**
 * Get the active mantra text from a user profile.
 * Falls back to legacy redirect_mantra if no mantras array exists.
 */
export const getActiveMantraText = (profile: User | null): string | null => {
  if (!profile) return null;

  if (profile.mantras && profile.mantras.length > 0) {
    if (profile.active_mantra_id) {
      const active = profile.mantras.find(m => m.id === profile.active_mantra_id);
      if (active) return active.text;
    }
    // Fallback to first mantra if active_mantra_id is invalid
    return profile.mantras[0].text;
  }

  // Legacy fallback
  return profile.redirect_mantra || null;
};

/** Generate a simple unique ID. */
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Migrate legacy redirect_mantra to the new mantras array. */
export const migrateRedirectMantra = async (
  userId: string,
  redirectMantra: string,
): Promise<Mantra> => {
  const mantra: Mantra = {
    id: generateId(),
    text: redirectMantra,
    created_at: new Date().toISOString(),
  };
  await setDoc(
    doc(db, 'users', userId),
    { mantras: [mantra], active_mantra_id: mantra.id },
    { merge: true },
  );
  return mantra;
};

/** Add a new mantra (max 5). */
export const addMantra = async (
  userId: string,
  text: string,
  currentMantras: Mantra[],
): Promise<Mantra> => {
  if (currentMantras.length >= 5) {
    throw new Error('Maximum of 5 mantras allowed');
  }
  const mantra: Mantra = {
    id: generateId(),
    text,
    created_at: new Date().toISOString(),
  };
  const updated = [...currentMantras, mantra];
  const fields: Record<string, any> = { mantras: updated };
  // Auto-set as active if it's the first one
  if (updated.length === 1) {
    fields.active_mantra_id = mantra.id;
  }
  await setDoc(doc(db, 'users', userId), fields, { merge: true });
  return mantra;
};

/** Update an existing mantra's text. */
export const updateMantra = async (
  userId: string,
  mantraId: string,
  newText: string,
  currentMantras: Mantra[],
): Promise<void> => {
  const updated = currentMantras.map(m =>
    m.id === mantraId ? { ...m, text: newText } : m,
  );
  await setDoc(doc(db, 'users', userId), { mantras: updated }, { merge: true });
};

/** Delete a mantra. Re-assigns active if the deleted one was active. */
export const deleteMantra = async (
  userId: string,
  mantraId: string,
  currentMantras: Mantra[],
  activeMantraId: string | undefined,
): Promise<void> => {
  const updated = currentMantras.filter(m => m.id !== mantraId);
  const fields: Record<string, any> = { mantras: updated };
  if (activeMantraId === mantraId) {
    fields.active_mantra_id = updated.length > 0 ? updated[0].id : null;
  }
  await setDoc(doc(db, 'users', userId), fields, { merge: true });
};

/** Set which mantra is active. */
export const setActiveMantra = async (
  userId: string,
  mantraId: string,
): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId),
    { active_mantra_id: mantraId },
    { merge: true },
  );
};

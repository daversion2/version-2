import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

/**
 * The Lab: experiments only admin accounts can see (Admin → Lab).
 *
 * An experiment is ON only when BOTH hold:
 *   - the account has is_admin, which firestore.rules stops anyone setting on
 *     themselves, and
 *   - its switch is on in User.lab_flags.
 *
 * lab_flags itself is owner-writable like the rest of the profile, so any user
 * could write it with the SDK. That is harmless: without is_admin it does
 * nothing. Keep the is_admin half of this check; it is the actual gate.
 *
 * The registry of experiments lives in screens/Lab/experiments.ts. Screens read
 * a switch with the useLab hook, never with this directly.
 */
export const isLabExperimentOn = (
  profile: Pick<User, 'is_admin' | 'lab_flags'> | null | undefined,
  experimentId: string
): boolean => profile?.is_admin === true && profile.lab_flags?.[experimentId] === true;

/**
 * Flip one experiment's switch on this account. setDoc + merge DEEP-merges the
 * map, so this writes one key and leaves every other switch alone (updateDoc
 * would replace the whole map). Call refreshProfile afterwards so useLab
 * consumers re-render.
 */
export const setLabExperiment = async (
  userId: string,
  experimentId: string,
  on: boolean
): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { lab_flags: { [experimentId]: on } }, { merge: true });
};

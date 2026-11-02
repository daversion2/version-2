import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db, googleProvider } from './firebase';

export const signUp = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    id: cred.user.uid,
    email,
    created_at: new Date().toISOString(),
    has_completed_onboarding: false,
  });
  return cred.user;
};

export const signIn = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logOut = async () => {
  if (Platform.OS !== 'web') {
    // Without this, the next Google sign-in on a shared phone silently reuses
    // the previous person's Google account.
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // Not signed in with Google, or the module isn't there: nothing to clear.
    }
  }
  await signOut(auth);
};

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * The profile fields every account is created with, as a merge patch — or null
 * when the doc already has them.
 *
 * Keyed on `created_at`: both creation paths (signUp, signInWithGoogle) have
 * always written it together with `has_completed_onboarding`, so a doc without
 * it was made by some other merge write (app_open_count, timezone) that landed
 * before the account was set up. Such a doc gets the base fields and is sent
 * to onboarding — unless it already finished onboarding, which is never undone.
 * Fields that are already there (an email, say) are left alone.
 */
export const baseProfilePatch = (
  existing: Record<string, any> | null | undefined,
  uid: string,
  email: string | null | undefined,
  nowIso: string
): Record<string, any> | null => {
  if (existing?.created_at) return null;
  return {
    ...(existing?.id ? {} : { id: uid }),
    ...(existing?.email ? {} : { email: email ?? null }),
    created_at: nowIso,
    ...(existing?.has_completed_onboarding === true ? {} : { has_completed_onboarding: false }),
  };
};

/** Write the base profile fields if the user doc is missing them. True when it wrote. */
export const ensureBaseProfile = async (uid: string, email: string | null | undefined): Promise<boolean> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const patch = baseProfilePatch(snap.exists() ? snap.data() : null, uid, email, new Date().toISOString());
  if (!patch) return false;
  await setDoc(ref, patch, { merge: true });
  return true;
};

/** Google's own "the user backed out" signals: v16's result type, older codes, web's popup. */
const isGoogleCancel = (error: any): boolean => {
  const code = String(error?.code ?? '');
  return (
    code === 'SIGN_IN_CANCELLED' ||
    code === '-5' || // Android's SIGN_IN_CANCELLED before v16
    code === '12501' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  );
};

/**
 * Sign in with Google. Resolves null when the person backs out of Google's
 * sheet: that's a choice, not an error, so callers show nothing.
 */
export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  let cred;
  try {
    if (Platform.OS === 'web') {
      cred = await signInWithPopup(auth, googleProvider);
    } else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // v16 resolves { type: 'cancelled' } when the sheet is dismissed.
      const signInResult = await GoogleSignin.signIn();
      if (signInResult?.type === 'cancelled') return null;
      const idToken = signInResult?.data?.idToken;

      if (!idToken) {
        throw new Error("Google didn't send back a sign-in. Please try again.");
      }

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with the Google credential
      cred = await signInWithCredential(auth, googleCredential);
    }
  } catch (error) {
    if (isGoogleCancel(error)) return null;
    throw error;
  }

  // Not just "does the doc exist": a merge write elsewhere can create the doc
  // before this runs, and the account would then never get its base fields
  // (or its trip through onboarding).
  await ensureBaseProfile(cred.user.uid, cred.user.email);

  return cred.user;
};

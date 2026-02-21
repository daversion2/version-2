import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const signUp = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    id: cred.user.uid,
    email,
    created_at: new Date().toISOString(),
    has_completed_onboarding: false,
    has_completed_walkthrough: false,
  });
  return cred.user;
};

export const signIn = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logOut = () => signOut(auth);

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const signInWithGoogle = async () => {
  // Check if device supports Google Play Services (Android)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Get user's ID token from Google
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error('No ID token found');
  }

  // Create a Google credential with the token
  const googleCredential = GoogleAuthProvider.credential(idToken);

  // Sign in to Firebase with the Google credential
  const cred = await signInWithCredential(auth, googleCredential);

  // Check if user document exists in Firestore
  const userDocRef = doc(db, 'users', cred.user.uid);
  const userDoc = await getDoc(userDocRef);

  // If new user, create their profile document
  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      id: cred.user.uid,
      email: cred.user.email,
      created_at: new Date().toISOString(),
      has_completed_onboarding: false,
      has_completed_walkthrough: false,
    });
  }

  return cred.user;
};

import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

// Username validation constants
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as User) : null;
};

// Alias for getUser
export const getUser = getUserProfile;

export const markOnboardingComplete = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_completed_onboarding: true }, { merge: true });
};

export const resetOnboarding = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_completed_onboarding: false }, { merge: true });
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

export const updateInspirationFeedOptIn = async (
  userId: string,
  optIn: boolean
): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { inspiration_feed_opt_in: optIn }, { merge: true });
};

// ============================================================================
// USERNAME FUNCTIONS
// ============================================================================

/**
 * Validate username format
 * - 3-20 characters
 * - Must start with a letter
 * - Only letters, numbers, and underscores allowed
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username || username.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username must start with a letter and contain only letters, numbers, and underscores' };
  }
  return { valid: true };
};

/**
 * Check if a username is available (case-insensitive)
 */
export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username_lowercase', '==', username.toLowerCase()));
  const snap = await getDocs(q);
  return snap.empty;
};

/**
 * Save username for a user (during onboarding)
 */
export const saveUsername = async (userId: string, username: string): Promise<void> => {
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const available = await checkUsernameAvailable(username);
  if (!available) {
    throw new Error('This username is already taken');
  }

  await setDoc(
    doc(db, 'users', userId),
    {
      username,
      username_lowercase: username.toLowerCase(),
    },
    { merge: true }
  );
};

/**
 * Update username for an existing user
 */
export const updateUsername = async (
  userId: string,
  newUsername: string
): Promise<void> => {
  const validation = validateUsername(newUsername);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check if the username is taken by someone else
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username_lowercase', '==', newUsername.toLowerCase()));
  const snap = await getDocs(q);

  // If found, check if it's the same user
  if (!snap.empty) {
    const existingUser = snap.docs[0];
    if (existingUser.id !== userId) {
      throw new Error('This username is already taken');
    }
    // Same user, same username (case might differ) - allow update
  }

  await setDoc(
    doc(db, 'users', userId),
    {
      username: newUsername,
      username_lowercase: newUsername.toLowerCase(),
    },
    { merge: true }
  );
};

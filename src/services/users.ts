import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, deleteField } from 'firebase/firestore';
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

export const markOnboardingComplete = async (userId: string, deferred = false): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId),
    { has_completed_onboarding: true, ...(deferred ? { onboarding_deferred: true } : {}) },
    { merge: true }
  );
};

export const dismissOnboardingBanner = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { onboarding_banner_dismissed: true }, { merge: true });
};

export const completeFullOnboarding = async (userId: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId),
    { onboarding_deferred: false, onboarding_banner_dismissed: true, deferred_onboarding_progress: deleteField() },
    { merge: true }
  );
};

export const saveDeferredOnboardingProgress = async (
  userId: string,
  progress: Record<string, any>
): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { deferred_onboarding_progress: progress }, { merge: true });
};

export const clearDeferredOnboardingProgress = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { deferred_onboarding_progress: deleteField() }, { merge: true });
};

export const markPointsIntroSeen = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_seen_points_intro: true }, { merge: true });
};

export const markPlanIntroSeen = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_seen_plan_intro: true }, { merge: true });
};

export const dismissGoalPrompt = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_dismissed_goal_prompt: true }, { merge: true });
};

export const markChallengesUnlockSeen = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_seen_challenges_unlock: true }, { merge: true });
};

export const incrementAppOpenCount = async (userId: string): Promise<void> => {
  const { increment } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', userId), { app_open_count: increment(1) }, { merge: true });
};

export const resetOnboarding = async (userId: string): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { has_completed_onboarding: false }, { merge: true });
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

// ============================================================================
// CLEAR ACCOUNT (dev/testing tool)
// ============================================================================

const USER_SUBCOLLECTIONS = [
  'habits',
  'challenges',
  'completionLogs',
  'categories',
  'reflections',
  'goals',
  'programEnrollments',
  'programBadges',
  'rewardMessages',
  'challengeStats',
  'shownTidbits',
  'tomorrowPlans',
  'worksheets',
];

const deleteSubcollection = async (userId: string, subcollectionName: string): Promise<number> => {
  const ref = collection(db, 'users', userId, subcollectionName);
  const snap = await getDocs(query(ref));
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  return count;
};

/**
 * Clear all user data and reset to fresh state (preserves auth + email + admin status).
 * Deletes all subcollections and resets user doc fields.
 * After this, the user will see onboarding again.
 */
export const clearUserAccount = async (userId: string): Promise<{ deletedDocs: number }> => {
  let totalDeleted = 0;

  // Delete all subcollections
  for (const sub of USER_SUBCOLLECTIONS) {
    const count = await deleteSubcollection(userId, sub);
    totalDeleted += count;
  }

  // Reset user document fields (preserve email, created_at, is_admin)
  await setDoc(
    doc(db, 'users', userId),
    {
      username: deleteField(),
      username_lowercase: deleteField(),
      has_completed_onboarding: false,
      totalWillpowerPoints: 0,
      currentStreak: 0,
      lastActivityDate: deleteField(),
      team_id: deleteField(),
      inspiration_feed_opt_in: true,
      submission_ban_until: deleteField(),
      active_program_id: deleteField(),
      last_reflection_date: deleteField(),
      reflection_streak: 0,
      home_layout: deleteField(),
      expoPushToken: deleteField(),
      timezone: deleteField(),
      // Why discovery
      has_completed_why_discovery: deleteField(),
      why_statement: deleteField(),
      // Onboarding
      redirect_mantra: deleteField(),
      onboarding_pattern: deleteField(),
      onboarding_reflection: deleteField(),
      onboarding_deferred: deleteField(),
      onboarding_banner_dismissed: deleteField(),
      deferred_onboarding_progress: deleteField(),
      // Completion counters
      totalHabitsCompleted: 0,
      totalChallengesCompleted: 0,
      // Intro flags
      has_seen_points_intro: deleteField(),
      has_seen_plan_intro: deleteField(),
      has_dismissed_goal_prompt: deleteField(),
      has_seen_challenges_unlock: deleteField(),
      app_open_count: deleteField(),
    },
    { merge: true }
  );

  return { deletedDocs: totalDeleted };
};

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { WhyProfile, WhyDiscoveryStatus, PeakMomentStory, WhyIteration, WhyTheme } from '../types';

const whyProfileRef = (userId: string) =>
  doc(db, 'users', userId, 'whyProfile', 'main');

const userRef = (userId: string) =>
  doc(db, 'users', userId);

/**
 * Get the user's Why Profile (returns null if none exists yet).
 */
export const getWhyProfile = async (userId: string): Promise<WhyProfile | null> => {
  const snap = await getDoc(whyProfileRef(userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WhyProfile;
};

/**
 * Create or update the Why Profile.
 * Uses setDoc with merge to allow partial updates.
 */
export const saveWhyProfile = async (
  userId: string,
  data: Partial<Omit<WhyProfile, 'id' | 'user_id'>>
): Promise<void> => {
  const now = new Date().toISOString();
  await setDoc(
    whyProfileRef(userId),
    {
      user_id: userId,
      updated_at: now,
      ...data,
    },
    { merge: true }
  );
};

/**
 * Initialize a blank Why Profile (called on first entry into discovery flow).
 */
export const initializeWhyProfile = async (userId: string): Promise<void> => {
  const existing = await getWhyProfile(userId);
  if (existing) return;

  const now = new Date().toISOString();
  await setDoc(whyProfileRef(userId), {
    user_id: userId,
    status: 'not_started' as WhyDiscoveryStatus,
    stories: [],
    why_iterations: [],
    core_why_reached: false,
    themes: [],
    why_statement: '',
    created_at: now,
    updated_at: now,
    last_completed_stage: 0,
  });
};

/**
 * Save stories from story mining stage (Stage 2).
 */
export const saveStories = async (userId: string, stories: PeakMomentStory[]): Promise<void> => {
  await saveWhyProfile(userId, {
    stories,
    status: 'in_progress',
    last_completed_stage: 1,
  });
};

/**
 * Save why iterations from the 5 Whys drilling stage (Stage 3).
 */
export const saveWhyIterations = async (
  userId: string,
  iterations: WhyIteration[],
  coreReached: boolean
): Promise<void> => {
  await saveWhyProfile(userId, {
    why_iterations: iterations,
    core_why_reached: coreReached,
    last_completed_stage: 2,
  });
};

/**
 * Save themes from recognition stage (Stage 4).
 */
export const saveThemes = async (userId: string, themes: WhyTheme[]): Promise<void> => {
  await saveWhyProfile(userId, {
    themes,
    last_completed_stage: 3,
  });
};

/**
 * Save final Why statement and mark discovery as complete (Stage 5).
 * Also denormalizes why_statement to the user profile for fast home screen display.
 */
export const completeWhyDiscovery = async (
  userId: string,
  whyStatement: string,
  contributionPart: string,
  impactPart: string
): Promise<void> => {
  const now = new Date().toISOString();
  await saveWhyProfile(userId, {
    why_statement: whyStatement,
    contribution_part: contributionPart,
    impact_part: impactPart,
    status: 'completed',
    completed_at: now,
    last_completed_stage: 4,
  });

  // Denormalize to user profile for fast home screen display
  await setDoc(userRef(userId), {
    has_completed_why_discovery: true,
    why_statement: whyStatement,
  }, { merge: true });
};

/**
 * Update the Why statement (from the edit screen).
 * Updates both the WhyProfile document and the denormalized user field.
 */
export const updateWhyStatement = async (
  userId: string,
  whyStatement: string,
  contributionPart?: string,
  impactPart?: string
): Promise<void> => {
  await saveWhyProfile(userId, {
    why_statement: whyStatement,
    ...(contributionPart !== undefined && { contribution_part: contributionPart }),
    ...(impactPart !== undefined && { impact_part: impactPart }),
  });

  // Update denormalized copy on user doc
  await setDoc(userRef(userId), {
    why_statement: whyStatement,
  }, { merge: true });
};

/**
 * Record that the user reflected on their Why (updates last_reflected_at timestamp).
 */
export const saveWhyReflection = async (userId: string): Promise<void> => {
  await saveWhyProfile(userId, {
    last_reflected_at: new Date().toISOString(),
  });
};

/**
 * Save CBT / safety-net fields to the user-level Why Profile (Phase 2).
 * Replaces writing this data onto goals[0]. Strips empty values so we never
 * overwrite existing data with blanks. See docs/arenas-vs-goals-decision.md
 */
export const saveWhyProfileCBT = async (
  userId: string,
  data: {
    deeper_why?: string;
    confidence_baseline?: number;
    negative_story?: string;
    past_attempt_story?: string;
    inner_voice_challenge?: string;
    inner_voice_response?: string;
    good_week_description?: string;
    minimum_action?: string;
    bonus_actions?: string[];
    triggers?: string[];
    trigger_substitutes?: string[];
    environment_changes?: string;
    recovery_plan?: string;
    identity_statement?: string;
    support_person?: string;
    cognitive_distortions?: string[];
  }
): Promise<void> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) cleaned[key] = trimmed;
    } else if (Array.isArray(value)) {
      if (value.length > 0) cleaned[key] = value;
    } else {
      cleaned[key] = value; // numbers (e.g. confidence_baseline)
    }
  }
  if (Object.keys(cleaned).length === 0) return;
  await saveWhyProfile(userId, cleaned as Partial<Omit<WhyProfile, 'id' | 'user_id'>>);
};

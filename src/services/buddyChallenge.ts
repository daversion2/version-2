import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { createChallenge } from './challenges';
import { updateWillpowerStats } from './willpower';
import { createBuddyCompletionFeedEntry } from './inspirationFeed';
import {
  BuddyChallenge,
  BuddyChallengeStatus,
  DuoStreak,
  Challenge,
  LibraryChallenge,
  User,
} from '../types';
import { POINTS } from '../constants/willpower';

const buddyChallengesRef = () => collection(db, 'buddyChallenges');
const duoStreaksRef = () => collection(db, 'duoStreaks');

// ============================================================================
// INVITE FLOW
// ============================================================================

/**
 * Create a buddy challenge invite.
 * Creates the buddy challenge doc AND the inviter's personal challenge doc.
 */
export const createBuddyChallengeInvite = async (
  inviterId: string,
  partnerId: string,
  teamId: string,
  challengeData: {
    name: string;
    category_id: string;
    challenge_type: 'daily' | 'extended';
    difficulty_expected: number;
    duration_days?: number;
    description?: string;
    success_criteria?: string;
    why?: string;
    library_challenge_id?: string;
    barrier_type?: string;
    action_type?: string;
    time_category?: string;
    neuroscience_explanation?: string;
    psychological_benefit?: string;
    what_youll_learn?: string;
    common_resistance?: string[];
  },
  inviterUsername?: string,
  partnerUsername?: string,
): Promise<string> => {
  // Create the buddy challenge doc
  const buddyData: Omit<BuddyChallenge, 'id'> = {
    inviter_id: inviterId,
    inviter_username: inviterUsername,
    partner_id: partnerId,
    partner_username: partnerUsername,
    team_id: teamId,
    challenge_name: challengeData.name,
    challenge_type: challengeData.challenge_type,
    category_id: challengeData.category_id,
    difficulty_expected: challengeData.difficulty_expected,
    duration_days: challengeData.duration_days,
    description: challengeData.description,
    success_criteria: challengeData.success_criteria,
    why: challengeData.why,
    library_challenge_id: challengeData.library_challenge_id,
    barrier_type: challengeData.barrier_type as BuddyChallenge['barrier_type'],
    action_type: challengeData.action_type as BuddyChallenge['action_type'],
    time_category: challengeData.time_category as BuddyChallenge['time_category'],
    neuroscience_explanation: challengeData.neuroscience_explanation,
    psychological_benefit: challengeData.psychological_benefit,
    what_youll_learn: challengeData.what_youll_learn,
    common_resistance: challengeData.common_resistance,
    status: 'pending',
    inviter_status: 'active',
    partner_status: 'pending',
    buddy_bonus_applied: false,
    created_at: new Date().toISOString(),
  };

  // Filter out undefined values
  const cleanBuddyData = Object.fromEntries(
    Object.entries(buddyData).filter(([_, value]) => value !== undefined)
  );

  const buddyDocRef = await addDoc(buddyChallengesRef(), cleanBuddyData);
  const buddyChallengeId = buddyDocRef.id;

  // Create inviter's personal challenge doc
  const inviterChallengeId = await createChallenge(inviterId, {
    name: challengeData.name,
    category_id: challengeData.category_id,
    date: new Date().toISOString().split('T')[0],
    difficulty_expected: challengeData.difficulty_expected,
    challenge_type: challengeData.challenge_type,
    duration_days: challengeData.duration_days,
    description: challengeData.description,
    success_criteria: challengeData.success_criteria,
    why: challengeData.why,
    library_challenge_id: challengeData.library_challenge_id,
    barrier_type: challengeData.barrier_type as Challenge['barrier_type'],
    action_type: challengeData.action_type as Challenge['action_type'],
    time_category: challengeData.time_category as Challenge['time_category'],
    neuroscience_explanation: challengeData.neuroscience_explanation,
    psychological_benefit: challengeData.psychological_benefit,
    what_youll_learn: challengeData.what_youll_learn,
    common_resistance: challengeData.common_resistance,
    buddy_challenge_id: buddyChallengeId,
    is_buddy_challenge: true,
    buddy_partner_id: partnerId,
    buddy_partner_username: partnerUsername,
  });

  // Update buddy doc with inviter's challenge ID
  await updateDoc(buddyDocRef, { inviter_challenge_id: inviterChallengeId });

  return buddyChallengeId;
};

/**
 * Convenience wrapper: create a buddy challenge from a library challenge.
 */
export const createBuddyChallengeFromLibrary = async (
  inviterId: string,
  partnerId: string,
  teamId: string,
  libraryChallenge: LibraryChallenge,
  duration: number,
  inviterUsername?: string,
  partnerUsername?: string,
): Promise<string> => {
  const isExtended = duration > 1;
  return createBuddyChallengeInvite(
    inviterId,
    partnerId,
    teamId,
    {
      name: libraryChallenge.name,
      category_id: libraryChallenge.category,
      challenge_type: isExtended ? 'extended' : 'daily',
      difficulty_expected: libraryChallenge.difficulty,
      duration_days: isExtended ? duration : undefined,
      description: libraryChallenge.description,
      success_criteria: libraryChallenge.success_criteria,
      why: libraryChallenge.why,
      library_challenge_id: libraryChallenge.id,
      barrier_type: libraryChallenge.barrier_type,
      action_type: libraryChallenge.action_type,
      time_category: libraryChallenge.time_category,
      neuroscience_explanation: libraryChallenge.neuroscience_explanation,
      psychological_benefit: libraryChallenge.psychological_benefit,
      what_youll_learn: libraryChallenge.what_youll_learn,
      common_resistance: libraryChallenge.common_resistance,
    },
    inviterUsername,
    partnerUsername,
  );
};

/**
 * Accept a buddy challenge invite.
 * Creates the partner's personal challenge doc and activates the buddy challenge.
 */
export const acceptBuddyChallenge = async (
  partnerId: string,
  buddyChallengeId: string,
): Promise<void> => {
  const buddyRef = doc(db, 'buddyChallenges', buddyChallengeId);
  const buddySnap = await getDoc(buddyRef);
  if (!buddySnap.exists()) throw new Error('Buddy challenge not found.');

  const buddy = { id: buddySnap.id, ...buddySnap.data() } as BuddyChallenge;
  if (buddy.partner_id !== partnerId) throw new Error('Not the invited partner.');
  if (buddy.partner_status !== 'pending') throw new Error('Invite already handled.');

  // Fetch inviter's username for the partner's challenge display
  const inviterDoc = await getDoc(doc(db, 'users', buddy.inviter_id));
  const inviterUsername = inviterDoc.exists() ? (inviterDoc.data() as User).username : undefined;

  // Create partner's personal challenge doc
  const partnerChallengeId = await createChallenge(partnerId, {
    name: buddy.challenge_name,
    category_id: buddy.category_id,
    date: new Date().toISOString().split('T')[0],
    difficulty_expected: buddy.difficulty_expected,
    challenge_type: buddy.challenge_type,
    duration_days: buddy.duration_days,
    description: buddy.description,
    success_criteria: buddy.success_criteria,
    why: buddy.why,
    library_challenge_id: buddy.library_challenge_id,
    barrier_type: buddy.barrier_type,
    action_type: buddy.action_type,
    time_category: buddy.time_category,
    neuroscience_explanation: buddy.neuroscience_explanation,
    psychological_benefit: buddy.psychological_benefit,
    what_youll_learn: buddy.what_youll_learn,
    common_resistance: buddy.common_resistance,
    buddy_challenge_id: buddyChallengeId,
    is_buddy_challenge: true,
    buddy_partner_id: buddy.inviter_id,
    buddy_partner_username: inviterUsername,
  });

  // Update buddy challenge doc
  await updateDoc(buddyRef, {
    status: 'active' as BuddyChallengeStatus,
    partner_status: 'active',
    partner_challenge_id: partnerChallengeId,
    accepted_at: new Date().toISOString(),
  });
};

/**
 * Decline a buddy challenge invite. Quiet — no notification to inviter.
 * Clears buddy fields on inviter's challenge so they continue solo.
 */
export const declineBuddyChallenge = async (
  partnerId: string,
  buddyChallengeId: string,
): Promise<void> => {
  const buddyRef = doc(db, 'buddyChallenges', buddyChallengeId);
  const buddySnap = await getDoc(buddyRef);
  if (!buddySnap.exists()) throw new Error('Buddy challenge not found.');

  const buddy = { id: buddySnap.id, ...buddySnap.data() } as BuddyChallenge;
  if (buddy.partner_id !== partnerId) throw new Error('Not the invited partner.');

  // Update buddy doc
  await updateDoc(buddyRef, {
    status: 'declined' as BuddyChallengeStatus,
    partner_status: 'declined',
  });

  // Clear buddy fields on inviter's challenge so they continue solo
  if (buddy.inviter_challenge_id) {
    const inviterChallengeRef = doc(db, 'users', buddy.inviter_id, 'challenges', buddy.inviter_challenge_id);
    await updateDoc(inviterChallengeRef, {
      buddy_challenge_id: null,
      is_buddy_challenge: false,
      buddy_partner_id: null,
      buddy_partner_username: null,
    });
  }
};

// ============================================================================
// STATUS & VISIBILITY
// ============================================================================

/**
 * Get a buddy challenge by ID.
 */
export const getBuddyChallengeById = async (
  buddyChallengeId: string,
): Promise<BuddyChallenge | null> => {
  const buddyRef = doc(db, 'buddyChallenges', buddyChallengeId);
  const snap = await getDoc(buddyRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BuddyChallenge;
};

/**
 * Get all active buddy challenges for a user (as inviter or partner).
 * Requires two Firestore queries merged client-side.
 */
export const getActiveBuddyChallenges = async (
  userId: string,
): Promise<BuddyChallenge[]> => {
  const activeStatuses: BuddyChallengeStatus[] = ['pending', 'active'];

  const [asInviter, asPartner] = await Promise.all([
    getDocs(query(
      buddyChallengesRef(),
      where('inviter_id', '==', userId),
      where('status', 'in', activeStatuses),
    )),
    getDocs(query(
      buddyChallengesRef(),
      where('partner_id', '==', userId),
      where('status', 'in', activeStatuses),
    )),
  ]);

  const results: BuddyChallenge[] = [];
  const seen = new Set<string>();

  for (const snap of [...asInviter.docs, ...asPartner.docs]) {
    if (!seen.has(snap.id)) {
      seen.add(snap.id);
      results.push({ id: snap.id, ...snap.data() } as BuddyChallenge);
    }
  }

  return results;
};

/**
 * Get pending buddy challenge invites for a user (they've been invited).
 */
export const getPendingInvites = async (
  userId: string,
): Promise<BuddyChallenge[]> => {
  const q = query(
    buddyChallengesRef(),
    where('partner_id', '==', userId),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BuddyChallenge));
};

/**
 * Get count of pending invites (for badge display).
 */
export const getPendingInviteCount = async (
  userId: string,
): Promise<number> => {
  const invites = await getPendingInvites(userId);
  return invites.length;
};

/**
 * Get the partner's status from a buddy challenge.
 * "Partner" is determined relative to the asking user.
 */
export const getPartnerChallengeStatus = async (
  userId: string,
  buddyChallengeId: string,
): Promise<{ status: string; username?: string } | null> => {
  const buddy = await getBuddyChallengeById(buddyChallengeId);
  if (!buddy) return null;

  if (userId === buddy.inviter_id) {
    return { status: buddy.partner_status, username: buddy.partner_username };
  } else {
    return { status: buddy.inviter_status, username: buddy.inviter_username };
  }
};

/**
 * Get the partner's challenge milestones for an extended buddy challenge.
 * Reads the partner's actual challenge document to get their daily check-in data.
 */
export const getPartnerChallengeMilestones = async (
  userId: string,
  buddyChallengeId: string,
): Promise<{ milestones: Challenge['milestones']; username?: string } | null> => {
  const buddy = await getBuddyChallengeById(buddyChallengeId);
  if (!buddy) return null;

  const isInviter = userId === buddy.inviter_id;
  const partnerId = isInviter ? buddy.partner_id : buddy.inviter_id;
  const partnerChallengeId = isInviter ? buddy.partner_challenge_id : buddy.inviter_challenge_id;
  const partnerUsername = isInviter ? buddy.partner_username : buddy.inviter_username;

  if (!partnerChallengeId) return null;

  const challengeRef = doc(db, 'users', partnerId, 'challenges', partnerChallengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return null;

  const partnerChallenge = snap.data() as Challenge;
  return { milestones: partnerChallenge.milestones, username: partnerUsername };
};

// ============================================================================
// NUDGE
// ============================================================================

/**
 * Send a nudge to partner. Limited to one per day per user.
 * Updates the nudge field on the buddy doc (which triggers a Cloud Function notification).
 */
export const sendNudge = async (
  senderId: string,
  buddyChallengeId: string,
): Promise<{ success: boolean; reason?: string }> => {
  const buddy = await getBuddyChallengeById(buddyChallengeId);
  if (!buddy) return { success: false, reason: 'Buddy challenge not found.' };
  if (buddy.status !== 'active') return { success: false, reason: 'Challenge is not active.' };

  const today = new Date().toISOString().split('T')[0];
  const isInviter = senderId === buddy.inviter_id;

  if (!isInviter && senderId !== buddy.partner_id) {
    return { success: false, reason: 'Not a participant.' };
  }

  const lastNudge = isInviter ? buddy.last_nudge_by_inviter : buddy.last_nudge_by_partner;
  if (lastNudge === today) {
    return { success: false, reason: 'Already nudged today.' };
  }

  const buddyRef = doc(db, 'buddyChallenges', buddyChallengeId);
  const updateField = isInviter ? 'last_nudge_by_inviter' : 'last_nudge_by_partner';
  await updateDoc(buddyRef, { [updateField]: today });

  return { success: true };
};

// ============================================================================
// COMPLETION
// ============================================================================

/**
 * Called after a user completes their personal challenge that is part of a buddy challenge.
 * Updates the buddy doc and handles bonus if both complete.
 */
export const onBuddyChallengeUserComplete = async (
  userId: string,
  buddyChallengeId: string,
  completionStatus: 'completed' | 'failed',
  basePointsEarned: number,
): Promise<{ bothComplete: boolean; bonusPoints: number }> => {
  const buddyRef = doc(db, 'buddyChallenges', buddyChallengeId);
  const buddy = await getBuddyChallengeById(buddyChallengeId);
  if (!buddy) return { bothComplete: false, bonusPoints: 0 };

  const isInviter = userId === buddy.inviter_id;
  const statusField = isInviter ? 'inviter_status' : 'partner_status';

  // Update the user's status on the buddy doc
  await updateDoc(buddyRef, { [statusField]: completionStatus });

  // Check if both are now complete
  const otherStatus = isInviter ? buddy.partner_status : buddy.inviter_status;
  const bothComplete = completionStatus === 'completed' && otherStatus === 'completed';

  if (bothComplete) {
    // Calculate buddy bonus for the completing user
    const bonusPoints = Math.round(basePointsEarned * (POINTS.BUDDY_BONUS_MULTIPLIER - 1));

    // Award bonus to this user
    await updateWillpowerStats(userId, bonusPoints);

    // Award bonus to the partner too
    // We need the partner's base points — use same bonus calculation for fairness
    const partnerId = isInviter ? buddy.partner_id : buddy.inviter_id;
    await updateWillpowerStats(partnerId, bonusPoints);

    // Update duo streak
    await updateDuoStreak(buddy.inviter_id, buddy.partner_id);

    // Create shared feed entry
    const feedEntryId = await createBuddyCompletionFeedEntry(
      buddy.inviter_id,
      buddy.inviter_username,
      buddy.partner_username,
      buddy.challenge_name,
      buddy.category_id,
      buddy.category_id,
    );

    // Mark buddy challenge as completed
    await updateDoc(buddyRef, {
      status: 'completed' as BuddyChallengeStatus,
      completed_at: new Date().toISOString(),
      buddy_bonus_applied: true,
      inviter_reflection_unlocked: true,
      partner_reflection_unlocked: true,
      feed_entry_id: feedEntryId,
    });

    return { bothComplete: true, bonusPoints };
  }

  return { bothComplete: false, bonusPoints: 0 };
};

// ============================================================================
// DUO STREAK
// ============================================================================

/**
 * Generate a deterministic duo streak doc ID from two user IDs.
 */
export const generateDuoStreakId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

/**
 * Get the duo streak between two users.
 */
export const getDuoStreak = async (
  userId1: string,
  userId2: string,
): Promise<DuoStreak | null> => {
  const docId = generateDuoStreakId(userId1, userId2);
  const docRef = doc(db, 'duoStreaks', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DuoStreak;
};

/**
 * Increment the duo streak between two users (or create if first time).
 */
export const updateDuoStreak = async (
  userId1: string,
  userId2: string,
): Promise<DuoStreak> => {
  const docId = generateDuoStreakId(userId1, userId2);
  const docRef = doc(db, 'duoStreaks', docId);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
    const data = existing.data() as DuoStreak;
    const updated = {
      challenges_completed: data.challenges_completed + 1,
      last_completed_at: new Date().toISOString(),
    };
    await updateDoc(docRef, updated);
    return { ...data, ...updated };
  } else {
    const sortedIds = [userId1, userId2].sort() as [string, string];
    const newStreak: Omit<DuoStreak, 'id'> = {
      user_ids: sortedIds,
      challenges_completed: 1,
      first_completed_at: new Date().toISOString(),
      last_completed_at: new Date().toISOString(),
    };
    await setDoc(docRef, { id: docId, ...newStreak });
    return { id: docId, ...newStreak };
  }
};

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChallengeSubmission, SubmissionStatus, LibraryChallengeExtended } from '../types';

// Submissions are stored in a top-level collection for admin access
const submissionsRef = () => collection(db, 'challengeSubmissions');

// Extended library challenges (user-submitted ones)
const libraryRef = () => collection(db, 'challengeLibrary');

// ============================================================================
// SUBMISSION OPERATIONS
// ============================================================================

/**
 * Submit a challenge to the library
 */
export const submitChallenge = async (
  userId: string,
  userLevel: number,
  originalChallengeId: string,
  data: {
    name: string;
    category_id: string;
    category_name: string;
    difficulty_suggested: number;
    description: string;
    success_criteria?: string;
    tips?: string;
    variations?: string;
  }
): Promise<string> => {

  // Check if user has been banned from submitting
  // (This would require checking the user document, handled at calling level)

  // Check for recent rejections (rate limiting)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentRejections = await getDocs(
    query(
      submissionsRef(),
      where('user_id', '==', userId),
      where('status', '==', 'rejected')
    )
  );

  const hasRecentRejection = recentRejections.docs.some((d) => {
    const data = d.data() as ChallengeSubmission;
    return new Date(data.reviewed_at || data.submitted_at) > thirtyDaysAgo;
  });

  if (hasRecentRejection) {
    throw new Error(
      'You have a rejected submission in the last 30 days. Please wait before submitting again.'
    );
  }

  // Check if this challenge was already submitted
  const existingSubmission = await getDocs(
    query(
      submissionsRef(),
      where('user_id', '==', userId),
      where('original_challenge_id', '==', originalChallengeId)
    )
  );

  if (!existingSubmission.empty) {
    throw new Error('You have already submitted this challenge');
  }

  const submissionData: Omit<ChallengeSubmission, 'id'> = {
    user_id: userId,
    user_level: userLevel,
    original_challenge_id: originalChallengeId,
    name: data.name,
    category_id: data.category_id,
    category_name: data.category_name,
    difficulty_suggested: data.difficulty_suggested,
    description: data.description,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };

  // Only add optional fields if provided
  if (data.success_criteria) submissionData.success_criteria = data.success_criteria;
  if (data.tips) submissionData.tips = data.tips;
  if (data.variations) submissionData.variations = data.variations;

  const docRef = await addDoc(submissionsRef(), submissionData);
  return docRef.id;
};

/**
 * Get all submissions for a user
 */
export const getUserSubmissions = async (
  userId: string
): Promise<ChallengeSubmission[]> => {
  const q = query(submissionsRef(), where('user_id', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ChallengeSubmission))
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
};

/**
 * Get a submission by ID
 */
export const getSubmissionById = async (
  submissionId: string
): Promise<ChallengeSubmission | null> => {
  const ref = doc(db, 'challengeSubmissions', submissionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ChallengeSubmission;
};

/**
 * Withdraw a pending submission
 */
export const withdrawSubmission = async (
  submissionId: string,
  userId: string
): Promise<void> => {
  const submission = await getSubmissionById(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.user_id !== userId) {
    throw new Error('You can only withdraw your own submissions');
  }
  if (submission.status !== 'pending') {
    throw new Error('Only pending submissions can be withdrawn');
  }

  const ref = doc(db, 'challengeSubmissions', submissionId);
  await updateDoc(ref, { status: 'withdrawn' });
};

/**
 * Check if a challenge can be submitted
 * Returns { canSubmit: boolean, reason?: string }
 */
export const canSubmitChallenge = async (
  userId: string,
  userLevel: number,
  challengeId: string
): Promise<{ canSubmit: boolean; reason?: string }> => {
  // Check if already submitted
  const existing = await getDocs(
    query(
      submissionsRef(),
      where('user_id', '==', userId),
      where('original_challenge_id', '==', challengeId)
    )
  );

  if (!existing.empty) {
    const submission = existing.docs[0].data() as ChallengeSubmission;
    switch (submission.status) {
      case 'pending':
        return { canSubmit: false, reason: 'Already submitted (pending review)' };
      case 'approved':
        return { canSubmit: false, reason: 'Already approved' };
      case 'rejected':
        return { canSubmit: false, reason: 'Previously rejected' };
      case 'withdrawn':
        // Can resubmit if withdrawn
        return { canSubmit: true };
    }
  }

  return { canSubmit: true };
};

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Get all pending submissions (admin only)
 */
export const getPendingSubmissions = async (): Promise<ChallengeSubmission[]> => {
  const q = query(submissionsRef(), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ChallengeSubmission))
    .sort(
      (a, b) =>
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
};

/**
 * Approve a submission and add to library (admin only)
 */
export const approveSubmission = async (
  submissionId: string,
  adminId: string,
  edits?: Partial<
    Pick<
      ChallengeSubmission,
      'name' | 'description' | 'success_criteria' | 'tips' | 'variations' | 'difficulty_suggested'
    >
  >
): Promise<string> => {
  const submission = await getSubmissionById(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'pending') {
    throw new Error('Only pending submissions can be approved');
  }

  // Apply any edits
  const finalData = {
    name: edits?.name || submission.name,
    description: edits?.description || submission.description,
    difficulty_suggested: edits?.difficulty_suggested || submission.difficulty_suggested,
    success_criteria: edits?.success_criteria || submission.success_criteria,
    tips: edits?.tips || submission.tips,
    variations: edits?.variations || submission.variations,
  };

  // Create library entry
  const libraryData: Omit<LibraryChallengeExtended, 'id'> = {
    name: finalData.name,
    category: submission.category_name,
    difficulty: finalData.difficulty_suggested,
    description: finalData.description,
    success_criteria: finalData.success_criteria,
    source: 'user_submitted',
    submitted_by_level: submission.user_level,
    submitted_at: submission.submitted_at,
    submission_status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
    tips: finalData.tips,
    variations: finalData.variations,
    times_attempted: 0,
    times_completed: 0,
    average_difficulty: finalData.difficulty_suggested,
    review_count: 0,
    recommendation_rate: 0,
  };

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(libraryData).filter(([_, v]) => v !== undefined)
  );

  const libraryDocRef = await addDoc(libraryRef(), cleanData);

  // Update submission status
  const submissionRef = doc(db, 'challengeSubmissions', submissionId);
  await updateDoc(submissionRef, {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
    library_challenge_id: libraryDocRef.id,
  });

  return libraryDocRef.id;
};

/**
 * Reject a submission (admin only)
 */
export const rejectSubmission = async (
  submissionId: string,
  adminId: string,
  reason?: string
): Promise<void> => {
  const submission = await getSubmissionById(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'pending') {
    throw new Error('Only pending submissions can be rejected');
  }

  const submissionRef = doc(db, 'challengeSubmissions', submissionId);
  const updateData: Record<string, any> = {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  };

  if (reason) {
    updateData.rejection_reason = reason;
  }

  await updateDoc(submissionRef, updateData);
};

/**
 * Get submission statistics (admin dashboard)
 */
export const getSubmissionStats = async (): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  withdrawn: number;
  approvalRate: number;
}> => {
  const snap = await getDocs(submissionsRef());
  const submissions = snap.docs.map((d) => d.data() as ChallengeSubmission);

  const pending = submissions.filter((s) => s.status === 'pending').length;
  const approved = submissions.filter((s) => s.status === 'approved').length;
  const rejected = submissions.filter((s) => s.status === 'rejected').length;
  const withdrawn = submissions.filter((s) => s.status === 'withdrawn').length;

  const reviewed = approved + rejected;
  const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;

  return { pending, approved, rejected, withdrawn, approvalRate };
};

// ============================================================================
// LIBRARY OPERATIONS
// ============================================================================

/**
 * Get user-submitted challenges from the library
 */
export const getUserSubmittedLibraryChallenges = async (): Promise<
  LibraryChallengeExtended[]
> => {
  const q = query(libraryRef(), where('source', '==', 'user_submitted'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LibraryChallengeExtended));
};

/**
 * Update library challenge stats when someone completes it
 */
export const updateLibraryChallengeStats = async (
  challengeId: string,
  completed: boolean,
  actualDifficulty: number
): Promise<void> => {
  const ref = doc(db, 'challengeLibrary', challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as LibraryChallengeExtended;

  // Only update if it's a user-submitted challenge with tracking
  if (data.source !== 'user_submitted') return;

  const newAttempted = (data.times_attempted || 0) + 1;
  const newCompleted = completed
    ? (data.times_completed || 0) + 1
    : data.times_completed || 0;

  // Recalculate average difficulty
  const currentTotal = (data.average_difficulty || data.difficulty) * (data.times_attempted || 0);
  const newAverage = (currentTotal + actualDifficulty) / newAttempted;

  await updateDoc(ref, {
    times_attempted: newAttempted,
    times_completed: newCompleted,
    average_difficulty: newAverage,
  });
};

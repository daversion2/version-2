import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ChallengeReview,
  ReviewVote,
  ChallengeReviewStats,
  OverallExperience,
  DifficultyAccuracy,
} from '../types';

// Reviews are stored in a top-level collection
const reviewsRef = () => collection(db, 'challengeReviews');
const votesRef = () => collection(db, 'reviewVotes');

// ============================================================================
// REVIEW CRUD OPERATIONS
// ============================================================================

/**
 * Create a new review for a library challenge
 */
export const createReview = async (
  userId: string,
  userLevel: number,
  libraryChallengeId: string,
  completionId: string,
  data: {
    overall_experience: OverallExperience;
    difficulty_accuracy: DifficultyAccuracy;
    would_recommend: boolean;
    what_made_it_hard?: string;
    tips_for_success?: string;
  }
): Promise<string> => {
  // Check if user already reviewed this challenge
  const existing = await getUserReviewForChallenge(userId, libraryChallengeId);
  if (existing) {
    throw new Error('You have already reviewed this challenge');
  }

  const reviewData: Omit<ChallengeReview, 'id'> = {
    library_challenge_id: libraryChallengeId,
    user_id: userId,
    user_level: userLevel,
    completion_id: completionId,
    overall_experience: data.overall_experience,
    difficulty_accuracy: data.difficulty_accuracy,
    would_recommend: data.would_recommend,
    created_at: new Date().toISOString(),
    helpful_count: 0,
    reported: false,
    hidden: false,
  };

  // Only add optional fields if provided and non-empty
  if (data.what_made_it_hard?.trim()) {
    reviewData.what_made_it_hard = data.what_made_it_hard.trim().substring(0, 500);
  }
  if (data.tips_for_success?.trim()) {
    reviewData.tips_for_success = data.tips_for_success.trim().substring(0, 500);
  }

  const docRef = await addDoc(reviewsRef(), reviewData);

  // Update the library challenge's review count
  await updateLibraryChallengeReviewStats(libraryChallengeId);

  return docRef.id;
};

/**
 * Get a review by ID
 */
export const getReviewById = async (
  reviewId: string
): Promise<ChallengeReview | null> => {
  const ref = doc(db, 'challengeReviews', reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ChallengeReview;
};

/**
 * Get user's review for a specific challenge
 */
export const getUserReviewForChallenge = async (
  userId: string,
  libraryChallengeId: string
): Promise<ChallengeReview | null> => {
  const q = query(
    reviewsRef(),
    where('user_id', '==', userId),
    where('library_challenge_id', '==', libraryChallengeId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ChallengeReview;
};

/**
 * Update a review (only within 24 hours of creation)
 */
export const updateReview = async (
  reviewId: string,
  userId: string,
  data: Partial<
    Pick<
      ChallengeReview,
      | 'overall_experience'
      | 'difficulty_accuracy'
      | 'would_recommend'
      | 'what_made_it_hard'
      | 'tips_for_success'
    >
  >
): Promise<void> => {
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Review not found');
  if (review.user_id !== userId) {
    throw new Error('You can only edit your own reviews');
  }

  const createdAt = new Date(review.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new Error('Reviews can only be edited within 24 hours of creation');
  }

  const updateData: Record<string, any> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Truncate text fields
  if (updateData.what_made_it_hard) {
    updateData.what_made_it_hard = updateData.what_made_it_hard.trim().substring(0, 500);
  }
  if (updateData.tips_for_success) {
    updateData.tips_for_success = updateData.tips_for_success.trim().substring(0, 500);
  }

  const ref = doc(db, 'challengeReviews', reviewId);
  await updateDoc(ref, updateData);

  // Update stats
  await updateLibraryChallengeReviewStats(review.library_challenge_id);
};

/**
 * Delete a review (only within 24 hours of creation)
 */
export const deleteReview = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Review not found');
  if (review.user_id !== userId) {
    throw new Error('You can only delete your own reviews');
  }

  const createdAt = new Date(review.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new Error('Reviews can only be deleted within 24 hours of creation');
  }

  const libraryChallengeId = review.library_challenge_id;

  // Delete the review
  const ref = doc(db, 'challengeReviews', reviewId);
  await deleteDoc(ref);

  // Delete associated votes
  const votesQuery = query(votesRef(), where('review_id', '==', reviewId));
  const votesSnap = await getDocs(votesQuery);
  for (const voteDoc of votesSnap.docs) {
    await deleteDoc(voteDoc.ref);
  }

  // Update stats
  await updateLibraryChallengeReviewStats(libraryChallengeId);
};

// ============================================================================
// REVIEW RETRIEVAL
// ============================================================================

/**
 * Get reviews for a library challenge (visible, not hidden)
 */
export const getChallengeReviews = async (
  libraryChallengeId: string,
  sortBy: 'helpful' | 'recent' = 'helpful',
  maxReviews: number = 50
): Promise<ChallengeReview[]> => {
  const q = query(
    reviewsRef(),
    where('library_challenge_id', '==', libraryChallengeId),
    where('hidden', '==', false)
  );
  const snap = await getDocs(q);

  let reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChallengeReview));

  // Sort based on preference
  if (sortBy === 'helpful') {
    // Sort by helpful_count descending, then by recency
    reviews.sort((a, b) => {
      if (b.helpful_count !== a.helpful_count) {
        return b.helpful_count - a.helpful_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } else {
    // Sort by recency
    reviews.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return reviews.slice(0, maxReviews);
};

/**
 * Get the most helpful review for a challenge (for preview)
 */
export const getMostHelpfulReview = async (
  libraryChallengeId: string
): Promise<ChallengeReview | null> => {
  const reviews = await getChallengeReviews(libraryChallengeId, 'helpful', 1);
  return reviews.length > 0 ? reviews[0] : null;
};

/**
 * Get all reviews by a user
 */
export const getUserReviews = async (userId: string): Promise<ChallengeReview[]> => {
  const q = query(reviewsRef(), where('user_id', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ChallengeReview))
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
};

// ============================================================================
// VOTING (HELPFUL)
// ============================================================================

/**
 * Vote a review as helpful
 */
export const voteHelpful = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  // Check if already voted
  const existing = await getDocs(
    query(
      votesRef(),
      where('review_id', '==', reviewId),
      where('user_id', '==', userId)
    )
  );

  if (!existing.empty) {
    throw new Error('You have already voted on this review');
  }

  // Check review exists
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Review not found');

  // Can't vote on own review
  if (review.user_id === userId) {
    throw new Error("You can't vote on your own review");
  }

  // Add vote
  await addDoc(votesRef(), {
    review_id: reviewId,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  // Update helpful count
  const reviewRef = doc(db, 'challengeReviews', reviewId);
  await updateDoc(reviewRef, {
    helpful_count: review.helpful_count + 1,
  });
};

/**
 * Remove helpful vote
 */
export const removeHelpfulVote = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  const voteQuery = query(
    votesRef(),
    where('review_id', '==', reviewId),
    where('user_id', '==', userId)
  );
  const voteSnap = await getDocs(voteQuery);

  if (voteSnap.empty) {
    throw new Error('No vote found');
  }

  // Delete vote
  await deleteDoc(voteSnap.docs[0].ref);

  // Update helpful count
  const review = await getReviewById(reviewId);
  if (review) {
    const reviewRef = doc(db, 'challengeReviews', reviewId);
    await updateDoc(reviewRef, {
      helpful_count: Math.max(0, review.helpful_count - 1),
    });
  }
};

/**
 * Check if user has voted on a review
 */
export const hasUserVoted = async (
  reviewId: string,
  userId: string
): Promise<boolean> => {
  const voteQuery = query(
    votesRef(),
    where('review_id', '==', reviewId),
    where('user_id', '==', userId)
  );
  const voteSnap = await getDocs(voteQuery);
  return !voteSnap.empty;
};

// ============================================================================
// REPORTING & MODERATION
// ============================================================================

/**
 * Report a review
 */
export const reportReview = async (reviewId: string): Promise<void> => {
  const ref = doc(db, 'challengeReviews', reviewId);
  await updateDoc(ref, { reported: true });
};

/**
 * Hide a review (admin only)
 */
export const hideReview = async (reviewId: string): Promise<void> => {
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Review not found');

  const ref = doc(db, 'challengeReviews', reviewId);
  await updateDoc(ref, { hidden: true });

  // Update stats
  await updateLibraryChallengeReviewStats(review.library_challenge_id);
};

/**
 * Unhide a review (admin only)
 */
export const unhideReview = async (reviewId: string): Promise<void> => {
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Review not found');

  const ref = doc(db, 'challengeReviews', reviewId);
  await updateDoc(ref, { hidden: false });

  // Update stats
  await updateLibraryChallengeReviewStats(review.library_challenge_id);
};

/**
 * Get reported reviews (admin only)
 */
export const getReportedReviews = async (): Promise<ChallengeReview[]> => {
  const q = query(reviewsRef(), where('reported', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChallengeReview));
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate review statistics for a library challenge
 */
export const getChallengeReviewStats = async (
  libraryChallengeId: string
): Promise<ChallengeReviewStats> => {
  const reviews = await getChallengeReviews(libraryChallengeId, 'recent', 1000);

  if (reviews.length === 0) {
    return {
      library_challenge_id: libraryChallengeId,
      total_reviews: 0,
      recommendation_rate: 0,
      difficulty_accuracy: { easier: 0, about_right: 0, harder: 0 },
      average_experience_score: 0,
    };
  }

  const total = reviews.length;
  const recommenders = reviews.filter((r) => r.would_recommend).length;
  const recommendationRate = (recommenders / total) * 100;

  const difficultyAccuracy = {
    easier: reviews.filter((r) => r.difficulty_accuracy === 'easier').length,
    about_right: reviews.filter((r) => r.difficulty_accuracy === 'about_right').length,
    harder: reviews.filter((r) => r.difficulty_accuracy === 'harder').length,
  };

  // Experience score: challenging=1, neutral=2, positive=3
  const experienceScores = reviews.map((r) => {
    switch (r.overall_experience) {
      case 'challenging':
        return 1;
      case 'neutral':
        return 2;
      case 'positive':
        return 3;
    }
  });
  const averageExperience =
    experienceScores.reduce((a, b) => a + b, 0) / experienceScores.length;

  return {
    library_challenge_id: libraryChallengeId,
    total_reviews: total,
    recommendation_rate: recommendationRate,
    difficulty_accuracy: difficultyAccuracy,
    average_experience_score: averageExperience,
  };
};

/**
 * Update the library challenge's review stats
 * Called after review create/update/delete
 */
const updateLibraryChallengeReviewStats = async (
  libraryChallengeId: string
): Promise<void> => {
  const stats = await getChallengeReviewStats(libraryChallengeId);

  const ref = doc(db, 'challengeLibrary', libraryChallengeId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      review_count: stats.total_reviews,
      recommendation_rate: stats.recommendation_rate,
    });
  }
};

/**
 * Format relative time for review display
 */
export const formatReviewTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
};

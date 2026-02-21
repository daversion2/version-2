// Core data models per spec

export interface User {
  id: string;
  email: string;
  created_at: string;
  has_completed_onboarding?: boolean;
  has_completed_walkthrough?: boolean;
  expoPushToken?: string;
  timezone?: string; // IANA timezone e.g. "America/New_York"
  // Willpower Bank
  totalWillpowerPoints?: number;
  currentStreak?: number;
  lastActivityDate?: string; // YYYY-MM-DD format for streak tracking
  // Community features
  team_id?: string;
  inspiration_feed_opt_in?: boolean; // Default true
  submission_ban_until?: string; // ISO timestamp if rate-limited
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'archived' | 'cancelled';

export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  date: string;
  difficulty_expected: number; // 1-5
  status: ChallengeStatus;
  difficulty_actual?: number; // 1-5
  points_awarded?: number;
  reflection_note?: string;
  reflection_hardest_moment?: string;
  reflection_push_through?: string;
  reflection_next_time?: string;
  created_at: string;
  completed_at?: string;
  description?: string;
  success_criteria?: string;
  why?: string;
  deadline?: string; // ISO 8601 timestamp, optional
}

export interface Nudge {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  created_by_user: boolean;
  target_count_per_week: number; // 1–7
}

export interface CompletionLog {
  id: string;
  user_id: string;
  type: 'challenge' | 'nudge';
  reference_id: string;
  points: number;
  difficulty: number;
  date: string;
  completed_at?: string; // ISO 8601 timestamp
  notes?: string; // Optional notes for this completion
}

export type HabitDifficulty = 'easy' | 'challenging';

// Public challenge library template
export interface LibraryChallenge {
  id: string;
  name: string;
  category: string; // Category name (Physical, Mental, etc.)
  difficulty: number; // 1-5 suggested difficulty
  description?: string;
  success_criteria?: string;
  why?: string;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Physical', color: '#217180' },
  { name: 'Mental', color: '#FF5B02' },
  { name: 'Social', color: '#2B2B2B' },
  { name: 'Professional', color: '#656565' },
  { name: 'Creative', color: '#217180' },
];

// Habit streak information
export interface HabitStreakInfo {
  habitId: string;
  currentStreak: number; // Consecutive days with at least one completion
  longestStreak: number;
}

// Aggregated habit statistics for detail screen
export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  totalPoints: number;
  firstCompletionDate: string | null; // YYYY-MM-DD or null if never completed
  weeklyTrend: number[]; // Last 8 weeks completion counts (oldest to newest)
  completionsByDate: Record<string, number>; // YYYY-MM-DD -> count for calendar heat map
}

// ============================================================================
// COMMUNITY FEATURES
// ============================================================================

// --- Teams (Accountability Groups) ---

export type TeamStatus = 'active' | 'archived';

export interface Team {
  id: string;
  name: string;
  invite_code: string; // 6-char uppercase alphanumeric
  creator_id: string;
  member_ids: string[]; // Array of user IDs
  created_at: string;
  status: TeamStatus;
  settings: {
    max_members: number; // Default 5
  };
}

export interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  notification_settings: {
    challenge_completions: boolean;
    habit_completions: boolean;
    daily_reminders: boolean;
  };
}

export type TeamActivityType = 'challenge' | 'habit';

export interface TeamActivity {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: TeamActivityType;
  category_id: string;
  category_name: string;
  habit_count?: number; // If type is 'habit', how many
  created_at: string;
}

// Aggregated view of a team member's daily activity (for display)
export interface TeamMemberActivitySummary {
  user_id: string;
  display_name: string;
  has_activity_today: boolean;
  challenge_completed: boolean;
  challenge_category?: string;
  habits_completed: number;
  last_activity_time?: string; // ISO timestamp
  current_streak: number;
}

// --- Inspiration Feed ---

export type DifficultyTier = 'moderate' | 'hard' | 'very_hard';

export interface InspirationFeedEntry {
  id: string;
  user_id: string; // For filtering (not displayed)
  category_id: string;
  category_name: string;
  difficulty_tier: DifficultyTier;
  challenge_teaser?: string; // First 50 chars if opted in
  completed_at: string;
  display_timestamp: string; // Jittered for privacy
  expires_at: string; // 48 hours after completion
}

// --- User-Submitted Challenges ---

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ChallengeSubmission {
  id: string;
  user_id: string;
  user_level: number;
  original_challenge_id: string; // User's own challenge they're submitting

  // Submission content
  name: string;
  category_id: string;
  category_name: string;
  difficulty_suggested: number; // 1-5
  description: string;
  success_criteria?: string;
  tips?: string;
  variations?: string;

  // Status tracking
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;

  // If approved, link to library entry
  library_challenge_id?: string;
}

// Extended library challenge with community features
export interface LibraryChallengeExtended extends LibraryChallenge {
  // Source tracking
  source: 'system' | 'user_submitted';
  submitted_by_level?: number;
  submitted_at?: string;
  submission_status?: SubmissionStatus;
  approved_at?: string;
  approved_by?: string;

  // Additional submission details
  tips?: string;
  variations?: string;

  // Community stats
  times_attempted: number;
  times_completed: number;
  average_difficulty: number; // Calculated from completions
  review_count: number;
  recommendation_rate: number; // Percentage who would recommend
}

// --- Challenge Reviews ---

export type OverallExperience = 'positive' | 'neutral' | 'challenging';
export type DifficultyAccuracy = 'easier' | 'about_right' | 'harder';

export interface ChallengeReview {
  id: string;
  library_challenge_id: string;
  user_id: string;
  user_level: number; // Level at time of review
  completion_id: string; // Link to user's completion

  // Review content
  overall_experience: OverallExperience;
  difficulty_accuracy: DifficultyAccuracy;
  what_made_it_hard?: string;
  tips_for_success?: string;
  would_recommend: boolean;

  // Metadata
  created_at: string;
  updated_at?: string;
  helpful_count: number;
  reported: boolean;
  hidden: boolean; // Admin can hide
}

export interface ReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

// Aggregated review stats for display on library challenges
export interface ChallengeReviewStats {
  library_challenge_id: string;
  total_reviews: number;
  recommendation_rate: number; // Percentage who would recommend
  difficulty_accuracy: {
    easier: number;
    about_right: number;
    harder: number;
  };
  average_experience_score: number; // 1-3 (challenging=1, neutral=2, positive=3)
}

// --- Extended User type with community fields ---

export interface UserCommunityFields {
  team_id?: string;
  inspiration_feed_opt_in: boolean; // Default true
  submission_ban_until?: string; // ISO timestamp if rate-limited
}

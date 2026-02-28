// Core data models per spec

export interface User {
  id: string;
  email: string;
  username?: string;
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
  // Admin
  is_admin?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'archived' | 'cancelled';

export type ChallengeType = 'daily' | 'extended';

export interface ChallengeMilestone {
  id: string;
  day_number: number;
  completed: boolean;
  completed_at?: string;
  succeeded?: boolean;  // true = kept challenge, false = broke it
  points_awarded?: number; // 1-5 points chosen by user at daily check-in
  note?: string;
}

export interface ChallengeRepeatStats {
  id: string;
  name: string;
  total_completions: number;
  total_attempts: number;
  first_completed_at?: string;
  last_completed_at?: string;
  challenge_ids: string[];
}

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

  // Extended challenge fields
  challenge_type?: ChallengeType;  // Optional for backwards compat, defaults to 'daily'
  duration_days?: number;
  milestones?: ChallengeMilestone[];
  start_date?: string;
  end_date?: string;

  // Failure reflection field
  failure_reflection?: string;  // "What got in the way?" response

  // Library metadata (optional, populated when selected from library)
  library_challenge_id?: string;
  barrier_type?: BarrierType;
  action_type?: ActionType;
  time_category?: TimeCategory;

  // Educational content (copied from library at selection time)
  neuroscience_explanation?: string;
  psychological_benefit?: string;
  what_youll_learn?: string;
  common_resistance?: string[];
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

// =============================================================================
// CHALLENGE LIBRARY TYPES
// =============================================================================

// Barrier types - psychological categories for organizing challenges
export type BarrierType =
  | 'comfort-zone'
  | 'delayed-gratification'
  | 'discipline'
  | 'ego'
  | 'energy-drainer';

// Time categories - how long challenges take
export type TimeCategory = 'quick-win' | 'ritual' | 'deep-work' | 'all-day';

// Action types - whether you do something or resist something
export type ActionType = 'resist' | 'complete';

// Challenge variation - easier/harder alternatives
export interface ChallengeVariation {
  label: string; // e.g., "Easier", "Harder", "Advanced"
  description: string; // e.g., "30 seconds instead of 60"
}

// Public challenge library template
export interface LibraryChallenge {
  id: string;
  name: string;
  category: string; // Life domain: Physical, Social, Mind
  difficulty: number; // 1-5 suggested difficulty
  description?: string;
  success_criteria?: string;
  why?: string;

  // Organization & Filtering (optional for backward compatibility)
  barrier_type?: BarrierType;
  time_required_minutes?: number;
  time_category?: TimeCategory;
  beginner_friendly?: boolean;
  action_type?: ActionType;

  // Educational Context (optional for backward compatibility)
  neuroscience_explanation?: string;
  psychological_benefit?: string;
  what_youll_learn?: string;
  common_resistance?: string[];

  // Examples & Social Proof (optional)
  real_world_examples?: string[];
  completion_count?: number;
  average_actual_difficulty?: number;

  // Variations - easier/harder alternatives (optional)
  variations?: ChallengeVariation[];

  // Progressive Pathways (optional, for future use)
  related_challenge_ids?: string[];
  next_level_challenge_ids?: string[];
  prerequisite_challenge_ids?: string[];
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Physical', color: '#217180', icon: 'fitness' },
  { name: 'Social', color: '#FF5B02', icon: 'chatbubbles' },
  { name: 'Mind', color: '#7B1FA2', icon: 'bulb-outline' },
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
  username?: string; // Fetched from User document for display
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
  username?: string; // User's username for display
  has_activity_today: boolean;
  challenge_completed: boolean;
  challenge_category?: string;
  habits_completed: number;
  last_activity_time?: string; // ISO timestamp
  current_streak: number;
}

// Individual activity item for feed display
export interface TeamActivityFeedItem {
  id: string;
  user_id: string;
  display_name: string;
  username?: string; // User's username for display
  type: TeamActivityType;
  category_name: string;
  created_at: string;
}

// --- Inspiration Feed ---

export type DifficultyTier = 'moderate' | 'hard' | 'very_hard';

export type FeedEntryType = 'challenge_completion' | 'streak_milestone' | 'level_up' | 'repeat_milestone';

export interface InspirationFeedEntry {
  id: string;
  user_id: string; // For filtering (not displayed)
  username?: string;
  category_id: string;
  category_name: string;
  category_icon?: string;
  difficulty_tier: DifficultyTier;
  challenge_teaser?: string; // First 50 chars if opted in
  completed_at: string;
  display_timestamp: string; // Jittered for privacy
  expires_at: string; // 48 hours after completion
  // Engagement features
  entry_type?: FeedEntryType; // Defaults to 'challenge_completion' for backward compat
  completion_message?: string; // Optional 150-char post-completion message
  streak_tier?: string; // e.g., "On Fire", "Legendary"
  streak_days?: number; // Current streak count at time of entry
  willpower_level?: number; // User's level at time of entry
  willpower_title?: string; // e.g., "Grit Machine"
  // Milestone entry fields
  milestone_value?: number; // e.g., 50 (for "completed 50 times")
  milestone_challenge_name?: string; // e.g., "Cold Shower" (for repeat milestones)
  // Fist bump tracking (count only visible to entry owner)
  fist_bump_count?: number;
}

export interface FistBump {
  id: string;
  feed_entry_id: string;
  sender_id: string;
  created_at: string;
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
  variations_text?: string; // Free-text variations for user submissions

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

// --- Fun Facts ---

export interface FunFact {
  id: string;
  fact: string;
  sourceUrl?: string;
  sourceTitle?: string;
  order: number; // For rotation (dayOfYear % totalFacts)
  created_at: string;
}

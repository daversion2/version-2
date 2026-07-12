// Re-export worksheet types
export * from './worksheets';

// PracticeGroup is defined alongside the Practice catalog (data layer is
// self-contained, so this import introduces no cycle).
import type { PracticeGroup } from '../data/practices';

// ============================================================================
// YOUR STORY (PROOF POINTS)
// ============================================================================

export interface ProofPoint {
  id: string;
  user_id: string;
  hard_moment: string;
  what_you_did: string;
  points_awarded?: number;
  created_at: string;
}

// Core data models per spec

export interface Mantra {
  id: string;
  text: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  has_completed_onboarding?: boolean;
  expoPushToken?: string;
  timezone?: string; // IANA timezone e.g. "America/New_York"
  // XP
  totalWillpowerPoints?: number;
  currentStreak?: number;
  lastActivityDate?: string; // YYYY-MM-DD format for streak tracking
  // Admin
  is_admin?: boolean;
  // Demo mode (admin-only): present while seeded demo data is on the account.
  // Records the exact counter deltas so disableDemoData can reverse them.
  // See src/utils/seedDemoData.ts
  demo_data?: {
    enabled: boolean;
    enabled_at: string;
    xp_added: number;
    habit_logs_added: number;
    challenges_completed_added: number;
  };
  // Programs
  active_program_id?: string; // Denormalized enrollment ID for fast home screen check
  // All-time completion counters (incremented on each completion)
  totalHabitsCompleted?: number;
  totalChallengesCompleted?: number;
  // Nightly Reflection
  last_reflection_date?: string; // YYYY-MM-DD
  reflection_streak?: number;
  // Home Screen Layout
  home_layout?: HomeLayoutItem[];
  // Why Discovery
  has_completed_why_discovery?: boolean;
  why_statement?: string; // Denormalized for fast home screen display
  // New onboarding
  redirect_mantra?: string;
  mantras?: Mantra[];
  active_mantra_id?: string;
  onboarding_pattern?: string;
  onboarding_reflection?: string;
  // One-time intro flags
  has_seen_points_intro?: boolean;
  has_dismissed_goal_prompt?: boolean;
  has_seen_challenges_unlock?: boolean;
  // Default practices auto-seeded onto the home (one-time, on first load)
  has_seeded_practices?: boolean;
  // Practice catalog id picked as the starting point during onboarding —
  // surfaced first (with a badge) on the home practices list
  starting_practice_id?: string;
  // Distinct practices completed at least once (denormalized; powers the
  // {practices_tried} rule placeholder and the month-1 sampler stat)
  practices_tried?: number;
  // Journey check-ins (baseline from onboarding, day-14/28 retakes) —
  // see src/services/checkins.ts
  journey_checkins?: Record<string, { mood: number; focus: number; motivation: number; date: string }>;
  // One-time flag: the post-first-rep reminder prompt has been shown
  has_seen_reminder_prompt?: boolean;
  // One-time flag: the post-first-practice Debrief (recovery science, pleasure
  // trap, research) has been viewed — gates both the auto-trigger and home card
  has_seen_debrief?: boolean;
  // LEGACY — comeback gating now lives in ruleState for the "Comeback check-in" rule
  lastComebackDate?: string;
  // App usage tracking
  app_open_count?: number;
  // Deferred onboarding
  onboarding_deferred?: boolean;
  onboarding_banner_dismissed?: boolean;
  deferred_onboarding_progress?: Record<string, any>;
}

export interface HomeLayoutItem {
  id: string;
  visible: boolean;
}


export type ChallengeStatus = 'active' | 'scheduled' | 'completed' | 'failed' | 'not_yet' | 'archived' | 'cancelled';

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
  category_id?: string;
  date: string;
  difficulty_expected: number; // 1-5
  status: ChallengeStatus;
  difficulty_actual?: number; // 1-5
  points_awarded?: number;
  reflection_note?: string;
  /** Selected mind tag ids from the post-challenge reflection (data/mindTags.ts). */
  mind_tags?: string[];
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

  // Goal tagging
  goal_ids?: string[];

  // Arena tagging (Phase 1) — the override-training domain. See docs/arenas-vs-goals-decision.md
  arena_id?: ArenaId;
}

export interface HabitActionPlan {
  anchor?: string;                 // Q1: habit-stacking anchor — completes "After I ___"
  pairing?: string;                // Temptation bundle — completes "...with ___" (optional)
  environment_change?: string;     // environment design
  obstacle_plan?: string;          // WOOP obstacle + if-then
  minimum_version?: string;        // minimum viable behavior
  accountability_person?: string;  // social commitment
  cue?: string;                    // DEPRECATED: legacy free-text "when/where". Read-only fallback for habits created before the anchor field; new/edited habits write `anchor` instead.
}

// A habit-library category (own taxonomy, separate from challenge LIFE_DOMAINS).
export interface HabitCategory {
  id: string;        // matches LibraryHabit.category_id
  name: string;      // display name
  icon: string;      // Ionicons name
  color: string;     // accent color
}

// Per-habit local reminder, scheduled around the anchor's time of day.
export interface HabitReminder {
  time: string;                    // 'HH:mm' in the user's local time
  enabled: boolean;
  notificationId?: string;         // Expo local-notification id, for cancel/reschedule
}

export interface LibraryHabit {
  id: string;
  name: string;
  category_id?: string;

  // Arena — the override-training domain this habit trains (Phase 0).
  // Optional during the goals→arenas transition. See docs/phase-0-arena-taxonomy.md
  arena_id?: ArenaId;
  off_thesis?: boolean;            // true = off the override thesis (prune / soft-hide candidate)

  description: string;
  suggested_target_per_week: number;
  action_plan: HabitActionPlan;
  identity?: string;               // "Each time I do this, I'm someone who ___" — identity-based framing
}

export interface PracticeInstance {
  id: string;
  user_id: string;
  name: string;
  category_id?: string;
  is_active: boolean;
  created_by_user: boolean;
  target_count_per_week: number; // 1–7
  goal_ids?: string[];
  arena_id?: ArenaId; // Arena tagging (Phase 1)
  practice_id?: string; // links a habit adopted from a Practice (Practice Protocol)
  group?: PracticeGroup; // set on custom (user-authored) practices; curated ones derive group from the catalog via practice_id
  action_plan?: HabitActionPlan;
  reminder?: HabitReminder;
  supports_pairing?: boolean; // habit is suited to temptation bundling (body busy, mind free)
}

export type Quadrant = 'stressed' | 'energized' | 'depleted' | 'calm';

export interface CompletionLog {
  id: string;
  user_id: string;
  type: 'challenge' | 'nudge' | 'program';
  reference_id: string;
  points: number;
  difficulty: number;
  date: string;
  completed_at?: string; // ISO 8601 timestamp
  notes?: string; // Optional notes for this completion — the free-text "I did XYZ"
  // --- Practice tracking + override reflection (all optional) ---
  // Detailed, per-practice numeric/categorical tracking, keyed by TrackingField.key
  // (e.g. { duration_min: 3, water_temp_f: 50, technique: 'breath' }). Numeric values
  // power dashboard trends; this map is intentionally generic so new metrics need no
  // schema change. See Practice.tracking in data/practices.ts.
  metrics?: Record<string, number | string>;
  // Override reflection. `hitHardMoment` is derived from the shared reflection flow
  // (any noticing — a mind tag or written text — counts) and still powers the daily
  // summary. `tactics` (OVERRIDE_TACTICS ids) were captured by the pre-2026-07
  // gate/chips UI; historical logs keep them but the reflection no longer collects them.
  hitHardMoment?: boolean;
  tactics?: string[];
  // The mind-noticing reflection: free text under the 'noticing' key (historical
  // logs hold the old five-prompt answers keyed by prompt id) plus the selected
  // mind tag ids (data/mindTags.ts). `notes` holds the joined human-readable note.
  reflection?: Record<string, string>;
  mindTags?: string[];
  // Before/after emotional state tracking (habit check-ins only)
  energyBefore?: -1 | 1 | null;
  moodBefore?: -1 | 1 | null;
  energyAfter?: -1 | 1 | null;
  moodAfter?: -1 | 1 | null;
  quadrantBefore?: Quadrant | null;
  quadrantAfter?: Quadrant | null;
}

export type HabitDifficulty = 'easy' | 'challenging';

/** Everything the completion sheet can capture for one practice rep. */
export interface PracticeCompletionInput {
  difficulty: HabitDifficulty;
  notes?: string;
  metrics?: Record<string, number | string>;
  hitHardMoment?: boolean;
  tactics?: string[];
  /** Mind-noticing reflection text, stored under the 'noticing' key. */
  reflection?: Record<string, string>;
  /** Selected mind tag ids (data/mindTags.ts). */
  mindTags?: string[];
}

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

// Arenas — the override-training domains ("Training Your Override" direction).
// Six train overriding a "stop/avoid" signal; impulse_control trains overriding a
// "go/grab" (craving) signal — same mechanism, opposite direction.
// Source of truth for arena metadata: src/constants/arenas.ts
// See docs/phase-0-arena-taxonomy.md
export type ArenaId =
  | 'mental_stillness'
  | 'physical_discomfort'
  | 'deliberate_boredom'
  | 'breathwork'
  | 'social_discomfort'
  | 'cognitive_resistance'
  | 'impulse_control';

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

  // Arena — the override-training domain this challenge belongs to (Phase 0).
  // Optional during the goals→arenas transition. See docs/phase-0-arena-taxonomy.md
  arena_id?: ArenaId;
  off_thesis?: boolean; // true = off the override thesis (prune / soft-hide candidate)

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

// --- Fun Facts ---

export interface FunFact {
  id: string;
  fact: string;
  sourceUrl?: string;
  sourceTitle?: string;
  order: number; // For rotation (dayOfYear % totalFacts)
  created_at: string;
}

// --- Neuroscience Tidbits ---

export type TidbitContextType = 'challenge_type' | 'category' | 'state' | 'generic' | 'habit';

export interface NeuroscienceTidbit {
  id: string;
  text: string;                    // 2-3 sentences, ~8s read
  extended_text: string;           // 2-3 paragraphs for "learn more"
  context_type: TidbitContextType;
  context_value: string;           // e.g. 'workout', 'physical', 'comeback', 'generic'
  active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ShownTidbit {
  id: string;
  tidbit_id: string;
  shown_at: string;
  tapped_learn_more: boolean;
}

// ============================================================================
// PROGRAMS
// ============================================================================

export type ProgramMode = 'cold_turkey' | 'gradual_build';

export type ProgramStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export type ProgramId =
  | 'phone_detox'
  | 'diet_reset'
  | 'cold_exposure'
  | 'digital_minimalism'
  | 'morning_discipline';

/** Single day's content within a program variant. */
export interface ProgramDay {
  day_number: number;               // 1-based
  challenge_name: string;
  challenge_description: string;
  success_criteria: string;
  difficulty: number;               // 1-5 expected difficulty
  category: string;                 // 'Physical' | 'Mind' | 'Social'
  educational_title: string;
  educational_content: string;
  neuroscience_note?: string;
  tip?: string;
}

/** Master program definition. Stored in top-level `programs` collection. */
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  category: string;                 // Primary category: 'Physical' | 'Mind' | 'Social'
  duration_days: number;            // 21 or 30
  grace_days: number;               // 21->2, 30->3
  icon: string;                     // Ionicons name
  color: string;                    // Accent color for this program
  order: number;                    // Display order in catalog

  // Content for each mode
  cold_turkey_days: ProgramDay[];
  gradual_build_days: ProgramDay[];

  // Mode descriptions for UI
  cold_turkey_description: string;
  gradual_build_description: string;
  recommended_mode: ProgramMode;

  // Arena tagging (Phase 1) — the override-training domain this program trains
  arena_id?: ArenaId;

  // Completion reward
  completion_badge_name: string;
  completion_bonus_points: number;

  // Habit conversion suggestions
  suggested_habits: {
    name: string;
    category: string;
    target_count_per_week: number;
  }[];

  // Monetization readiness
  is_premium: boolean;

  assignable_by_coach: boolean;

  creator_id?: string;
  creator_name?: string;
  creator_credentials?: string;

  // Publishing
  status?: 'draft' | 'published' | 'archived'; // undefined = legacy system program (treated as published)

  // Metadata
  created_at: string;
  updated_at: string;
}

/** User's progress through a program. Stored in users/{userId}/programEnrollments/. */
export interface ProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;             // Denormalized for display
  mode: ProgramMode;
  status: ProgramStatus;

  // Timeline
  start_date: string;               // YYYY-MM-DD
  end_date: string;                 // YYYY-MM-DD
  duration_days: number;
  completed_at?: string;

  // Progress tracking
  milestones: ProgramMilestone[];

  // Grace days
  grace_days_allowed: number;
  grace_days_used: number;
  missed_days: number[];            // Array of day_numbers missed

  // Points
  total_points_earned: number;
  completion_bonus_earned?: number;

  // Habit conversion tracking
  habits_created_from_program?: string[];

  assigned_by?: string;
  assigned_at?: string;

  // Goal tagging
  goal_ids?: string[];

  // Arena tagging (Phase 1)
  arena_id?: ArenaId;

  // Metadata
  created_at: string;
}

/** Per-day tracking within a program enrollment. */
export interface ProgramMilestone {
  id: string;                       // 'day-{number}'
  day_number: number;
  completed: boolean;
  completed_at?: string;
  succeeded?: boolean;              // true = did challenge, false = missed/failed
  points_awarded?: number;          // 1-5 from effort rating
  note?: string;
  is_grace_day?: boolean;           // true if counted as a grace day
  educational_content_viewed?: boolean;
}

/** Earned on program completion. Stored in users/{userId}/programBadges/. */
export interface ProgramBadge {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  enrollment_id: string;
  badge_name: string;
  mode: ProgramMode;
  duration_days: number;
  days_succeeded: number;
  total_points_earned: number;
  earned_at: string;
}

// ============================================================================
// NIGHTLY REFLECTION
// ============================================================================

export type ReflectionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DailySummaryChallenge {
  name: string;
  difficulty?: number;
}

export interface DailySummaryHabit {
  name: string;
  target: number;
  done: number;
}

export interface DailySummaryComparisons {
  habits_more_vs_last_week?: number;
  challenges_more_vs_last_week?: number;
  habits_more_vs_last_month?: number;
  challenges_more_vs_last_month?: number;
  habits_more_vs_yesterday?: number;
  challenges_more_vs_yesterday?: number;
}

export interface DailySummary {
  // Today's override recap (the daily reflection's headline). Practices logged
  // today, how many hit their resistance moment and pushed through, and the
  // override tactics used today (ids from OVERRIDE_TACTICS, with counts).
  practices_today?: number;
  overrides_today?: number;
  tactics_today?: { id: string; count: number }[];
  // Progress-focused stats (new format)
  habits_this_week?: number;
  challenges_this_week?: number;
  total_xp?: number;
  total_habits_all_time?: number;
  total_challenges_all_time?: number;
  comparisons?: DailySummaryComparisons;
  // Legacy fields (kept for backward compat with old saved reflections)
  completed_challenges?: DailySummaryChallenge[];
  missed_challenges?: { name: string }[];
  completed_habits?: DailySummaryHabit[];
  missed_habits?: DailySummaryHabit[];
  optional_habits?: { name: string; remaining: number }[];
  program_status?: {
    name: string;
    checked_in: boolean;
    day_number?: number;
  };
}

export interface DailyReflection {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  grade: ReflectionGrade;
  prompt_went_well?: string;
  prompt_hardest?: string;
  prompt_tomorrow?: string;
  prompt_why_connection?: string;
  daily_summary: DailySummary;
  created_at: string;
}

export interface ReflectionStats {
  totalReflections: number;
  averageGrade: number; // 1-5 (F=1, D=2, C=3, B=4, A=5)
  averageGradeLetter: ReflectionGrade;
  currentStreak: number;
  longestStreak: number;
  gradeDistribution: Record<ReflectionGrade, number>;
}

export interface JournalSearchResult {
  id: string;
  source: 'reflection' | 'challenge';
  date: string;
  matchedText: string;
  matchedField: string;
  contextLabel: string;
  grade?: ReflectionGrade;
  difficulty?: number;
  status?: 'completed' | 'failed';
}

// ============================================================================
// WHY / PURPOSE DISCOVERY
// ============================================================================

export type WhyDiscoveryStatus = 'not_started' | 'in_progress' | 'completed';

export interface PeakMomentStory {
  id: string;
  prompt: string;           // The question that prompted this story
  response: string;         // User's written story
  created_at: string;       // ISO 8601
}

export interface WhyIteration {
  id: string;
  depth: number;            // 1-based (first why = 1, second = 2, etc.)
  question: string;         // The "why" prompt shown
  answer: string;           // User's response
}

export interface WhyTheme {
  id: string;
  text: string;             // The theme identified (e.g., "Connection", "Growth")
  confirmed: boolean;       // User confirmed this theme resonates
  source_story_ids: string[]; // Which stories this theme appeared in
}

export interface WhyProfile {
  id: string;
  user_id: string;
  status: WhyDiscoveryStatus;

  // Stage 1: Story Mining
  stories: PeakMomentStory[];

  // Stage 2: 5 Whys Drilling
  why_iterations: WhyIteration[];
  core_why_reached: boolean;

  // Stage 3: Theme Recognition
  themes: WhyTheme[];

  // Stage 4: Why Statement
  why_statement: string;
  contribution_part?: string;  // "To [this]..."
  impact_part?: string;        // "...so that [this]"

  // CBT / safety-net fields (Phase 2: migrated up from goals[0] to user level).
  // See docs/arenas-vs-goals-decision.md
  deeper_why?: string;
  confidence_baseline?: number;        // 1-10
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

  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
  last_reflected_at?: string;
  last_completed_stage: number; // 0=none, 1=stories, 2=whys, 3=themes, 4=statement
}

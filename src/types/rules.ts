/**
 * Rules engine types.
 *
 * A Rule is an admin-configurable document in the `rules/` Firestore collection
 * that controls WHEN a user-facing surface fires (push notification, in-app
 * modal, banner) and WHAT it says. Conditions are a small declarative DSL over
 * numeric "facts" — no code ships when a rule changes.
 *
 * NOTE: The pure evaluation logic lives in src/services/rulesEngine.ts and is
 * mirrored in functions/src/rulesEngine.ts (Cloud Functions is a separate
 * package). Keep the two evaluators in sync.
 */

/** Facts available to rule conditions. All values are numeric; booleans are 0/1. */
export const RULE_FACTS = {
  days_since_last_activity: 'Days since last activity',
  current_streak: 'Current streak (days)',
  total_willpower_points: 'Total XP',
  total_habits_completed: 'Habits completed (lifetime)',
  app_open_count: 'App opens (lifetime)',
  days_since_signup: 'Days since signup',
  active_goal_count: 'Active goals',
  local_hour: 'Hour of day in user timezone (0–23)',
} as const;

export type FactKey = keyof typeof RULE_FACTS;

export type RuleFacts = Partial<Record<FactKey, number>> & Record<string, number | undefined>;

export type RuleOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';

export const RULE_OPERATORS: RuleOperator[] = ['==', '!=', '>', '>=', '<', '<='];

export interface RuleCondition {
  fact: FactKey;
  op: RuleOperator;
  value: number;
}

export type RuleSurface = 'push' | 'modal' | 'banner';

/** Which evaluation point checks this rule. */
export type RuleEvent =
  | 'scheduled_hourly' // Cloud Function cron (push rules)
  | 'app_open' // HomeScreen mount (modal/banner rules)
  | 'habit_completed'
  | 'challenge_failed' // Cloud Function Firestore trigger (push rules)
  | 'reflection_saved'
  | 'team_activity' // Cloud Function Firestore trigger (push rules)
  | 'buddy_invite' // Cloud Function Firestore trigger (push rules)
  | 'buddy_nudge' // Cloud Function Firestore trigger (push rules)
  | 'buddy_both_complete' // Cloud Function Firestore trigger (push rules)
  | 'micro_commitment_followup'; // Cloud Function cron (push rules)

export const RULE_EVENTS: { value: RuleEvent; label: string }[] = [
  { value: 'scheduled_hourly', label: 'Hourly schedule' },
  { value: 'challenge_failed', label: 'Challenge failed' },
  { value: 'team_activity', label: 'Team member activity' },
  { value: 'buddy_invite', label: 'Buddy challenge invite' },
  { value: 'buddy_nudge', label: 'Buddy nudge sent' },
  { value: 'buddy_both_complete', label: 'Buddy challenge complete' },
  { value: 'micro_commitment_followup', label: 'Micro-commitment follow-up' },
  { value: 'app_open', label: 'App open' },
  { value: 'habit_completed', label: 'Habit completed' },
  { value: 'reflection_saved', label: 'Reflection saved' },
];

/**
 * Events the server-side Cloud Functions evaluate for push rules. The
 * remaining events (app_open, habit_completed, reflection_saved) are client
 * evaluation points planned for the modal/banner phase.
 */
export const PUSH_EVENTS: RuleEvent[] = [
  'scheduled_hourly',
  'challenge_failed',
  'team_activity',
  'buddy_invite',
  'buddy_nudge',
  'buddy_both_complete',
  'micro_commitment_followup',
];

/**
 * {placeholder} variables each event supplies to the rule's content template.
 * Unknown placeholders are left literal at render time.
 */
export const EVENT_PLACEHOLDERS: Partial<Record<RuleEvent, string[]>> = {
  challenge_failed: ['challenge_name'],
  team_activity: ['username', 'activity_type'],
  buddy_invite: ['inviter_username', 'challenge_name'],
  buddy_nudge: ['sender_username'],
  buddy_both_complete: ['challenge_name'],
  micro_commitment_followup: ['commitment'],
};

export type RuleFrequencyType = 'once_ever' | 'once_per_day' | 'cooldown_hours' | 'always';

export interface RuleFrequency {
  type: RuleFrequencyType;
  /** Only used when type === 'cooldown_hours'. */
  hours?: number;
}

/**
 * Where a rule's CTA leads: a curated in-app screen or an external URL.
 * Applies to the modal CTA button and to tapping a push notification.
 */
export interface RuleCtaTarget {
  type: 'screen' | 'url';
  /** A value from CTA_SCREEN_TARGETS (when type === 'screen'). */
  screen?: string;
  /** Full http(s) URL (when type === 'url'). */
  url?: string;
}

/**
 * Curated, param-less destinations the admin UI can point a CTA at.
 * Curated so a rule can never reference a screen that needs params or
 * doesn't exist. 'Progress' and 'Tools' are tabs; the rest are Home-stack
 * screens.
 */
export const CTA_SCREEN_TARGETS: { value: string; label: string }[] = [
  { value: 'StartChallenge', label: 'Start a challenge' },
  { value: 'GoalCreationFlow', label: 'Create a goal' },
  { value: 'ManageHabits', label: 'Manage habits' },
  { value: 'NightlyReflection', label: 'Nightly reflection' },
  { value: 'WeeklyPlanner', label: 'Weekly planner' },
  { value: 'ProgramDiscovery', label: 'Programs' },
  { value: 'Progress', label: 'Progress tab' },
  { value: 'Tools', label: 'Tools tab' },
];

/** Tab-level targets that need parent-navigator handling. */
export const CTA_TAB_TARGETS = ['Progress', 'Tools'];

export interface RuleContent {
  title: string;
  body: string;
  /** Optional CTA label for in-app surfaces. */
  cta?: string;
  /** Optional destination for the modal CTA / push notification tap. */
  cta_target?: RuleCtaTarget;
}

export interface Rule {
  id: string;
  /** Admin-facing label, e.g. "Comeback nudge". */
  name: string;
  description?: string;
  enabled: boolean;
  surface: RuleSurface;
  event: RuleEvent;
  /** ANDed together. An empty list always matches — rely on frequency caps. */
  conditions: RuleCondition[];
  frequency: RuleFrequency;
  /** Higher fires first when multiple rules match the same event. */
  priority: number;
  content: RuleContent;
  created_at: string;
  updated_at: string;
}

/** Per-user firing record at users/{uid}/ruleState/{ruleId}. */
export interface RuleState {
  rule_id: string;
  /** ISO timestamp of the last fire. */
  last_fired_at: string;
  /** YYYY-MM-DD in the user's timezone at the last fire. */
  last_fired_date: string;
  fire_count: number;
}

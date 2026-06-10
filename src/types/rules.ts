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
  | 'challenge_failed'
  | 'reflection_saved';

export const RULE_EVENTS: { value: RuleEvent; label: string }[] = [
  { value: 'scheduled_hourly', label: 'Hourly schedule (push)' },
  { value: 'app_open', label: 'App open' },
  { value: 'habit_completed', label: 'Habit completed' },
  { value: 'challenge_failed', label: 'Challenge failed' },
  { value: 'reflection_saved', label: 'Reflection saved' },
];

export type RuleFrequencyType = 'once_ever' | 'once_per_day' | 'cooldown_hours' | 'always';

export interface RuleFrequency {
  type: RuleFrequencyType;
  /** Only used when type === 'cooldown_hours'. */
  hours?: number;
}

export interface RuleContent {
  title: string;
  body: string;
  /** Optional CTA label for in-app surfaces. */
  cta?: string;
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

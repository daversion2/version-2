/**
 * Rules engine — types and pure evaluation logic for Cloud Functions.
 *
 * KEEP IN SYNC with the app-side copies:
 *   src/types/rules.ts (types) and src/services/rulesEngine.ts (evaluator).
 * Cloud Functions is a separate package, so this file is intentionally
 * self-contained.
 */

export type RuleOperator = "==" | "!=" | ">" | ">=" | "<" | "<=";

export interface RuleCondition {
  fact: string;
  op: RuleOperator;
  value: number;
}

export type RuleSurface = "push" | "modal" | "banner";

export type RuleEvent =
  | "scheduled_hourly"
  | "app_open"
  | "habit_completed"
  | "challenge_failed"
  | "reflection_saved";

export type RuleFrequencyType = "once_ever" | "once_per_day" | "cooldown_hours" | "always";

export interface RuleFrequency {
  type: RuleFrequencyType;
  hours?: number;
}

export interface RuleContent {
  title: string;
  body: string;
  cta?: string;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  surface: RuleSurface;
  event: RuleEvent;
  conditions: RuleCondition[];
  frequency: RuleFrequency;
  priority: number;
  content: RuleContent;
  created_at: string;
  updated_at: string;
}

export interface RuleState {
  rule_id: string;
  last_fired_at: string;
  last_fired_date: string;
  fire_count: number;
}

export type RuleFacts = Record<string, number | undefined>;

export const conditionMet = (cond: RuleCondition, facts: RuleFacts): boolean => {
  const actual = facts[cond.fact];
  if (actual === undefined || actual === null || Number.isNaN(actual)) return false;
  switch (cond.op) {
    case "==":
      return actual === cond.value;
    case "!=":
      return actual !== cond.value;
    case ">":
      return actual > cond.value;
    case ">=":
      return actual >= cond.value;
    case "<":
      return actual < cond.value;
    case "<=":
      return actual <= cond.value;
    default:
      return false;
  }
};

/** All conditions ANDed; an empty condition list matches. */
export const ruleMatches = (rule: Rule, facts: RuleFacts): boolean =>
  rule.enabled && rule.conditions.every((c) => conditionMet(c, facts));

export const frequencyAllows = (
  rule: Rule,
  state: RuleState | null,
  nowIso: string,
  todayLocal: string
): boolean => {
  if (!state || !state.last_fired_at) return true;
  switch (rule.frequency.type) {
    case "always":
      return true;
    case "once_ever":
      return false;
    case "once_per_day":
      return state.last_fired_date !== todayLocal;
    case "cooldown_hours": {
      const hours = rule.frequency.hours ?? 24;
      const elapsedHours =
        (Date.parse(nowIso) - Date.parse(state.last_fired_at)) / (1000 * 60 * 60);
      return elapsedHours >= hours;
    }
    default:
      return false;
  }
};

/** Days between two YYYY-MM-DD dates (today - past). */
export const daysBetween = (todayLocal: string, pastDate: string): number => {
  const today = Date.parse(todayLocal + "T00:00:00Z");
  const past = Date.parse(pastDate + "T00:00:00Z");
  if (Number.isNaN(today) || Number.isNaN(past)) return 0;
  return Math.round((today - past) / (1000 * 60 * 60 * 24));
};

/** Compute rule facts from a raw user document. */
export const buildUserFacts = (
  userData: Record<string, any>,
  todayLocal: string,
  localHour: number,
  extras?: RuleFacts
): RuleFacts => {
  // Fall back to signup date so brand-new users aren't treated as long-dormant
  const lastActivity: string | null =
    userData.lastActivityDate ||
    (userData.created_at ? String(userData.created_at).slice(0, 10) : null);
  const signupDate: string | null = userData.created_at
    ? String(userData.created_at).slice(0, 10)
    : null;

  return {
    days_since_last_activity: lastActivity ? daysBetween(todayLocal, lastActivity) : 0,
    current_streak: userData.currentStreak || 0,
    total_willpower_points: userData.totalWillpowerPoints || 0,
    total_habits_completed: userData.totalHabitsCompleted || 0,
    app_open_count: userData.app_open_count || 0,
    days_since_signup: signupDate ? daysBetween(todayLocal, signupDate) : 0,
    active_goal_count: 0,
    local_hour: localHour,
    ...extras,
  };
};

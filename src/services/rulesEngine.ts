/**
 * Pure rule evaluation logic — no Firebase imports, fully unit-testable.
 *
 * KEEP IN SYNC with functions/src/rulesEngine.ts (Cloud Functions is a
 * separate package, so the evaluator is duplicated there).
 */
import { Rule, RuleCondition, RuleFacts, RuleState } from '../types/rules';

export const conditionMet = (cond: RuleCondition, facts: RuleFacts): boolean => {
  const actual = facts[cond.fact];
  if (actual === undefined || actual === null || Number.isNaN(actual)) return false;
  switch (cond.op) {
    case '==':
      return actual === cond.value;
    case '!=':
      return actual !== cond.value;
    case '>':
      return actual > cond.value;
    case '>=':
      return actual >= cond.value;
    case '<':
      return actual < cond.value;
    case '<=':
      return actual <= cond.value;
    default:
      return false;
  }
};

/** All conditions ANDed; an empty condition list matches. */
export const ruleMatches = (rule: Rule, facts: RuleFacts): boolean =>
  rule.enabled && rule.conditions.every((c) => conditionMet(c, facts));

/**
 * Whether the rule's frequency cap allows firing again for a user.
 * @param state    The user's RuleState for this rule, or null if never fired.
 * @param nowIso   Current time as ISO string.
 * @param todayLocal Today's date (YYYY-MM-DD) in the user's timezone.
 */
export const frequencyAllows = (
  rule: Rule,
  state: RuleState | null,
  nowIso: string,
  todayLocal: string
): boolean => {
  if (!state || !state.last_fired_at) return true;
  switch (rule.frequency.type) {
    case 'always':
      return true;
    case 'once_ever':
      return false;
    case 'once_per_day':
      return state.last_fired_date !== todayLocal;
    case 'cooldown_hours': {
      const hours = rule.frequency.hours ?? 24;
      const elapsedHours = (Date.parse(nowIso) - Date.parse(state.last_fired_at)) / (1000 * 60 * 60);
      return elapsedHours >= hours;
    }
    default:
      return false;
  }
};

/** Days between two YYYY-MM-DD dates (today - past). Negative if past is in the future. */
export const daysBetween = (todayLocal: string, pastDate: string): number => {
  const today = Date.parse(todayLocal + 'T00:00:00Z');
  const past = Date.parse(pastDate + 'T00:00:00Z');
  if (Number.isNaN(today) || Number.isNaN(past)) return 0;
  return Math.round((today - past) / (1000 * 60 * 60 * 24));
};

/**
 * Compute rule facts from a user document. Works with both the app's User
 * shape and the raw Firestore data in Cloud Functions.
 * @param todayLocal Today's date (YYYY-MM-DD) in the user's timezone.
 * @param localHour  Current hour (0–23) in the user's timezone.
 */
export const buildUserFacts = (
  userData: Record<string, any>,
  todayLocal: string,
  localHour: number,
  extras?: RuleFacts
): RuleFacts => {
  // Fall back to signup date so brand-new users aren't treated as long-dormant
  const lastActivity: string | null =
    userData.lastActivityDate || (userData.created_at ? String(userData.created_at).slice(0, 10) : null);
  const signupDate: string | null = userData.created_at ? String(userData.created_at).slice(0, 10) : null;

  return {
    days_since_last_activity: lastActivity ? daysBetween(todayLocal, lastActivity) : 0,
    current_streak: userData.currentStreak || 0,
    total_willpower_points: userData.totalWillpowerPoints || 0,
    total_habits_completed: userData.totalHabitsCompleted || 0,
    app_open_count: userData.app_open_count || 0,
    days_since_signup: signupDate ? daysBetween(todayLocal, signupDate) : 0,
    active_goal_count: 0, // requires a subcollection read; supplied via extras when needed
    local_hour: localHour,
    ...extras,
  };
};

/**
 * Filter and order the rules that should fire: enabled, conditions met,
 * frequency cap allows. Highest priority first.
 */
export const selectFiringRules = (
  rules: Rule[],
  facts: RuleFacts,
  getState: (ruleId: string) => RuleState | null,
  nowIso: string,
  todayLocal: string
): Rule[] =>
  rules
    .filter((rule) => ruleMatches(rule, facts))
    .filter((rule) => frequencyAllows(rule, getState(rule.id), nowIso, todayLocal))
    .sort((a, b) => b.priority - a.priority);

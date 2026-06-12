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

/**
 * Render {placeholder} tokens in rule content using event-supplied variables
 * (e.g. {username}, {challenge_name}). Unknown placeholders are left literal
 * so a typo in the admin UI is visible rather than silently blanked.
 */
export const renderTemplate = (text: string, vars: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match));

/**
 * Global placeholders, available on every rule regardless of event. The
 * first group resolves from the user document; the POOL keys resolve from a
 * random pick out of a content collection. Policy: if a referenced global
 * can't be resolved for a user, the rule does NOT fire for them at all.
 */
export const GLOBAL_PLACEHOLDER_KEYS = [
  'username',
  'why_statement',
  'mantra',
  'streak',
  'xp',
  'tidbit',
  'fun_fact',
  'reward_message',
  'proof_point',
];

/** The subset of globals drawn randomly from a content pool. */
export const POOL_PLACEHOLDER_KEYS = ['tidbit', 'fun_fact', 'reward_message', 'proof_point'];

/** Which global placeholders a rule's content actually references. */
export const referencedGlobalKeys = (content: { title: string; body: string }): string[] => {
  const text = `${content.title} ${content.body}`;
  return GLOBAL_PLACEHOLDER_KEYS.filter((k) => text.includes(`{${k}}`));
};

/** Keep pool content short enough for a push notification body. */
export const truncateForPush = (text: string, max = 120): string =>
  text.length > max ? text.substring(0, max - 3) + '...' : text;

/**
 * Resolve user-document globals (not pool keys — the caller handles those,
 * since pools need a Firestore fetch). Empty/absent values land in `missing`.
 */
export const resolveUserGlobals = (
  keys: string[],
  userData: Record<string, any>
): { vars: Record<string, string>; missing: string[] } => {
  const vars: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of keys) {
    let value: string | null = null;
    switch (key) {
      case 'username':
        value = userData.username || null;
        break;
      case 'why_statement':
        value = userData.why_statement || null;
        break;
      case 'mantra': {
        // Mirrors getActiveMantraText: active mantra, else first, else legacy field
        const mantras = userData.mantras;
        if (Array.isArray(mantras) && mantras.length > 0) {
          const active = userData.active_mantra_id
            ? mantras.find((m: any) => m && m.id === userData.active_mantra_id)
            : null;
          value = (active && active.text) || mantras[0]?.text || null;
        } else {
          value = userData.redirect_mantra || null;
        }
        break;
      }
      case 'streak':
        value = String(userData.currentStreak ?? 0);
        break;
      case 'xp':
        value = String(userData.totalWillpowerPoints ?? 0);
        break;
      default:
        continue; // pool keys resolved by the caller
    }
    if (value === null || String(value).trim() === '') missing.push(key);
    else vars[key] = String(value);
  }
  return { vars, missing };
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

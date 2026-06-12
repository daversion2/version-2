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
  | "reflection_saved"
  | "team_activity"
  | "buddy_invite"
  | "buddy_nudge"
  | "buddy_both_complete"
  | "micro_commitment_followup";

export type RuleFrequencyType = "once_ever" | "once_per_day" | "cooldown_hours" | "always";

export interface RuleFrequency {
  type: RuleFrequencyType;
  hours?: number;
}

export interface RuleCtaTarget {
  type: "screen" | "url";
  screen?: string;
  url?: string;
}

export interface RuleContent {
  title: string;
  body: string;
  cta?: string;
  cta_target?: RuleCtaTarget;
}

/**
 * Push data payload entries for a rule's CTA target. The client's
 * notification-tap handler navigates to `cta_screen` or opens `cta_url`.
 */
export const ctaTargetData = (rule: Rule): Record<string, string> => {
  const target = rule.content?.cta_target;
  if (!target) return {};
  if (target.type === "url" && target.url) return { cta_url: target.url };
  if (target.type === "screen" && target.screen) return { cta_screen: target.screen };
  return {};
};

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
  "username",
  "why_statement",
  "mantra",
  "streak",
  "xp",
  "tidbit",
  "fun_fact",
  "reward_message",
  "proof_point",
];

/** The subset of globals drawn randomly from a content pool. */
export const POOL_PLACEHOLDER_KEYS = ["tidbit", "fun_fact", "reward_message", "proof_point"];

/** Which global placeholders a rule's content actually references. */
export const referencedGlobalKeys = (content: { title: string; body: string }): string[] => {
  const text = `${content.title} ${content.body}`;
  return GLOBAL_PLACEHOLDER_KEYS.filter((k) => text.includes(`{${k}}`));
};

/** Keep pool content short enough for a push notification body. */
export const truncateForPush = (text: string, max = 120): string =>
  text.length > max ? text.substring(0, max - 3) + "..." : text;

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
      case "username":
        value = userData.username || null;
        break;
      case "why_statement":
        value = userData.why_statement || null;
        break;
      case "mantra": {
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
      case "streak":
        value = String(userData.currentStreak ?? 0);
        break;
      case "xp":
        value = String(userData.totalWillpowerPoints ?? 0);
        break;
      default:
        continue; // pool keys resolved by the caller
    }
    if (value === null || String(value).trim() === "") missing.push(key);
    else vars[key] = String(value);
  }
  return { vars, missing };
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

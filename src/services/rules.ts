/**
 * Firestore service for the configurable rules engine.
 *
 * Rules live in the root `rules/` collection (admin-writable, readable by all
 * authenticated users). Per-user firing history lives at
 * users/{uid}/ruleState/{ruleId} and powers frequency capping.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Rule, RuleEvent, RuleFacts, RuleState } from '../types/rules';
import { frequencyAllows, ruleMatches } from './rulesEngine';

const rulesCollection = () => collection(db, 'rules');

const docToRule = (id: string, data: Record<string, any>): Rule => ({
  id,
  name: data.name || '',
  description: data.description || '',
  enabled: data.enabled === true,
  surface: data.surface || 'modal',
  event: data.event || 'app_open',
  conditions: Array.isArray(data.conditions) ? data.conditions : [],
  frequency: data.frequency || { type: 'once_ever' },
  priority: typeof data.priority === 'number' ? data.priority : 0,
  content: data.content || { title: '', body: '' },
  created_at: data.created_at || '',
  updated_at: data.updated_at || '',
});

// ---------- Admin CRUD ----------

export const getAllRules = async (): Promise<Rule[]> => {
  const snap = await getDocs(rulesCollection());
  return snap.docs
    .map((d) => docToRule(d.id, d.data()))
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
};

export const getRuleById = async (ruleId: string): Promise<Rule | null> => {
  const snap = await getDoc(doc(db, 'rules', ruleId));
  return snap.exists() ? docToRule(snap.id, snap.data()) : null;
};

export const createRule = async (
  rule: Omit<Rule, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const now = new Date().toISOString();
  const ref = await addDoc(rulesCollection(), { ...rule, created_at: now, updated_at: now });
  return ref.id;
};

export const updateRule = async (
  ruleId: string,
  updates: Partial<Omit<Rule, 'id' | 'created_at'>>
): Promise<void> => {
  await updateDoc(doc(db, 'rules', ruleId), {
    ...updates,
    updated_at: new Date().toISOString(),
  });
};

export const deleteRule = async (ruleId: string): Promise<void> => {
  await deleteDoc(doc(db, 'rules', ruleId));
};

// ---------- Evaluation (client surfaces: modals/banners) ----------

export const getEnabledRulesForEvent = async (event: RuleEvent): Promise<Rule[]> => {
  const snap = await getDocs(query(rulesCollection(), where('enabled', '==', true)));
  return snap.docs
    .map((d) => docToRule(d.id, d.data()))
    .filter((r) => r.event === event);
};

export const getRuleState = async (userId: string, ruleId: string): Promise<RuleState | null> => {
  const snap = await getDoc(doc(db, 'users', userId, 'ruleState', ruleId));
  return snap.exists() ? (snap.data() as RuleState) : null;
};

export const recordRuleFired = async (
  userId: string,
  ruleId: string,
  todayLocal: string
): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId, 'ruleState', ruleId),
    {
      rule_id: ruleId,
      last_fired_at: new Date().toISOString(),
      last_fired_date: todayLocal,
      fire_count: increment(1),
    },
    { merge: true }
  );
};

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

/**
 * Returns the rules that should surface for this user/event right now,
 * highest priority first. Does NOT record a fire — call recordRuleFired()
 * after the surface is actually shown.
 */
export const evaluateRulesForUser = async (
  userId: string,
  event: RuleEvent,
  facts: RuleFacts
): Promise<Rule[]> => {
  const rules = await getEnabledRulesForEvent(event);
  const matching = rules.filter((r) => ruleMatches(r, facts));
  if (matching.length === 0) return [];

  const nowIso = new Date().toISOString();
  const today = localToday();
  const allowed: Rule[] = [];
  for (const rule of matching) {
    const state = await getRuleState(userId, rule.id);
    if (frequencyAllows(rule, state, nowIso, today)) allowed.push(rule);
  }
  return allowed.sort((a, b) => b.priority - a.priority);
};

/** Convenience: record that a rule surfaced for the current user today. */
export const markRuleShown = async (userId: string, ruleId: string): Promise<void> =>
  recordRuleFired(userId, ruleId, localToday());

// ---------- Defaults ----------

/**
 * Default rules, seeded from the Admin Rules screen.
 *
 * The Comeback nudge is seeded disabled. The event-triggered rules below it
 * replaced the legacy hardcoded notification functions, so they're seeded
 * ENABLED with the original copy — the Cloud Function evaluation points also
 * auto-seed them (matched by name) the first time their event fires with no
 * rule present. KEEP IN SYNC with DEFAULT_EVENT_RULES in
 * functions/src/index.ts.
 */
export const DEFAULT_RULES: Omit<Rule, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Comeback check-in',
    description:
      'Streak-break check-in on app open. Opens the bespoke comeback flow (barrier → recommit) ' +
      '— or the story reminder if the user has proof points. Title/body are the first step; ' +
      'the later steps are fixed. Replaced the hardcoded HomeScreen trigger.',
    enabled: true,
    surface: 'modal',
    event: 'app_open',
    conditions: [
      { fact: 'current_streak', op: '==', value: 0 },
      { fact: 'active_habit_count', op: '>=', value: 1 },
      // A zero streak alone also matches brand-new users who just finished
      // onboarding; require a real absence so this only fires for lapses.
      { fact: 'days_since_last_activity', op: '>=', value: 2 },
    ],
    frequency: { type: 'once_per_day' },
    // Above generic app_open modals: a broken streak beats announcements.
    priority: 50,
    content: {
      title: 'Welcome Back',
      body: "You've been away for a couple days. That's okay — life happens. Let's figure out what's next.",
      component: 'comeback',
    },
  },
  {
    name: 'Comeback nudge',
    description: 'Re-engage users who have been inactive for a couple of days.',
    enabled: false,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_last_activity', op: '>=', value: 2 },
      { fact: 'local_hour', op: '==', value: 18 },
    ],
    frequency: { type: 'cooldown_hours', hours: 72 },
    priority: 10,
    content: {
      title: 'We miss you',
      body: "It's been a couple of days. One small win today gets you moving again.",
    },
  },
  {
    name: 'Challenge failed encouragement',
    description: "Immediate encouragement when a user's challenge is marked failed.",
    enabled: true,
    surface: 'push',
    event: 'challenge_failed',
    conditions: [],
    frequency: { type: 'always' },
    priority: 20,
    content: {
      title: 'Growth Through Effort',
      body: 'Failure is part of the journey. The fact that you tried is what matters most. Every attempt builds your willpower.',
    },
  },
  {
    name: 'Micro-commitment follow-up',
    description:
      "Day-after check-in on a micro-exercise commitment. The 'Hour of day' condition sets the local send hour. Placeholders: {commitment}.",
    enabled: true,
    surface: 'push',
    event: 'micro_commitment_followup',
    conditions: [{ fact: 'local_hour', op: '==', value: 10 }],
    frequency: { type: 'always' },
    priority: 20,
    content: {
      title: 'How did your commitment go?',
      body: 'Yesterday you said: "{commitment}"',
    },
  },

  // ---------------------------------------------------------------------
  // First-30-days journey (docs: 30-day user journey). Day-based rules use
  // days_since_signup so they only ever reach users inside the window —
  // existing accounts are past it and never see them. Edit copy/timing here
  // in Admin > Rules; the schedule is: day 0 evening rescue → day 3 goal →
  // weekly recaps (7/21) → check-in prompts (14/28) → day 30 send-off, plus
  // a morning-after miss nudge throughout month one.
  // ---------------------------------------------------------------------
  {
    name: 'Journey day 0: first rep tonight',
    description:
      'Signup-day evening rescue for users who have not logged their first rep. Skipped automatically once they train.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 0 },
      { fact: 'local_hour', op: '==', value: 20 },
      { fact: 'completed_today', op: '==', value: 0 },
    ],
    frequency: { type: 'once_ever' },
    priority: 30,
    content: {
      title: 'One rep before bed still counts',
      body: "You picked your starting point today. Your brain will say tomorrow. That's the moment — go do the thing.",
    },
  },
  {
    name: 'Journey day 3: set a weekly goal',
    description:
      'In-app prompt to set a weekly target on their practice, a few days in. Window capped at day 10 so existing users never see it.',
    enabled: true,
    surface: 'modal',
    event: 'app_open',
    conditions: [
      { fact: 'days_since_signup', op: '>=', value: 3 },
      { fact: 'days_since_signup', op: '<=', value: 10 },
      { fact: 'active_habit_count', op: '>=', value: 1 },
    ],
    frequency: { type: 'once_ever' },
    priority: 30,
    content: {
      title: 'Make it a target',
      body: "You've been showing up. Lock it in — decide how many times this week you'll train, and hold yourself to it.",
      cta: 'Set a weekly goal',
      cta_target: { type: 'screen', screen: 'ManageHabits' },
    },
  },
  {
    name: 'Journey day 7: week one recap',
    description:
      'End-of-week-one proof push. Placeholders: {habits_completed}, {practices_tried}. Taps through to the Progress tab.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 7 },
      { fact: 'local_hour', op: '==', value: 18 },
      { fact: 'total_habits_completed', op: '>=', value: 1 },
    ],
    frequency: { type: 'once_ever' },
    priority: 25,
    content: {
      title: 'Week one: {habits_completed} overrides logged',
      body: "That's {habits_completed} times your brain said stop and you didn't. You've tried {practices_tried} practices so far — pick one you haven't this week.",
      cta_target: { type: 'screen', screen: 'Progress' },
    },
  },
  {
    name: 'Journey day 14: two-week check-in',
    description:
      'Midpoint of the research window (2–4 weeks). Taps through to the check-in screen — same 3 questions as the onboarding baseline.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 14 },
      { fact: 'local_hour', op: '==', value: 18 },
    ],
    frequency: { type: 'once_ever' },
    priority: 25,
    content: {
      title: 'Two weeks in. Notice anything?',
      body: 'Same three questions as day one — mood, focus, motivation. Ten seconds, then see them side by side.',
      cta_target: { type: 'screen', screen: 'JourneyCheckin' },
    },
  },
  {
    name: 'Journey day 17: from the research',
    description:
      'Week-3 value-give — a neuroscience tidbit, no ask. Placeholder: {tidbit} (needs at least one active tidbit in the pool).',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 17 },
      { fact: 'local_hour', op: '==', value: 12 },
    ],
    frequency: { type: 'once_ever' },
    priority: 15,
    content: {
      title: 'From the research',
      body: '{tidbit}',
    },
  },
  {
    name: 'Journey day 21: week three recap',
    description:
      'Volume + variety recap. Placeholders: {habits_completed}, {practices_tried}.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 21 },
      { fact: 'local_hour', op: '==', value: 18 },
      { fact: 'total_habits_completed', op: '>=', value: 1 },
    ],
    frequency: { type: 'once_ever' },
    priority: 25,
    content: {
      title: 'Three weeks. {habits_completed} overrides.',
      body: "You've tried {practices_tried} practices. The ones you're avoiding are the ones with the most to teach.",
      cta_target: { type: 'screen', screen: 'Progress' },
    },
  },
  {
    name: 'Journey day 28: the science said 2–4 weeks',
    description:
      'Pays off the onboarding promise (screen 7: improvements within 2–4 weeks). Taps through to the check-in screen for the final retake.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_signup', op: '==', value: 28 },
      { fact: 'local_hour', op: '==', value: 18 },
    ],
    frequency: { type: 'once_ever' },
    priority: 25,
    content: {
      title: 'The science said two to four weeks.',
      body: "You're there. Retake your day-one baseline — mood, focus, motivation — and see the data for yourself.",
      cta_target: { type: 'screen', screen: 'JourneyCheckin' },
    },
  },
  {
    name: 'Journey day 30: month one complete',
    description:
      'In-app month-one recap. Fires on the first app open between day 30 and 37, once. Placeholders: {habits_completed}, {practices_tried}, {xp}.',
    enabled: true,
    surface: 'modal',
    event: 'app_open',
    conditions: [
      { fact: 'days_since_signup', op: '>=', value: 30 },
      { fact: 'days_since_signup', op: '<=', value: 37 },
      { fact: 'total_habits_completed', op: '>=', value: 1 },
    ],
    frequency: { type: 'once_ever' },
    priority: 40,
    content: {
      title: 'Month one complete',
      body: '{habits_completed} overrides. {practices_tried} practices tried. {xp} XP earned. What you built this month is your baseline now — set the next target.',
      cta: 'See your training volume',
      cta_target: { type: 'screen', screen: 'Progress' },
    },
  },
  {
    name: 'Journey: missed a day, minimum version',
    description:
      'Morning-after nudge when exactly one day was missed during month one. The comeback flow owns 2+ day gaps.',
    enabled: true,
    surface: 'push',
    event: 'scheduled_hourly',
    conditions: [
      { fact: 'days_since_last_activity', op: '==', value: 1 },
      { fact: 'local_hour', op: '==', value: 9 },
      { fact: 'days_since_signup', op: '<=', value: 30 },
      { fact: 'days_since_signup', op: '>=', value: 1 },
    ],
    frequency: { type: 'cooldown_hours', hours: 72 },
    priority: 20,
    content: {
      title: "Yesterday didn't happen. Fine.",
      body: "Today's rep can be the two-minute version. Volume beats perfection — one small override keeps the protocol alive.",
    },
  },
];

export const seedDefaultRules = async (): Promise<number> => {
  const existing = await getAllRules();
  const existingNames = new Set(existing.map((r) => r.name));
  let created = 0;
  for (const rule of DEFAULT_RULES) {
    if (existingNames.has(rule.name)) continue;
    await createRule(rule);
    created++;
  }
  return created;
};

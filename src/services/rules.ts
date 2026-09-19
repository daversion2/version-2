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
 * KEEP IN SYNC with DEFAULT_EVENT_RULES in functions/src/index.ts, which
 * auto-seeds an event's rule (matched by name) the first time that event fires
 * with no rule document present at all.
 *
 * ---------------------------------------------------------------------------
 * EDITING enabled HERE DOES NOT CHANGE PRODUCTION. seedDefaultRules skips any
 * rule whose `name` already exists, so these values only ever apply to a fresh
 * seed. Turning a live rule off is done in Admin > Rules, against the Firestore
 * document. The flags below are kept truthful anyway so a new environment comes
 * up matching production rather than resurrecting a parked message.
 * ---------------------------------------------------------------------------
 *
 * The enabled set is deliberately small — see PUSH_BUDGET in rulesEngine.ts.
 * Every push here is a response to something the user did or didn't do; a rule
 * that fires purely because a date arrived has to earn a slot against one that
 * does. Parked rules keep their content and cta_target so re-enabling is a
 * one-switch decision, and so ruleCtaTargets.test.ts keeps guarding their
 * destinations against screen renames.
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
    name: 'Push opt-in ask',
    description:
      'The only place the app asks for notification permission. Fires on app open once the ' +
      'user has logged at least one rep — deliberately NOT during onboarding: iOS grants one ' +
      'permission prompt per install, and spending it before the app has done anything for ' +
      'them is how you get a permanent no. Conditioned on has_push_token == 0 so it never ' +
      'asks someone who already said yes (or who turned it off in Settings and then back on). ' +
      'Opens the bespoke PushOptInModal, which states the 3/week ceiling and only then triggers ' +
      'the OS prompt. once_ever: declining is an answer, and Settings owns the switch after that.',
    enabled: true,
    surface: 'modal',
    event: 'app_open',
    conditions: [
      { fact: 'total_habits_completed', op: '>=', value: 1 },
      { fact: 'has_push_token', op: '==', value: 0 },
    ],
    frequency: { type: 'once_ever' },
    // Below the comeback check-in (50) — a broken streak is the more urgent
    // conversation — but above the day-30 recap (40), because every push rule in
    // the system is dead weight until this one succeeds.
    priority: 45,
    content: {
      title: 'Want a nudge when it matters?',
      body: "You've logged your first rep. A reminder on the days you said you'd train makes the second one easier — and we'll keep it to three a week, at most.",
      cta: 'Turn them on',
      component: 'push_optin',
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
    description:
      'PARKED 2026-09-18 (enabled: false). This fired seconds after the user marked a ' +
      'challenge failed — while they were still inside CompleteChallengeScreen, which ' +
      'already walks them through a reward moment and then ChallengeFailureModal ' +
      '(barrier → next action). The push was a notification about a screen the user was ' +
      'looking at. The in-app flow is the better version of this message and already ships. ' +
      'ALSO REMOVED from DEFAULT_EVENT_RULES in functions/src/index.ts: getPushRuleForEvent ' +
      'auto-seeds a default ENABLED when no document exists for an event, so deleting this ' +
      'rule would have resurrected it on the next failure. Disabled + no default = actually off.',
    enabled: false,
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
  // existing accounts are past it and never see them. Edit copy/timing in
  // Admin > Rules.
  //
  // TRIMMED 2026-09-18 from six push messages to three. The original schedule
  // (day 0 → 7 → 14 → 17 → 21 → 28 → 30) was a broadcast drip: it fired
  // because a date arrived, not because the user did anything. Under a 3/week
  // ceiling those slots have to be earned, and the missed-a-day nudge earns
  // one every time it fires. What survives:
  //
  //   day 0   evening rescue — signed up, hasn't logged. Highest-value
  //           message in the set; the only one that catches the drop-off
  //           that actually kills retention.
  //   day 7   week-one recap — first real proof, and the first point at
  //           which {habits_completed} says something worth reading.
  //   day 28  check-in retake — pays off the explicit 2–4 week promise
  //           onboarding made. The one date-triggered message the app owes.
  //   day 30  month-one recap (MODAL, not push — costs no budget).
  //   any day missed-a-day nudge, behaviour-triggered, month one only.
  //
  // Parked: 14 (asks for the same check-in day 28 pays off), 17 (a tidbit
  // with no ask — tidbits already surface in-app after every completion via
  // selectHabitTidbit), 21 (the day-7 recap again, three weeks later).
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
    // NAME IS FROZEN. seedDefaultRules matches on `name` and skips rules that
    // already exist, so renaming this would leave the original live in
    // Firestore and seed a SECOND day-3 rule beside it — two modals, same day.
    // The name reads oddly now (the goal is set during onboarding, not here);
    // that is the cost of not duplicating it.
    name: 'Journey day 3: set a weekly goal',
    description:
      'PARKED 2026-09-06 (enabled: false). Onboarding now sets a schedule at adoption, so a day-3 prompt to set a weekly target asks for something already done. Kept rather than deleted — day 3 is the most valuable slot in the journey sequence and deserves a message that is actually true. Content and cta_target were cleaned up first so re-enabling is a one-switch decision.',
    // Parked, not deleted. The live doc was disabled to match by
    // scripts/fixJourneyDay3Rule.js — seedDefaultRules could not reach it,
    // since it skips rules whose name already exists.
    enabled: false,
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
      title: 'Three days in',
      body: "The schedule you set when you started is a promise, not a score to hit — falling short of it still counts as showing up. Open any habit to change what you committed to.",
      cta: 'Got it',
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
      'PARKED 2026-09-18 (enabled: false). Asked for the same mood/focus/motivation retake ' +
      'that day 28 asks for, two weeks earlier — and day 28 is the one that pays off the ' +
      'promise onboarding actually made ("improvements within 2–4 weeks"). Prompting twice ' +
      'inside one research window made the second ask the boring one. Re-enable only if the ' +
      'check-in screen gains a reason to be visited mid-window.',
    enabled: false,
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
      'PARKED 2026-09-18 (enabled: false). A tidbit with no ask is pleasant but it is not a ' +
      'reason to interrupt someone, and tidbits are already the app\'s most-delivered content: ' +
      'selectHabitTidbit surfaces one inside HabitCelebrationModal after completions, with ' +
      '"learn more" attached. This spent a push slot re-delivering an in-app surface. ' +
      'Placeholder: {tidbit} (needs at least one active tidbit in the pool).',
    enabled: false,
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
      'PARKED 2026-09-18 (enabled: false). Structurally the day-7 recap again — same two ' +
      'placeholders, same shape, two weeks later. Repeating a message format is what made ' +
      'the journey read as a drip rather than as the app noticing something. Day 7 keeps the ' +
      'recap slot; day 28 keeps the milestone. Placeholders: {habits_completed}, {practices_tried}.',
    enabled: false,
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

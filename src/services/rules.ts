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
 * The first rules-engine consumer: a configurable "come back" push for users
 * who have gone quiet. Seeded disabled — flip on from the Admin Rules screen.
 */
export const DEFAULT_RULES: Omit<Rule, 'id' | 'created_at' | 'updated_at'>[] = [
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

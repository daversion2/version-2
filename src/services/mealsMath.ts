import type {
  FoodGroupId,
  GroupGoal,
  MealEntry,
  MealExtra,
  MealsDay,
  MealsPrefs,
  MealsRules,
  MealSlot,
  WholeGroupId,
} from '../types/meals';
import { groupLabel, isWholeGroup, MAX_GROUP_GOALS, MAX_SLOTS, WHOLE_GROUPS } from '../data/mealGroups';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// MEALS — the rules. Pure functions, no I/O (storage is services/labMeals.ts).
//
// A plate PASSES with at least one whole-food group and nothing Processed;
// Semi-processed is fine alongside real food. Strict mode: whole food only.
//
// A day is scored against the user's goal, "pass N of my M meals":
//   - M - N is how many misses the day can hold. A failed extra (a snack or a
//     drink) is one miss, exactly like a failed meal (founder, 2026-10-17).
//   - A meal marked "didn't eat" never counts against the day — it is simply
//     not part of it.
//   - Every DAILY food-group goal must be met as well. WEEKLY group goals never
//     decide a day; they're a progress bar for the week.
// There are no flex meals and no allowance to spend (founder's call): the day
// is on target or it isn't.
// =============================================================================

export type PlateResult = 'pass' | 'fail';

/** Pass or fail for the groups on one plate; null for an empty plate (nothing chosen yet). */
export const evaluatePlate = (groups: FoodGroupId[] | undefined, strict: boolean): PlateResult | null => {
  if (!groups || groups.length === 0) return null;
  const hasWhole = groups.some(isWholeGroup);
  if (!hasWhole || groups.includes('processed')) return 'fail';
  if (strict && groups.includes('semi')) return 'fail';
  return 'pass';
};

/** The result and the one-line reason the picker shows under the chips. */
export const plateVerdict = (
  groups: FoodGroupId[],
  strict: boolean
): { result: PlateResult | null; why: string } => {
  const result = evaluatePlate(groups, strict);
  if (!result) return { result, why: 'Tap what was on the plate.' };
  if (groups.includes('processed')) return { result, why: 'Something Processed was on the plate.' };
  if (!groups.some(isWholeGroup)) return { result, why: 'No whole food on the plate.' };
  if (strict && groups.includes('semi')) return { result, why: 'Strict mode: whole food only.' };
  return { result, why: groups.includes('semi') ? 'Real food, with a little semi-processed.' : 'All whole food.' };
};

/** "Eggs · Fruit". */
export const describeGroups = (groups: FoodGroupId[]): string => groups.map(groupLabel).join(' · ');

export const rulesOf = (prefs: MealsPrefs): MealsRules => ({
  slots: prefs.slots,
  pass_goal: prefs.pass_goal,
  strict: prefs.strict,
  group_goals: prefs.group_goals,
});

/** How many misses a day can hold under these rules. */
export const allowedMisses = (rules: Pick<MealsRules, 'slots' | 'pass_goal'>): number =>
  Math.max(0, rules.slots.length - Math.min(rules.pass_goal, rules.slots.length));

// --- Scoring a day -------------------------------------------------------------

export type ItemState = PlateResult | 'skipped' | 'pending';

export interface ScoredItem {
  /** Slot id for a meal, extra id for an extra. */
  key: string;
  kind: 'meal' | 'extra';
  name: string;
  state: ItemState;
  groups: FoodGroupId[];
}

export interface GroupGoalProgress {
  goal: GroupGoal;
  have: number;
  met: boolean;
}

export type DayStatus = 'on' | 'off' | 'pending';

export interface DayScore {
  items: ScoredItem[];
  passes: number;
  fails: number;
  allowed: number;
  /** Meals not logged yet. */
  pending: number;
  /** Every meal logged or marked "didn't eat". */
  complete: boolean;
  /** Daily goals only. */
  groupGoals: GroupGoalProgress[];
  /**
   * 'off' as soon as the misses run out — even mid-day, because the next meal
   * can't change it and saying "in progress" would be a lie. Otherwise 'on'
   * once every meal is logged and every daily goal is met, 'pending' before.
   */
  status: DayStatus;
}

/** How many of the scored plates carry this group. A plate counts once however much was on it. */
const countGroup = (items: ScoredItem[], group: WholeGroupId): number =>
  items.filter((i) => (i.state === 'pass' || i.state === 'fail') && i.groups.includes(group)).length;

export const scoreDay = (day: Pick<MealsDay, 'meals' | 'extras'> | undefined, rules: MealsRules): DayScore => {
  const items: ScoredItem[] = rules.slots.map((slot) => {
    const entry = day?.meals[slot.id];
    if (!entry) return { key: slot.id, kind: 'meal', name: slot.name, state: 'pending', groups: [] };
    if (entry.skipped) return { key: slot.id, kind: 'meal', name: slot.name, state: 'skipped', groups: [] };
    return {
      key: slot.id,
      kind: 'meal',
      name: slot.name,
      state: evaluatePlate(entry.groups, rules.strict) ?? 'pending',
      groups: entry.groups,
    };
  });
  for (const extra of day?.extras ?? []) {
    const result = evaluatePlate(extra.groups, rules.strict);
    if (!result) continue;
    items.push({ key: extra.id, kind: 'extra', name: extra.name || 'Something extra', state: result, groups: extra.groups });
  }

  const passes = items.filter((i) => i.state === 'pass').length;
  const fails = items.filter((i) => i.state === 'fail').length;
  const pending = items.filter((i) => i.state === 'pending').length;
  const allowed = allowedMisses(rules);
  const complete = pending === 0;
  const groupGoals = rules.group_goals
    .filter((g) => g.period === 'day')
    .map((goal) => {
      const have = countGroup(items, goal.group);
      return { goal, have, met: have >= goal.count };
    });

  let status: DayStatus = 'pending';
  if (fails > allowed) status = 'off';
  else if (complete) status = groupGoals.every((g) => g.met) ? 'on' : 'off';

  return { items, passes, fails, allowed, pending, complete, groupGoals, status };
};

/** Today is scored by the current settings; a past day by the ones it was saved under. */
export const rulesForDay = (
  date: string,
  today: string,
  day: Pick<MealsDay, 'rules'> | undefined,
  current: MealsRules
): MealsRules => (date === today ? current : (day?.rules ?? current));

// --- The week ------------------------------------------------------------------

const addDays = (dateStr: string, n: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
};

/** Monday through Sunday of the week containing dateStr. Weeks reset on Monday. */
export const weekDates = (dateStr: string): string[] => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sunday
  const monday = addDays(dateStr, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

export interface WeekDay {
  date: string;
  future: boolean;
  /** null for a future day. */
  score: DayScore | null;
  rules: MealsRules;
}

export interface WeekSummary {
  days: WeekDay[];
  /** Plates that passed / plates scored, meals and extras, so far this week. */
  passed: number;
  scored: number;
  /** The meal that fails most often this week, if any has failed. */
  slipping: { slotId: string; name: string; fails: number; logged: number } | null;
  /** Weekly goals, counted across the week so far. */
  weeklyGoals: { goal: GroupGoal; have: number }[];
}

export const summarizeWeek = (
  today: string,
  days: Record<string, MealsDay | undefined>,
  current: MealsRules
): WeekSummary => {
  const week: WeekDay[] = weekDates(today).map((date) => {
    const rules = rulesForDay(date, today, days[date], current);
    const future = date > today;
    return { date, future, rules, score: future ? null : scoreDay(days[date], rules) };
  });

  let passed = 0;
  let scored = 0;
  const bySlot = new Map<string, { name: string; fails: number; logged: number }>();
  for (const { score } of week) {
    if (!score) continue;
    for (const item of score.items) {
      if (item.state !== 'pass' && item.state !== 'fail') continue;
      scored += 1;
      if (item.state === 'pass') passed += 1;
      if (item.kind !== 'meal') continue;
      // Grouped by the CURRENT slot's name, so a renamed meal reads as itself.
      const name = current.slots.find((s) => s.id === item.key)?.name ?? item.name;
      const row = bySlot.get(item.key) ?? { name, fails: 0, logged: 0 };
      row.logged += 1;
      if (item.state === 'fail') row.fails += 1;
      bySlot.set(item.key, row);
    }
  }

  let slipping: WeekSummary['slipping'] = null;
  for (const [slotId, row] of bySlot) {
    if (row.fails === 0) continue;
    const better =
      !slipping ||
      row.fails / row.logged > slipping.fails / slipping.logged ||
      (row.fails / row.logged === slipping.fails / slipping.logged && row.fails > slipping.fails);
    if (better) slipping = { slotId, ...row };
  }

  const weeklyGoals = current.group_goals
    .filter((g) => g.period === 'week')
    .map((goal) => ({
      goal,
      have: week.reduce((sum, d) => sum + (d.score ? countGroup(d.score.items, goal.group) : 0), 0),
    }));

  return { days: week, passed, scored, slipping, weeklyGoals };
};

/** Did a past day meet a daily goal? Read from that day's own score. */
export const dailyGoalOnDay = (day: WeekDay, group: WholeGroupId, count: number): 'hit' | 'miss' | 'none' => {
  if (!day.score) return 'none';
  const have = countGroup(day.score.items, group);
  if (have >= count) return 'hit';
  return day.score.complete ? 'miss' : 'none';
};

// --- Settings ------------------------------------------------------------------

/** Keeps "pass N of M" possible: N is never more than M, never below 0. */
export const clampPassGoal = (passGoal: number, slotCount: number): number =>
  Math.max(0, Math.min(slotCount, Math.round(passGoal)));

/**
 * Adding a meal raises the goal with it when every meal had to pass — "all of
 * them" should stay "all of them". Otherwise the misses the day can hold grow.
 */
export const addSlot = (prefs: Pick<MealsPrefs, 'slots' | 'pass_goal'>, slot: MealSlot) => {
  if (prefs.slots.length >= MAX_SLOTS) return prefs;
  const allMustPass = prefs.pass_goal >= prefs.slots.length;
  const slots = [...prefs.slots, slot];
  return { slots, pass_goal: allMustPass ? slots.length : prefs.pass_goal };
};

export const removeSlot = (prefs: Pick<MealsPrefs, 'slots' | 'pass_goal'>, slotId: string) => {
  if (prefs.slots.length <= 1) return prefs;
  const slots = prefs.slots.filter((s) => s.id !== slotId);
  return { slots, pass_goal: clampPassGoal(prefs.pass_goal, slots.length) };
};

/** A new group goal, on the first whole-food group not already used. Null when the limit is reached. */
export const newGroupGoal = (existing: GroupGoal[], id: string): GroupGoal | null => {
  if (existing.length >= MAX_GROUP_GOALS) return null;
  const used = new Set(existing.map((g) => g.group));
  const group = WHOLE_GROUPS.find((g) => !used.has(g.id))?.id ?? 'veggies';
  return { id, group, count: 1, period: 'day' };
};

/** "Veggies at 2 meals a day" / "Fish 2 times a week". */
export const describeGroupGoal = (goal: GroupGoal): string => {
  const label = groupLabel(goal.group);
  if (goal.period === 'day') return `${label} at ${goal.count} ${goal.count === 1 ? 'meal' : 'meals'} a day`;
  return `${label} ${goal.count} ${goal.count === 1 ? 'time' : 'times'} a week`;
};

/** The settings helper line under "Pass N of M". */
export const describeMealGoal = (rules: Pick<MealsRules, 'slots' | 'pass_goal'>): string => {
  const misses = allowedMisses(rules);
  if (misses === 0) return 'Every meal has to pass. A snack or drink that doesn’t pass is a miss too.';
  return `The day can hold ${misses} ${misses === 1 ? 'miss' : 'misses'} — a meal, snack or drink that doesn’t pass.`;
};

// --- Editing a day -------------------------------------------------------------

export const emptyDay = (date: string): MealsDay => ({ date, meals: {}, extras: [] });

/** Set a meal's entry, or clear it back to "not logged" with null. */
export const withMeal = (day: MealsDay, slotId: string, entry: MealEntry | null): MealsDay => {
  const meals = { ...day.meals };
  if (entry) meals[slotId] = entry;
  else delete meals[slotId];
  return { ...day, meals };
};

/** Add an extra, or replace the one with the same id. */
export const withExtra = (day: MealsDay, extra: MealExtra): MealsDay => {
  const exists = day.extras.some((e) => e.id === extra.id);
  return { ...day, extras: exists ? day.extras.map((e) => (e.id === extra.id ? extra : e)) : [...day.extras, extra] };
};

export const withoutExtra = (day: MealsDay, extraId: string): MealsDay => ({
  ...day,
  extras: day.extras.filter((e) => e.id !== extraId),
});

/**
 * Close the day under the rules it was scored by. Only a finished day closes,
 * so its result is final: 'on' or 'off', never "in progress".
 */
export const closeDay = (
  day: MealsDay,
  rules: MealsRules,
  close: { now: Date; reasonId?: string; habitId?: string }
): MealsDay => {
  const score = scoreDay(day, rules);
  const result = score.status === 'on' ? 'on' : 'off';
  return {
    ...day,
    rules,
    closed_at: close.now.toISOString(),
    result,
    off_reason_id: result === 'off' ? close.reasonId : undefined,
    habit_id: result === 'on' ? close.habitId : undefined,
  };
};

/** A day that checked a habit off stays closed — the check-in can't be taken back from here. */
export const canReopen = (day: MealsDay | undefined): boolean => !!day?.closed_at && !day.habit_id;

export const reopenDay = (day: MealsDay): MealsDay => {
  const { closed_at, result, off_reason_id, habit_id, ...rest } = day;
  return rest;
};

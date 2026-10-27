import type {
  FoodGroupId,
  GroupGoal,
  MealEntry,
  MealExtra,
  MealsDay,
  MealsPrefs,
  MealsRules,
  MealsScoringWeights,
  MealSlot,
  NutrientId,
  ProcessedGroupId,
  WholeGroupId,
} from '../types/meals';
import {
  DEFAULT_MEALS_SCORING,
  groupLabel,
  groupNutrients,
  isWholeGroup,
  MAX_GROUP_GOALS,
  MAX_SLOTS,
  NUTRIENTS,
  PROCESSED_GROUPS,
  WHOLE_GROUPS,
} from '../data/mealGroups';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// MEALS — the rules. Pure functions, no I/O (storage is services/labMeals.ts).
//
// Each plate scores 0-100 (null if nothing's been tapped yet): mostly whole
// food scores high; Processed, and (in strict mode) Dairy/Semi-processed/
// Supplements, cost points on top of what diluting the whole-food ratio
// already costs. See scorePlate().
//
// A day's score is the plain average of every scored plate (meals + extras
// together, unweighted). A meal marked "didn't eat" never counts against the
// day — it's simply not part of it. Daily and weekly food-group goals are a
// progress readout only — they don't gate on/off (founder, 2026-10-26). A day
// is 'on' once every meal is logged/skipped and the average is at or above
// scoring.on_target_threshold, 'off' if it's below, 'pending' until
// complete — no early mid-day verdict.
// =============================================================================

/** Dairy, Semi-processed and Supplements — what strict mode's extra penalty applies to. 'processed' has its own penalty. */
const SEMI_TIER_GROUPS: ProcessedGroupId[] = ['dairy', 'supplements', 'semi'];

/** 0-100, or null for an empty plate (nothing chosen yet). */
export const scorePlate = (
  groups: FoodGroupId[] | undefined,
  strict: boolean,
  weights: MealsScoringWeights
): number | null => {
  if (!groups || groups.length === 0) return null;
  const wholeFoodRatio = groups.filter(isWholeGroup).length / groups.length;
  const ratioPoints = wholeFoodRatio * weights.ratio_points;
  const nutrientBonus = plateNutrients(groups).length * weights.nutrient_bonus;
  const processedPenalty = groups.includes('processed') ? weights.processed_penalty : 0;
  const hasSemiTier = groups.some((g) => SEMI_TIER_GROUPS.includes(g as ProcessedGroupId));
  const strictPenalty = strict && hasSemiTier ? weights.strict_penalty : 0;
  const raw = ratioPoints + nutrientBonus - processedPenalty - strictPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

export interface PlateScore {
  score: number | null;
  why: string;
}

/** The score and the one-line reason the picker shows under the chips. */
export const scoreVerdict = (groups: FoodGroupId[], strict: boolean, weights: MealsScoringWeights): PlateScore => {
  const score = scorePlate(groups, strict, weights);
  if (score === null) return { score, why: 'Tap what was on the plate.' };
  const notes: string[] = [];
  if (groups.includes('processed')) notes.push(`Processed on the plate (−${weights.processed_penalty})`);
  if (strict && groups.some((g) => SEMI_TIER_GROUPS.includes(g as ProcessedGroupId))) {
    notes.push(`strict mode (−${weights.strict_penalty})`);
  }
  if (notes.length > 0) return { score, why: notes.join(' · ') };
  return { score, why: groups.every(isWholeGroup) ? 'All whole food.' : 'Real food, with a little semi-processed.' };
};

/** "Eggs · Fruit". */
export const describeGroups = (groups: FoodGroupId[]): string => groups.map(groupLabel).join(' · ');

export const rulesOf = (prefs: MealsPrefs): MealsRules => ({
  slots: prefs.slots,
  strict: prefs.strict,
  group_goals: prefs.group_goals,
  scoring: prefs.scoring,
});

// --- Scoring a day -------------------------------------------------------------

export type ItemState = 'scored' | 'skipped' | 'pending';

export interface ScoredItem {
  /** Slot id for a meal, extra id for an extra. */
  key: string;
  kind: 'meal' | 'extra';
  name: string;
  state: ItemState;
  groups: FoodGroupId[];
  /** Non-null iff state === 'scored'. */
  score: number | null;
}

export interface GroupGoalProgress {
  goal: GroupGoal;
  have: number;
  met: boolean;
}

export type DayStatus = 'on' | 'off' | 'pending';

// --- Nutrients -----------------------------------------------------------------
// Inferred from the groups on a plate (data/mealGroups.ts): a plate "had
// protein" if any of its groups is tagged Protein. Coverage counts PLATES —
// meals and snacks alike (founder, 2026-10-19) — never amounts.

/** The nutrients one plate carries, in display order. */
export const plateNutrients = (groups: FoodGroupId[]): NutrientId[] =>
  NUTRIENTS.map((n) => n.id).filter((id) => groups.some((g) => groupNutrients(g).includes(id)));

export interface NutrientCoverage {
  nutrient: NutrientId;
  /** Plates that had it. */
  have: number;
  /** Plates logged — skipped and unlogged meals aren't plates. */
  of: number;
}

export const nutrientCoverage = (items: Pick<ScoredItem, 'state' | 'groups'>[]): NutrientCoverage[] => {
  const plates = items.filter((i) => i.state === 'scored');
  return NUTRIENTS.map((n) => ({
    nutrient: n.id,
    have: plates.filter((p) => plateNutrients(p.groups).includes(n.id)).length,
    of: plates.length,
  }));
};

export interface DayScore {
  items: ScoredItem[];
  /** Plain average of every scored item's score. Null if nothing's scored yet. */
  average: number | null;
  scoredCount: number;
  /** Meals not logged yet. */
  pending: number;
  /** Every meal logged or marked "didn't eat". */
  complete: boolean;
  /** Daily goals only — a progress readout, never decides status. */
  groupGoals: GroupGoalProgress[];
  /** How many of the day's plates had each nutrient. Never decides the day. */
  nutrients: NutrientCoverage[];
  /** 'pending' until every meal is logged/skipped, then 'on' or 'off' from the average. */
  status: DayStatus;
}

/** How many of the scored plates carry this group. A plate counts once however much was on it. */
const countGroup = (items: ScoredItem[], group: WholeGroupId): number =>
  items.filter((i) => i.state === 'scored' && i.groups.includes(group)).length;

export const scoreDay = (day: Pick<MealsDay, 'meals' | 'extras'> | undefined, rules: MealsRules): DayScore => {
  const weights = rules.scoring;
  const items: ScoredItem[] = rules.slots.map((slot) => {
    const entry = day?.meals[slot.id];
    if (!entry) return { key: slot.id, kind: 'meal', name: slot.name, state: 'pending', groups: [], score: null };
    if (entry.skipped) return { key: slot.id, kind: 'meal', name: slot.name, state: 'skipped', groups: [], score: null };
    const score = scorePlate(entry.groups, rules.strict, weights);
    return {
      key: slot.id,
      kind: 'meal',
      name: slot.name,
      state: score === null ? 'pending' : 'scored',
      groups: entry.groups,
      score,
    };
  });
  for (const extra of day?.extras ?? []) {
    const score = scorePlate(extra.groups, rules.strict, weights);
    if (score === null) continue;
    items.push({ key: extra.id, kind: 'extra', name: extra.name || 'Something extra', state: 'scored', groups: extra.groups, score });
  }

  const scored = items.filter((i) => i.state === 'scored');
  const average = scored.length > 0 ? Math.round(scored.reduce((sum, i) => sum + (i.score ?? 0), 0) / scored.length) : null;
  const pending = items.filter((i) => i.state === 'pending').length;
  const complete = pending === 0;
  const groupGoals = rules.group_goals
    .filter((g) => g.period === 'day')
    .map((goal) => {
      const have = countGroup(items, goal.group);
      return { goal, have, met: have >= goal.count };
    });

  let status: DayStatus = 'pending';
  if (complete && average !== null) status = average >= weights.on_target_threshold ? 'on' : 'off';

  return { items, average, scoredCount: scored.length, pending, complete, groupGoals, nutrients: nutrientCoverage(items), status };
};

/** Today is scored by the current settings; a past day by the ones it was saved under. */
export const rulesForDay = (
  date: string,
  today: string,
  day: Pick<MealsDay, 'rules'> | undefined,
  current: MealsRules
): MealsRules => {
  if (date === today) return current;
  const saved = day?.rules;
  if (!saved) return current;
  // Every day saved before scoring went 0-100 has no `scoring` field — backfill
  // it (and any partially-present one) so an old day never crashes scoreDay.
  return { ...saved, scoring: { ...DEFAULT_MEALS_SCORING, ...(saved.scoring ?? {}) } };
};

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
  /** Average score across every scored plate (meals + extras) so far this week. Null if none. */
  averageScore: number | null;
  /** How many plates have been scored so far this week. */
  platesLogged: number;
  /** The meal slipping furthest below target, if any slot's average is under it. */
  slipping: { slotId: string; name: string; average: number; logged: number } | null;
  /** Weekly goals, counted across the week so far. */
  weeklyGoals: { goal: GroupGoal; have: number }[];
  /** Nutrient coverage across every plate so far this week. */
  nutrients: NutrientCoverage[];
}

export const summarizeWeek = (
  today: string,
  days: Record<string, MealsDay | undefined>,
  current: MealsRules,
  /** Any date in the week to summarize. Defaults to this week. */
  weekOf: string = today
): WeekSummary => {
  const week: WeekDay[] = weekDates(weekOf).map((date) => {
    const rules = rulesForDay(date, today, days[date], current);
    const future = date > today;
    return { date, future, rules, score: future ? null : scoreDay(days[date], rules) };
  });

  let sum = 0;
  let platesLogged = 0;
  const bySlot = new Map<string, { name: string; sum: number; logged: number }>();
  for (const { score } of week) {
    if (!score) continue;
    for (const item of score.items) {
      if (item.state !== 'scored') continue;
      platesLogged += 1;
      sum += item.score as number;
      if (item.kind !== 'meal') continue;
      // Grouped by the CURRENT slot's name, so a renamed meal reads as itself.
      const name = current.slots.find((s) => s.id === item.key)?.name ?? item.name;
      const row = bySlot.get(item.key) ?? { name, sum: 0, logged: 0 };
      row.logged += 1;
      row.sum += item.score as number;
      bySlot.set(item.key, row);
    }
  }
  const averageScore = platesLogged > 0 ? Math.round(sum / platesLogged) : null;

  let slipping: WeekSummary['slipping'] = null;
  for (const [slotId, row] of bySlot) {
    const average = Math.round(row.sum / row.logged);
    if (average >= current.scoring.on_target_threshold) continue;
    const better = !slipping || average < slipping.average || (average === slipping.average && row.logged > slipping.logged);
    if (better) slipping = { slotId, name: row.name, average, logged: row.logged };
  }

  const weeklyGoals = current.group_goals
    .filter((g) => g.period === 'week')
    .map((goal) => ({
      goal,
      have: week.reduce((sum, d) => sum + (d.score ? countGroup(d.score.items, goal.group) : 0), 0),
    }));

  const nutrients = nutrientCoverage(week.flatMap((d) => d.score?.items ?? []));

  return { days: week, averageScore, platesLogged, slipping, weeklyGoals, nutrients };
};

/** Something was logged that week: a plate, or a meal marked "didn't eat". */
const anythingLogged = (w: WeekSummary): boolean =>
  w.days.some((d) => d.score?.items.some((i) => i.state !== 'pending'));

/**
 * The `count` weeks before this one, newest first, each scored under the
 * rules its days were saved with. Weeks with nothing logged are left out.
 */
export const pastWeeks = (
  today: string,
  days: Record<string, MealsDay | undefined>,
  current: MealsRules,
  count = 4
): WeekSummary[] =>
  Array.from({ length: count }, (_, i) => summarizeWeek(today, days, current, addDays(today, -7 * (i + 1)))).filter(
    anythingLogged
  );

/** Days that ended on target. */
export const daysOnTarget = (w: WeekSummary): number => w.days.filter((d) => d.score?.status === 'on').length;

/** Did a past day meet a daily goal? Read from that day's own score. */
export const dailyGoalOnDay = (day: WeekDay, group: WholeGroupId, count: number): 'hit' | 'miss' | 'none' => {
  if (!day.score) return 'none';
  const have = countGroup(day.score.items, group);
  if (have >= count) return 'hit';
  return day.score.complete ? 'miss' : 'none';
};

// --- Settings ------------------------------------------------------------------

export const addSlot = (prefs: Pick<MealsPrefs, 'slots'>, slot: MealSlot): Pick<MealsPrefs, 'slots'> => {
  if (prefs.slots.length >= MAX_SLOTS) return prefs;
  return { slots: [...prefs.slots, slot] };
};

export const removeSlot = (prefs: Pick<MealsPrefs, 'slots'>, slotId: string): Pick<MealsPrefs, 'slots'> => {
  if (prefs.slots.length <= 1) return prefs;
  return { slots: prefs.slots.filter((s) => s.id !== slotId) };
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

// --- Recent plates ------------------------------------------------------------

/** A plate logged before, offered as a one-tap fill in the picker. */
export interface RecentPlate {
  /** In the picker's order, so the same plate always reads the same way. */
  groups: FoodGroupId[];
  /** Extras: the most recent name it was logged under, if it had one. */
  name?: string;
}

const GROUP_ORDER: FoodGroupId[] = [...WHOLE_GROUPS, ...PROCESSED_GROUPS].map((g) => g.id);

const canonical = (groups: FoodGroupId[]): FoodGroupId[] =>
  [...new Set(groups)].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

/**
 * Distinct plates from past days, newest first, for the picker's "Recent" row.
 * Plates logged in the same place come first: your usual lunch when you tap
 * Lunch, your usual snacks when you add something additional. Then everything
 * else. "Didn't eat" and empty plates are never offered.
 */
export const recentPlates = (
  days: MealsDay[],
  target: { kind: 'meal'; slotId: string } | { kind: 'extra' },
  max = 4
): RecentPlate[] => {
  interface Seen {
    plate: RecentPlate;
    at: string;
    here: boolean;
  }
  const seen = new Map<string, Seen>();
  const note = (groups: FoodGroupId[] | undefined, at: string, here: boolean, name?: string) => {
    if (!groups || groups.length === 0) return;
    const ordered = canonical(groups);
    const key = ordered.join('|');
    const prev = seen.get(key);
    const newer = !prev || at > prev.at;
    seen.set(key, {
      plate: { groups: ordered, name: newer ? name ?? prev?.plate.name : prev.plate.name ?? name },
      at: newer ? at : prev.at,
      here: here || !!prev?.here,
    });
  };
  for (const day of days) {
    for (const [slotId, entry] of Object.entries(day.meals)) {
      note(entry.groups, entry.logged_at, target.kind === 'meal' && slotId === target.slotId);
    }
    for (const extra of day.extras) note(extra.groups, extra.logged_at, target.kind === 'extra', extra.name);
  }
  return [...seen.values()]
    .sort((a, b) => Number(b.here) - Number(a.here) || b.at.localeCompare(a.at))
    .slice(0, max)
    .map(({ plate }) => (target.kind === 'extra' && plate.name ? plate : { groups: plate.groups }));
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

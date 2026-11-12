import type {
  BuiltInGroupId,
  ChipProfile,
  CustomFoodGroup,
  FoodGroupId,
  GroupGoal,
  GroupScores,
  MealGoalId,
  MealPlate,
  MealsDay,
  MealsModel,
  MealsPrefs,
  MealsRules,
  MealsScoringWeights,
  NutrientId,
  QualityId,
  WholeGroupId,
} from '../types/meals';
import {
  BUILT_IN_MEALS_MODEL,
  DEFAULT_MEAL_GOAL,
  DEFAULT_MEALS_SCORING,
  FOOD_GROUPS,
  findCustomGroup,
  groupLabel,
  groupNutrients,
  isCustomGroup,
  isWholeGroup,
  MAX_CUSTOM_GROUPS,
  MAX_GROUP_GOALS,
  mealGoal,
  NUTRIENTS,
  processingOf,
  QUALITIES,
  WHOLE_GROUPS,
} from '../data/mealGroups';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// MEALS — the rules. Pure functions, no I/O (storage is services/labMeals.ts).
//
// Each plate scores 0-100 (null if nothing's been tapped yet): the average of
// its chips' scores (founder, 2026-11-05). A built-in chip's score is worked
// out from its profile and the user's goal's weights (chipBreakdown), with any
// the user changed on top (groupScoresFor); the user's own foods carry the
// score they gave them. See scorePlate().
//
// Days saved before chip scores have no `group_scores` in their rules and are
// still scored by the formula they were saved under (scoreByFormula), so
// history never moves.
//
// A day is just the plates logged on it — no meals to set up or fill in
// (founder, 2026-11-05). Its score is the plain average of every plate,
// unweighted. Daily and weekly food-group goals are a progress readout only —
// they don't gate on/off (founder, 2026-10-26). A day is 'pending' until it
// settles — closed out by hand, or on its own at midnight — then 'on' if the
// average is at or above scoring.on_target_threshold, 'off' if below: no early
// mid-day verdict. A settled day with no plates is 'none': neither on nor off.
// =============================================================================

// --- A chip's score, from its profile and the goal -----------------------------------

const clampScore = (n: number): number => Math.max(0, Math.min(100, n));

/** A chip score as settings store it: a whole number from 0 to 100. */
export const clampChipScore = (n: number): number => clampScore(Math.round(n));

export interface BreakdownLine {
  quality: QualityId;
  rating: number;
  weight: number;
  /** Positive or negative: rating × weight, signed by the quality's kind. */
  points: number;
}

export interface ChipBreakdown {
  /** Every quality that moved the score, in QUALITIES order. */
  lines: BreakdownLine[];
  /** Before the processing ceiling, clamped to 0-100. */
  raw: number;
  ceiling: number;
  score: number;
  capped: boolean;
}

/**
 * How a profile scores under a goal: start at the model's base, add rating ×
 * weight for each positive quality, subtract it for each penalty, clamp to
 * 0-100, then cap at the processing level's ceiling. Every function here takes
 * the model to score with — the one an admin saved (services/mealsModel.ts),
 * or by default the one the app ships with.
 */
export const profileBreakdown = (
  profile: ChipProfile,
  goal: MealGoalId | undefined,
  model: MealsModel = BUILT_IN_MEALS_MODEL
): ChipBreakdown => {
  const weights = model.weights[mealGoal(goal).id];
  const lines: BreakdownLine[] = [];
  let total = model.base;
  for (const q of QUALITIES) {
    const points = (q.kind === 'plus' ? 1 : -1) * profile[q.id] * weights[q.id];
    if (points !== 0) lines.push({ quality: q.id, rating: profile[q.id], weight: weights[q.id], points });
    total += points;
  }
  const raw = clampChipScore(total);
  const ceiling = model.ceilings[profile.processing] ?? 100;
  return { lines, raw, ceiling, score: Math.min(raw, ceiling), capped: raw > ceiling };
};

const profileOf = (id: BuiltInGroupId, model: MealsModel): ChipProfile => {
  const profile = model.profiles[id] ?? BUILT_IN_MEALS_MODEL.profiles[id];
  if (!profile) throw new Error(`Unknown food group: ${id}`);
  return profile;
};

export const chipBreakdown = (
  id: BuiltInGroupId,
  goal: MealGoalId | undefined,
  model: MealsModel = BUILT_IN_MEALS_MODEL
): ChipBreakdown => profileBreakdown(profileOf(id, model), goal, model);

// Per model object, so a saved model gets its own scores; models are never mutated.
const goalScoresCache = new WeakMap<MealsModel, Map<MealGoalId, GroupScores>>();

/** Every built-in chip's score under a goal, before any the user changed. */
export const goalScores = (goal: MealGoalId | undefined, model: MealsModel = BUILT_IN_MEALS_MODEL): GroupScores => {
  const id = mealGoal(goal).id;
  let byGoal = goalScoresCache.get(model);
  if (!byGoal) goalScoresCache.set(model, (byGoal = new Map()));
  const cached = byGoal.get(id);
  if (cached) return cached;
  const scores = Object.fromEntries(FOOD_GROUPS.map((g) => [g.id, chipBreakdown(g.id, id, model).score])) as GroupScores;
  byGoal.set(id, scores);
  return scores;
};

/**
 * The one line a chip explains itself with, from its profile — "Lots of
 * protein, good vitamins & minerals." No hand-written copy per chip.
 */
export const chipReason = (id: BuiltInGroupId, model: MealsModel = BUILT_IN_MEALS_MODEL): string => {
  const p = profileOf(id, model);
  const bits: string[] = [];
  if (p.protein >= 3) bits.push('lots of protein');
  else if (p.protein === 2) bits.push('good protein');
  if (p.fiber >= 3) bits.push('high fiber');
  else if (p.fiber === 2) bits.push('some fiber');
  if (p.micros >= 3) bits.push('rich in vitamins & minerals');
  else if (p.micros === 2) bits.push('good vitamins & minerals');
  if (p.fats >= 2) bits.push('healthy fats');
  if (p.refined >= 3) bits.push('added sugar');
  else if (p.refined >= 1) bits.push('refined flour or sugar');
  if (p.processing >= 3) bits.push('ultra-processed');
  else if (p.processing === 2) bits.push('processed');
  if (!bits.length) return 'Not much either way.';
  const text = bits.join(', ');
  return text[0].toUpperCase() + text.slice(1) + '.';
};

// --- Chip scores with the user's changes ------------------------------------------

/** Every built-in chip's score: the goal's, with the user's changes on top. */
export const groupScoresFor = (
  goal: MealGoalId | undefined,
  overrides: Partial<GroupScores> = {},
  model: MealsModel = BUILT_IN_MEALS_MODEL
): GroupScores => {
  const scores = { ...goalScores(goal, model) };
  for (const [id, score] of Object.entries(overrides)) {
    if (typeof score === 'number') scores[id as BuiltInGroupId] = clampChipScore(score);
  }
  return scores;
};

/**
 * Change one chip's score. A score set back to the goal's default drops out of
 * the overrides, so they only ever hold real changes.
 */
export const setScoreOverride = (
  goal: MealGoalId | undefined,
  overrides: Partial<GroupScores> = {},
  id: BuiltInGroupId,
  score: number,
  model: MealsModel = BUILT_IN_MEALS_MODEL
): Partial<GroupScores> => {
  const { [id]: _, ...rest } = overrides;
  const value = clampChipScore(score);
  return value === goalScores(goal, model)[id] ? rest : { ...rest, [id]: value };
};

/** How many chips the user scored differently from their goal. */
export const overrideCount = (
  goal: MealGoalId | undefined,
  overrides: Partial<GroupScores> = {},
  model: MealsModel = BUILT_IN_MEALS_MODEL
): number => {
  const defaults = goalScores(goal, model);
  return Object.entries(overrides).filter(
    ([id, score]) => typeof score === 'number' && clampChipScore(score) !== defaults[id as BuiltInGroupId]
  ).length;
};

/**
 * One chip's score under these rules: the user's food's own score, or the
 * built-in chip's. A chip a saved day doesn't know (added since) reads its
 * Balanced default. Null for a removed food with no definition.
 */
export const chipScore = (
  id: FoodGroupId,
  rules: Pick<MealsRules, 'group_scores' | 'custom_groups'>
): number | null => {
  if (isCustomGroup(id)) {
    const own = findCustomGroup(id, rules.custom_groups);
    return own ? clampScore(own.score) : null;
  }
  return rules.group_scores?.[id] ?? goalScores(DEFAULT_MEAL_GOAL)[id] ?? null;
};

/** The average of the chips' scores — each chip once, however it was tapped. Null with none. */
const scoreByChips = (groups: FoodGroupId[], rules: Pick<MealsRules, 'group_scores' | 'custom_groups'>): number | null => {
  const scores = [...new Set(groups)].flatMap((g) => chipScore(g, rules) ?? []);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
};

/** The rules a plate is scored with. */
export type PlateRules = Pick<MealsRules, 'group_scores' | 'custom_groups' | 'strict' | 'scoring'>;

/** Scored by chip scores, or — a day saved before them — by the formula. */
export const usesChipScores = (rules: Pick<MealsRules, 'group_scores'>): boolean => !!rules.group_scores;

/** 0-100, or null for an empty plate (nothing chosen yet). */
export const scorePlate = (groups: FoodGroupId[] | undefined, rules: PlateRules): number | null => {
  if (!groups || groups.length === 0) return null;
  if (usesChipScores(rules)) return scoreByChips(groups, rules);
  return scoreByFormula(groups, !!rules.strict, rules.scoring, rules.custom_groups);
};

export interface PlateScore {
  score: number | null;
  why: string;
}

/** The score and the one-line reason the picker shows under the chips. */
export const scoreVerdict = (groups: FoodGroupId[], rules: PlateRules): PlateScore => {
  if (!usesChipScores(rules)) return verdictByFormula(groups, !!rules.strict, rules.scoring, rules.custom_groups);
  const score = scorePlate(groups, rules);
  if (score === null) return { score, why: 'Tap what was on the plate.' };
  const chips = [...new Set(groups)].filter((g) => chipScore(g, rules) !== null);
  if (chips.length === 1) return { score, why: `${groupLabel(chips[0], rules.custom_groups)} scores ${score}.` };
  return { score, why: `The average of ${chips.map((g) => `${groupLabel(g, rules.custom_groups)} ${chipScore(g, rules)}`).join(', ')}.` };
};

// --- The formula, for days saved before chip scores ----------------------------
// Whole-food ratio × ratio_points, a bonus per Protein/Fiber/Healthy fats tag,
// a penalty for processed food (and, strict, for the in-between chips), a lone
// protein shake exactly on target, and the user's own foods as a share each.
// A chip added since is read by its processing rating: an ultra-processed one
// costs the processed penalty, a lightly processed or processed one counts as
// semi-processed — the same split the old Processed / Semi-processed chips had.

/**
 * A plate that's only a protein shake/bar — a shake-for-lunch. It scores
 * exactly the on-target line, strict mode or not (founder, 2026-11-01).
 */
export const isShakeOnly = (groups: FoodGroupId[]): boolean =>
  groups.length > 0 && groups.every((g) => g === 'supplements');

/** Nutrients that earn the bonus — Carbs is shown but never scored. */
const BONUS_NUTRIENTS = new Set(NUTRIENTS.filter((n) => n.bonus).map((n) => n.id));

/**
 * Tags a chip carried when old days were scored and has since lost — Dairy's
 * Protein (dropped 2026-11-05). The formula still counts them, so an old day
 * keeps the score it had.
 */
const FORMULA_TAGS: Partial<Record<FoodGroupId, NutrientId[]>> = { dairy: ['protein'] };

/** The bonus tags a plate earned under the formula. */
const formulaNutrients = (groups: FoodGroupId[]): NutrientId[] =>
  [...new Set([...plateNutrients(groups), ...groups.flatMap((g) => FORMULA_TAGS[g] ?? [])])].filter((n) =>
    BONUS_NUTRIENTS.has(n)
  );

/** The user's own foods on a plate. A custom id with no definition is left out. */
const ownFoods = (groups: FoodGroupId[], custom: CustomFoodGroup[]): CustomFoodGroup[] =>
  groups.filter(isCustomGroup).flatMap((id) => findCustomGroup(id, custom) ?? []);

const hasProcessed = (groups: FoodGroupId[]): boolean => groups.some((g) => (processingOf(g) ?? 0) >= 3);
const hasInBetween = (groups: FoodGroupId[]): boolean =>
  groups.some((g) => {
    const level = processingOf(g) ?? 0;
    return level === 1 || level === 2;
  });

/** The built-in groups' score, unrounded: ratio, bonus, penalties, and the shake-only rule. */
const formulaBuiltIn = (groups: FoodGroupId[], strict: boolean, weights: MealsScoringWeights): number => {
  if (isShakeOnly(groups)) return clampScore(weights.on_target_threshold);
  const wholeFoodRatio = groups.filter(isWholeGroup).length / groups.length;
  const ratioPoints = wholeFoodRatio * weights.ratio_points;
  const nutrientBonus = formulaNutrients(groups).length * weights.nutrient_bonus;
  const processedPenalty = hasProcessed(groups) ? weights.processed_penalty : 0;
  const strictPenalty = strict && hasInBetween(groups) ? weights.strict_penalty : 0;
  return clampScore(ratioPoints + nutrientBonus - processedPenalty - strictPenalty);
};

/**
 * The formula score: the built-in groups score together; each of the user's
 * own foods is one more share at its own score. Chicken + Rice (80) with a 60
 * supplement: (80×2 + 60) / 3 = 73.
 */
export const scoreByFormula = (
  groups: FoodGroupId[] | undefined,
  strict: boolean,
  weights: MealsScoringWeights,
  custom: CustomFoodGroup[] = []
): number | null => {
  if (!groups || groups.length === 0) return null;
  const own = ownFoods(groups, custom);
  const builtIn = groups.filter((g) => !isCustomGroup(g));
  const shares = builtIn.length + own.length;
  if (shares === 0) return null;
  const builtInPoints = builtIn.length > 0 ? formulaBuiltIn(builtIn, strict, weights) * builtIn.length : 0;
  const ownPoints = own.reduce((sum, g) => sum + clampScore(g.score), 0);
  return Math.round((builtInPoints + ownPoints) / shares);
};

/** The formula's score and reason. */
export const verdictByFormula = (
  groups: FoodGroupId[],
  strict: boolean,
  weights: MealsScoringWeights,
  custom: CustomFoodGroup[] = []
): PlateScore => {
  const score = scoreByFormula(groups, strict, weights, custom);
  if (score === null) return { score, why: 'Tap what was on the plate.' };
  const notes: string[] = [];
  const own = ownFoods(groups, custom);
  if (own.length > 0) {
    const named = own.map((g) => `${g.label} ${clampScore(g.score)}`).join(', ');
    if (own.length === groups.length) return { score, why: `Your own food: ${named}.` };
    // The penalties below still apply to the rest of the plate, so say them too.
    notes.push(`Your own food (${named}) counts as ${own.length === 1 ? 'one share' : 'a share each'} of the plate`);
  } else if (isShakeOnly(groups)) {
    return { score, why: 'A protein shake on its own counts as on target.' };
  }
  if (hasProcessed(groups)) notes.push(`Processed on the plate (−${weights.processed_penalty})`);
  if (strict && hasInBetween(groups)) notes.push(`strict mode (−${weights.strict_penalty})`);
  if (own.length > 0) return { score, why: notes.join(' · ') + '.' };
  if (notes.length > 0) return { score, why: notes.join(' · ') };
  return { score, why: groups.every(isWholeGroup) ? 'All whole food.' : 'Real food, with a little semi-processed.' };
};

/** "Eggs · Fruit". */
export const describeGroups = (groups: FoodGroupId[], custom: CustomFoodGroup[] = []): string =>
  groups.map((g) => groupLabel(g, custom)).join(' · ');

export const rulesOf = (prefs: MealsPrefs, model: MealsModel = BUILT_IN_MEALS_MODEL): MealsRules => ({
  goal: prefs.goal ?? DEFAULT_MEAL_GOAL,
  group_scores: groupScoresFor(prefs.goal, prefs.score_overrides, model),
  group_goals: prefs.group_goals,
  scoring: prefs.scoring,
  custom_groups: prefs.custom_groups ?? [],
});

// --- A day's plates -------------------------------------------------------------

const byLoggedAt = (a: MealPlate, b: MealPlate): number => a.logged_at.localeCompare(b.logged_at);

/**
 * A day's plates in the order they were logged. A day saved before
 * 2026-11-05 held named meals plus extras instead: each meal becomes a plate
 * under its meal's name, and a "didn't eat" leaves nothing — it never counted.
 */
export const platesOf = (day: Partial<Pick<MealsDay, 'plates' | 'meals' | 'extras' | 'rules'>> | undefined): MealPlate[] => {
  if (!day) return [];
  if (day.plates) return day.plates;
  const slots = day.rules?.slots ?? [];
  const meals: MealPlate[] = Object.entries(day.meals ?? {}).flatMap(([id, entry]) =>
    entry.skipped || !entry.groups?.length
      ? []
      : [{ id, name: slots.find((s) => s.id === id)?.name, groups: entry.groups, logged_at: entry.logged_at }]
  );
  return [...meals, ...(day.extras ?? [])].sort(byLoggedAt);
};

/** A day as the app works with it: its plates in one list, the old meals/extras fields gone. */
export const normalizeDay = (day: MealsDay): MealsDay => {
  const { meals, extras, ...rest } = day;
  return { ...rest, plates: platesOf(day) };
};

/**
 * Is the day decided? Once closed out, or once midnight has passed — a day
 * nobody closes closes on its own (founder, 2026-11-05).
 */
export const isSettled = (date: string, today: string, day: Pick<MealsDay, 'closed_at'> | undefined): boolean =>
  !!day?.closed_at || date < today;

// --- Scoring a day -------------------------------------------------------------

export interface ScoredItem {
  /** The plate's id. */
  key: string;
  name?: string;
  groups: FoodGroupId[];
  score: number;
  logged_at: string;
}

export interface GroupGoalProgress {
  goal: GroupGoal;
  have: number;
  met: boolean;
}

/** 'none': settled with no plates — nothing to score, so it counts neither way. */
export type DayStatus = 'on' | 'off' | 'pending' | 'none';

// --- Nutrients -----------------------------------------------------------------
// Inferred from the groups on a plate (data/mealGroups.ts): a plate "had
// protein" if any of its groups is tagged Protein. Coverage counts PLATES —
// meals and snacks alike (founder, 2026-10-19) — never amounts.

/** The nutrients one plate carries, in display order. */
export const plateNutrients = (groups: FoodGroupId[], custom: CustomFoodGroup[] = []): NutrientId[] =>
  NUTRIENTS.map((n) => n.id).filter((id) => groups.some((g) => groupNutrients(g, custom).includes(id)));

export interface NutrientCoverage {
  nutrient: NutrientId;
  /** Plates that had it. */
  have: number;
  /** Plates logged. */
  of: number;
}

export const nutrientCoverage = (
  plates: Pick<ScoredItem, 'groups'>[],
  custom: CustomFoodGroup[] = []
): NutrientCoverage[] => {
  return NUTRIENTS.map((n) => ({
    nutrient: n.id,
    have: plates.filter((p) => plateNutrients(p.groups, custom).includes(n.id)).length,
    of: plates.length,
  }));
};

/** Days' coverage added up — each day already counted under its own rules. */
const sumCoverage = (days: NutrientCoverage[][]): NutrientCoverage[] =>
  NUTRIENTS.map((n) => {
    const rows = days.map((d) => d.find((c) => c.nutrient === n.id));
    return {
      nutrient: n.id,
      have: rows.reduce((sum, c) => sum + (c?.have ?? 0), 0),
      of: rows.reduce((sum, c) => sum + (c?.of ?? 0), 0),
    };
  });

export interface DayScore {
  /** Every scored plate, in the order logged. A plate with nothing tapped isn't one. */
  items: ScoredItem[];
  /** Plain average of every plate's score. Null if nothing's logged yet. */
  average: number | null;
  scoredCount: number;
  /** Closed out, or past midnight — see isSettled. */
  settled: boolean;
  /** Daily goals only — a progress readout, never decides status. */
  groupGoals: GroupGoalProgress[];
  /** How many of the day's plates had each nutrient. Never decides the day. */
  nutrients: NutrientCoverage[];
  /** 'pending' until the day settles, then 'on' or 'off' from the average ('none' with no plates). */
  status: DayStatus;
}

/** How many of the plates carry this group. A plate counts once however much was on it. */
const countGroup = (items: ScoredItem[], group: WholeGroupId): number =>
  items.filter((i) => i.groups.includes(group)).length;

/** `settled` defaults to whether the day was closed out; callers that know the date pass isSettled. */
export const scoreDay = (
  day: Partial<Pick<MealsDay, 'plates' | 'meals' | 'extras' | 'rules' | 'closed_at'>> | undefined,
  rules: MealsRules,
  settled: boolean = !!day?.closed_at
): DayScore => {
  const weights = rules.scoring;
  const custom = rules.custom_groups ?? [];
  const items: ScoredItem[] = platesOf(day).flatMap((plate) => {
    const score = scorePlate(plate.groups, rules);
    return score === null
      ? []
      : [{ key: plate.id, name: plate.name, groups: plate.groups, score, logged_at: plate.logged_at }];
  });

  const average = items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length) : null;
  const groupGoals = rules.group_goals
    .filter((g) => g.period === 'day')
    .map((goal) => {
      const have = countGroup(items, goal.group);
      return { goal, have, met: have >= goal.count };
    });

  let status: DayStatus = 'pending';
  if (settled) status = average === null ? 'none' : average >= weights.on_target_threshold ? 'on' : 'off';

  return { items, average, scoredCount: items.length, settled, groupGoals, nutrients: nutrientCoverage(items, custom), status };
};

/**
 * A past day's own foods, plus any added since from the current list. The
 * day's versions win, so changing a food's score never rescores the past; the
 * current list only fills in foods the day didn't know — say, one logged on it
 * after the fact. Removing a food archives it, so the current list has them all.
 */
export const mergeCustomGroups = (
  saved: CustomFoodGroup[] = [],
  current: CustomFoodGroup[] = []
): CustomFoodGroup[] => [...saved, ...current.filter((c) => !saved.some((s) => s.id === c.id))];

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
  return {
    ...saved,
    scoring: { ...DEFAULT_MEALS_SCORING, ...(saved.scoring ?? {}) },
    custom_groups: mergeCustomGroups(saved.custom_groups, current.custom_groups),
  };
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
  /** Average score across every plate so far this week. Null if none. */
  averageScore: number | null;
  /** How many plates have been logged so far this week. */
  platesLogged: number;
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
    return { date, future, rules, score: future ? null : scoreDay(days[date], rules, isSettled(date, today, days[date])) };
  });

  const scores = week.flatMap(({ score }) => score?.items.map((i) => i.score) ?? []);
  const platesLogged = scores.length;
  const averageScore = platesLogged > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / platesLogged) : null;

  const weeklyGoals = current.group_goals
    .filter((g) => g.period === 'week')
    .map((goal) => ({
      goal,
      have: week.reduce((sum, d) => sum + (d.score ? countGroup(d.score.items, goal.group) : 0), 0),
    }));

  const nutrients = sumCoverage(week.map((d) => d.score?.nutrients ?? []));

  return { days: week, averageScore, platesLogged, weeklyGoals, nutrients };
};

/** A plate was logged that week. */
const anythingLogged = (w: WeekSummary): boolean => w.platesLogged > 0;

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
  return day.score.settled ? 'miss' : 'none';
};

// --- Your own foods ------------------------------------------------------------

/** The foods offered in the picker and listed in settings. */
export const activeCustomGroups = (custom: CustomFoodGroup[] = []): CustomFoodGroup[] => custom.filter((g) => !g.archived);

/**
 * A new food, starting at the on-target line with no tags. Null once the
 * limit of active foods is reached — archived ones don't count toward it.
 */
export const newCustomGroup = (
  custom: CustomFoodGroup[] = [],
  id: string,
  score: number
): CustomFoodGroup | null => {
  if (activeCustomGroups(custom).length >= MAX_CUSTOM_GROUPS) return null;
  return { id: `custom_${id}`, label: `My food ${custom.length + 1}`, score: clampScore(Math.round(score)), nutrients: [] };
};

export const updateCustomGroup = (
  custom: CustomFoodGroup[] = [],
  id: string,
  changes: Partial<Omit<CustomFoodGroup, 'id'>>
): CustomFoodGroup[] =>
  custom.map((g) =>
    g.id === id ? { ...g, ...changes, ...(changes.score !== undefined ? { score: clampScore(Math.round(changes.score)) } : {}) } : g
  );

/** Removing a food only archives it: days already logged with it keep its name and score. */
export const archiveCustomGroup = (custom: CustomFoodGroup[] = [], id: string): CustomFoodGroup[] =>
  updateCustomGroup(custom, id, { archived: true });

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

// --- Editing a day -------------------------------------------------------------

export const emptyDay = (date: string): MealsDay => ({ date, plates: [] });

/** Add a plate, or replace the one with the same id. Kept in the order logged. */
export const withPlate = (day: MealsDay, plate: MealPlate): MealsDay => {
  const plates = platesOf(day);
  const exists = plates.some((p) => p.id === plate.id);
  return {
    ...normalizeDay(day),
    plates: (exists ? plates.map((p) => (p.id === plate.id ? plate : p)) : [...plates, plate]).sort(byLoggedAt),
  };
};

export const withoutPlate = (day: MealsDay, plateId: string): MealsDay => ({
  ...normalizeDay(day),
  plates: platesOf(day).filter((p) => p.id !== plateId),
});

/** The close result a day's status gives: none for a day with no plates — it counts neither way. */
const resultOf = (status: DayStatus): MealsDay['result'] =>
  status === 'on' ? 'on' : status === 'none' ? undefined : 'off';

/**
 * Does closing this day now hand it to Today for its rating? Any day with
 * plates, on target or off — since 2026-11-11 an off-target day is rated too,
 * because the days you fought for and missed are the ones worth knowing about
 * (constants/resistance.ts, "TWO RATINGS"). Only once per date: a day reopened
 * and closed again was already rated, so the rating (and its XP) can't be
 * earned twice.
 */
export const closeHandsOff = (day: MealsDay, rules: MealsRules): boolean => {
  const status = scoreDay(day, rules, true).status;
  return (status === 'on' || status === 'off') && !day.handed_off_at;
};

/**
 * A day nobody closed settles at midnight with no rating. Today asks for it
 * once, the next time it opens: the day had plates, was never handed off, and
 * has no Meals rating yet (`alreadyRated`, from the logs).
 */
export const needsMealsCatchUp = (day: MealsDay | undefined, alreadyRated: boolean): boolean =>
  !!day && platesOf(day).length > 0 && !day.handed_off_at && !alreadyRated;

/**
 * Close the day under the rules it was scored by. Its result is final: 'on' or
 * 'off', never "in progress" — or none at all for a day with no plates. A
 * close with plates not yet handed off is stamped `handed_off_at`; see
 * closeHandsOff. A day nobody closes settles at midnight without this.
 */
export const closeDay = (
  day: MealsDay,
  rules: MealsRules,
  close: { now: Date; reasonId?: string; habitId?: string }
): MealsDay => {
  const handsOff = closeHandsOff(day, rules);
  const result = resultOf(scoreDay(day, rules, true).status);
  const stamp = close.now.toISOString();
  return {
    ...normalizeDay(day),
    rules,
    closed_at: stamp,
    result,
    off_reason_id: result === 'off' ? close.reasonId : undefined,
    habit_id: result === 'on' ? close.habitId : undefined,
    handed_off_at: handsOff ? stamp : day.handed_off_at,
  };
};

/** A day that checked a habit off (before ratings moved to the app) stays closed — that check-in can't be taken back from here. */
export const canReopen = (day: MealsDay | undefined): boolean => !!day?.closed_at && !day.habit_id;

/**
 * Open for editing again. `handed_off_at` stays, so closing it again never
 * rates it twice — and an on-target close from before it existed counts as
 * handed off, since every on-target close was.
 */
export const reopenDay = (day: MealsDay): MealsDay => {
  const { closed_at, result, off_reason_id, habit_id, ...rest } = day;
  const handed_off_at = day.handed_off_at ?? (result === 'on' ? closed_at : undefined);
  return handed_off_at ? { ...rest, handed_off_at } : rest;
};

/**
 * The `date` for the finish handoff: absent when the day closed is today, the
 * day's own date when it isn't — a close left open past midnight rates the day
 * it closed, not the new one.
 */
export const handoffDate = (dayDate: string, now: Date): string | undefined =>
  dayDate === toLocalDateString(now) ? undefined : dayDate;

/**
 * The user's own foods to offer as chips on a plate. Each shows the version
 * the plate is scored with — a past day's saved score, not today's — and a
 * removed food already on the plate stays, so it can be taken off.
 */
export const pickerFoods = (
  offered: CustomFoodGroup[],
  scoredWith: CustomFoodGroup[],
  onPlate: FoodGroupId[]
): CustomFoodGroup[] => [
  ...offered.map((o) => scoredWith.find((c) => c.id === o.id) ?? o),
  ...scoredWith.filter((c) => onPlate.includes(c.id) && !offered.some((o) => o.id === c.id)),
];

/** The lowest "On target at" a user can set: below it, almost any plate would pass. */
export const MIN_ON_TARGET_THRESHOLD = 50;

export const clampOnTargetThreshold = (n: number): number => Math.max(MIN_ON_TARGET_THRESHOLD, Math.min(100, Math.round(n)));

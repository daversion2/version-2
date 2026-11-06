import type {
  BuiltInGroupId,
  CustomFoodGroup,
  CustomGroupId,
  FoodGroupId,
  GroupScores,
  MealGoalId,
  MealsPrefs,
  MealsScoringWeights,
  NutrientId,
  WholeGroupId,
} from '../types/meals';

// =============================================================================
// MEALS — the food groups a plate is described with, and what each one covers.
//
// The user never decides what counts as whole or processed: they say what was
// on the plate, and services/mealsMath.ts works out the 0-100 score. So the
// examples here ARE the rules a user sees — keep them concrete.
//
// Two rules the guide states outright (founder, 2026-10-17):
//   - Ready-made food is one chip. A frozen pizza is Frozen & ready meals,
//     not Grains + Dairy + Veggies.
//   - Bacon, sausage, ham and deli meat are Processed meat, not Pork.
// Dairy sits "in between" by the founder's call — stricter than the NOVA
// research, where plain milk and yogurt count as minimally processed. Say so
// if the guide ever cites NOVA. Protein shakes and bars sit there too
// (founder, 2026-10-24); the id stays 'supplements' so saved days keep working.
//
// Every chip has a score, and a plate scores the average of its chips
// (founder, 2026-11-05). The scores come from the user's goal (MEAL_GOALS);
// they can change any of them in settings. Processed chips score the same in
// every goal: goals reorder real food, they never make junk food score well.
//
// Each group also carries the nutrients it's tagged with (NUTRIENTS below).
// Tags say a plate HAD protein, not how much — the honest reading of a chip.
//
// On top of these, a user can define their own foods (CustomFoodGroup in
// types/meals.ts): a name, a score and tags (founder, 2026-11-01). Every
// lookup below takes the user's list so a custom chip reads like any other.
// =============================================================================

/** Where a chip sits in the picker. Protein and Plants are the whole-food groups. */
export type FoodSection = 'protein' | 'plants' | 'between' | 'processed';

export const FOOD_SECTIONS: { id: FoodSection; label: string }[] = [
  { id: 'protein', label: 'Protein' },
  { id: 'plants', label: 'Plants' },
  { id: 'between', label: 'In between' },
  { id: 'processed', label: 'Processed' },
];

export interface FoodGroup<Id extends FoodGroupId = FoodGroupId> {
  id: Id;
  label: string;
  examples: string;
  section: FoodSection;
  /** No longer offered; still read and scored on plates that have it. */
  retired?: boolean;
  nutrients: NutrientId[];
}

/** Every built-in chip, in picker order within each section. */
export const FOOD_GROUPS: FoodGroup<BuiltInGroupId>[] = [
  { id: 'veggies', label: 'Veggies', section: 'plants', examples: 'broccoli, spinach, peppers, salad', nutrients: ['fiber'] },
  { id: 'fruit', label: 'Fruit', section: 'plants', examples: 'apples, berries, bananas', nutrients: ['fiber', 'carbs'] },
  { id: 'chicken', label: 'Chicken & turkey', section: 'protein', examples: 'chicken breast or thighs, turkey', nutrients: ['protein'] },
  { id: 'beef', label: 'Beef', section: 'protein', examples: 'steak, ground beef, roast', nutrients: ['protein'] },
  { id: 'pork', label: 'Pork', section: 'protein', examples: 'pork chops, tenderloin — not bacon or sausage', nutrients: ['protein'] },
  { id: 'eggs', label: 'Eggs', section: 'protein', examples: 'any way you cook them', nutrients: ['protein'] },
  // Healthy fats overcounts lean fish (cod, shrimp) — accepted, founder 2026-10-19.
  { id: 'fish', label: 'Fish & seafood', section: 'protein', examples: 'salmon, tuna, shrimp', nutrients: ['protein', 'fats'] },
  { id: 'legumes', label: 'Legumes', section: 'protein', examples: 'beans, lentils, chickpeas, tofu', nutrients: ['protein', 'fiber', 'carbs'] },
  {
    id: 'nuts',
    label: 'Nuts, seeds & avocado',
    section: 'plants',
    examples: 'almonds, walnuts, chia, nut butter, avocado, olives',
    nutrients: ['fiber', 'fats'],
  },
  // White rice, bread and pasta are Bread, pasta & tortillas.
  {
    id: 'grains',
    label: 'Whole grains & potatoes',
    section: 'plants',
    examples: 'oats, brown rice, quinoa, potatoes, sweet potatoes',
    nutrients: ['fiber', 'carbs'],
  },
  { id: 'dairy', label: 'Dairy', section: 'between', examples: 'milk, yogurt, cheese, cottage cheese', nutrients: ['protein'] },
  {
    id: 'supplements',
    label: 'Protein shake / bar',
    section: 'between',
    examples: 'protein shakes, protein powder, protein bars',
    nutrients: ['protein'],
  },
  { id: 'bread', label: 'Bread, pasta & tortillas', section: 'between', examples: 'bread, pasta, tortillas, white rice, bagels', nutrients: ['carbs'] },
  { id: 'sauces', label: 'Sauces & dressings', section: 'between', examples: 'jarred sauce, ketchup, mayo, bottled dressing', nutrients: [] },
  // Processed food tags nothing, even when the packet says "high protein".
  {
    id: 'ready_meals',
    label: 'Frozen & ready meals',
    section: 'processed',
    examples: 'frozen pizza, microwave meals, boxed mac & cheese, instant noodles',
    nutrients: [],
  },
  { id: 'processed_meat', label: 'Processed meat', section: 'processed', examples: 'bacon, sausage, ham, hot dogs, deli meat', nutrients: [] },
  { id: 'snacks', label: 'Chips & crackers', section: 'processed', examples: 'chips, crackers, pretzels, snack bars', nutrients: [] },
  { id: 'fast_food', label: 'Fast food & fried', section: 'processed', examples: 'burgers and fries, fried chicken, takeout pizza', nutrients: [] },
  { id: 'sweets', label: 'Sweets & desserts', section: 'processed', examples: 'candy, cookies, pastries, ice cream, sugary cereal', nutrients: [] },
  { id: 'sugary_drinks', label: 'Sugary drinks', section: 'processed', examples: 'soda, juice, sweet coffee drinks, energy drinks', nutrients: [] },
  { id: 'semi', label: 'Semi-processed', section: 'between', retired: true, examples: 'bread, pasta, tortillas, jarred sauce', nutrients: ['carbs'] },
  { id: 'processed', label: 'Processed', section: 'processed', retired: true, examples: 'chips, soda, candy, fast food', nutrients: [] },
];

/** The whole-food chips — Protein and Plants. Food-group goals and the servings heatmap use only these. */
export const WHOLE_GROUPS = FOOD_GROUPS.filter(
  (g): g is FoodGroup<WholeGroupId> => g.section === 'protein' || g.section === 'plants'
);

/** The chips offered in a section. A retired one shows only while it's on the plate, so it can be taken off. */
export const sectionGroups = (section: FoodSection, onPlate: FoodGroupId[] = []): FoodGroup<BuiltInGroupId>[] =>
  FOOD_GROUPS.filter((g) => g.section === section && (!g.retired || onPlate.includes(g.id)));

export const sectionOf = (id: FoodGroupId): FoodSection | undefined => FOOD_GROUPS.find((g) => g.id === id)?.section;

const ALL_GROUPS: FoodGroup[] = FOOD_GROUPS;

export const isCustomGroup = (id: FoodGroupId): id is CustomGroupId => id.startsWith('custom_');

/** A user's food by id, archived or not. */
export const findCustomGroup = (id: FoodGroupId, custom: CustomFoodGroup[] = []): CustomFoodGroup | undefined =>
  custom.find((g) => g.id === id);

/** A custom food nobody can find any more (never expected — removing one archives it) reads as this. */
const UNKNOWN_FOOD = 'Removed food';

export const groupLabel = (id: FoodGroupId, custom: CustomFoodGroup[] = []): string => {
  if (isCustomGroup(id)) return findCustomGroup(id, custom)?.label ?? UNKNOWN_FOOD;
  return ALL_GROUPS.find((g) => g.id === id)?.label ?? id;
};

export const isWholeGroup = (id: FoodGroupId): id is WholeGroupId => WHOLE_GROUPS.some((g) => g.id === id);

export const groupNutrients = (id: FoodGroupId, custom: CustomFoodGroup[] = []): NutrientId[] => {
  if (isCustomGroup(id)) return findCustomGroup(id, custom)?.nutrients ?? [];
  return ALL_GROUPS.find((g) => g.id === id)?.nutrients ?? [];
};

export interface Nutrient {
  id: NutrientId;
  label: string;
  /** Earned scoring.nutrient_bonus under the formula old days are scored by. Tags never change a chip score. */
  bonus: boolean;
}

/** In display order. */
export const NUTRIENTS: Nutrient[] = [
  { id: 'protein', label: 'Protein', bonus: true },
  { id: 'fiber', label: 'Fiber', bonus: true },
  { id: 'fats', label: 'Healthy fats', bonus: true },
  { id: 'carbs', label: 'Carbs', bonus: false },
];

/** The guide's rules, in the order a first-time user needs them. */
export const MEAL_GUIDE_RULES: string[] = [
  'Tap every group that was on the plate. Real servings only — the lettuce on a burger isn’t Veggies.',
  'Ready-made food is one chip. A frozen pizza is Frozen & ready meals, not Grains + Dairy + Veggies.',
  'Cooking basics don’t need a chip: oil, butter, salt, spices.',
  'Every chip has a score, shown on the chip. A plate scores the average of its chips.',
  'Your goal (in settings) sets the scores. Build muscle scores protein higher; Plant-forward scores plants higher. Processed food scores low in every goal.',
  'You can change any chip’s score in settings, and add your own foods with their own score.',
  'Protein, Fiber, Healthy fats and Carbs tags show what a plate had, not how much. They don’t change the score.',
];

// --- Why an off-target day happened -------------------------------------------
// Same internal / external split as data/skipReasons.ts — "It was me" vs "It
// was the day" — with reasons that fit eating rather than a skipped habit.

export interface MealOffReason {
  id: string;
  label: string;
  kind: 'internal' | 'external';
}

export const MEAL_OFF_REASONS: MealOffReason[] = [
  { id: 'craving', label: 'A craving won', kind: 'internal' },
  { id: 'stress', label: 'Stress', kind: 'internal' },
  { id: 'no_energy', label: 'Didn’t feel like cooking', kind: 'internal' },
  { id: 'no_plan', label: 'Didn’t plan ahead', kind: 'internal' },
  { id: 'ate_out', label: 'Ate out', kind: 'external' },
  { id: 'no_time', label: 'No time', kind: 'external' },
  { id: 'social', label: 'Social plans', kind: 'external' },
  { id: 'travel', label: 'Travel', kind: 'external' },
];

// --- Defaults ------------------------------------------------------------------

export const MAX_GROUP_GOALS = 3;
export const MAX_CUSTOM_GROUPS = 12;

export const DEFAULT_MEALS_SCORING: MealsScoringWeights = {
  ratio_points: 70,
  nutrient_bonus: 5,
  processed_penalty: 30,
  strict_penalty: 10,
  on_target_threshold: 70,
};

// --- Goals: each one a set of chip scores ---------------------------------------
// First draft (founder, 2026-11-05) — tune here. Processed chips share one set
// of scores across every goal, so no goal can make junk food score well.

const SHARED_SCORES: Pick<
  GroupScores,
  'ready_meals' | 'processed_meat' | 'snacks' | 'fast_food' | 'sweets' | 'sugary_drinks' | 'sauces' | 'semi' | 'processed'
> = {
  sauces: 40,
  ready_meals: 30,
  processed_meat: 25,
  snacks: 15,
  fast_food: 15,
  sweets: 10,
  sugary_drinks: 5,
  // Retired chips, for plates logged before they were split up.
  semi: 45,
  processed: 15,
};

export interface MealGoal {
  id: MealGoalId;
  label: string;
  blurb: string;
  scores: GroupScores;
}

export const MEAL_GOALS: MealGoal[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    blurb: 'Whole food first, with no food group favoured.',
    scores: {
      chicken: 80, beef: 75, pork: 75, eggs: 80, fish: 85, legumes: 85,
      veggies: 90, fruit: 80, nuts: 80, grains: 75,
      dairy: 60, supplements: 70, bread: 45,
      ...SHARED_SCORES,
    },
  },
  {
    id: 'muscle',
    label: 'Build muscle',
    blurb: 'Protein scores higher: meat, fish, eggs, legumes, nuts, dairy and shakes.',
    scores: {
      chicken: 90, beef: 85, pork: 85, eggs: 90, fish: 90, legumes: 90,
      veggies: 85, fruit: 75, nuts: 85, grains: 80,
      dairy: 75, supplements: 85, bread: 50,
      ...SHARED_SCORES,
    },
  },
  {
    id: 'plant',
    label: 'Plant-forward',
    blurb: 'Veggies, legumes, nuts and whole grains score higher; meat scores lower.',
    scores: {
      chicken: 65, beef: 55, pork: 55, eggs: 65, fish: 80, legumes: 95,
      veggies: 95, fruit: 85, nuts: 90, grains: 85,
      dairy: 50, supplements: 60, bread: 45,
      ...SHARED_SCORES,
    },
  },
];

export const DEFAULT_MEAL_GOAL: MealGoalId = 'balanced';

/** A goal by id; an unknown one reads as Balanced. */
export const mealGoal = (id: MealGoalId | undefined): MealGoal =>
  MEAL_GOALS.find((g) => g.id === id) ?? MEAL_GOALS[0];

export const DEFAULT_MEALS_PREFS: MealsPrefs = {
  goal: DEFAULT_MEAL_GOAL,
  score_overrides: {},
  group_goals: [],
  scoring: DEFAULT_MEALS_SCORING,
  custom_groups: [],
  linked_habit_ids: [],
};

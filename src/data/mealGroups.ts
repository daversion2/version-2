import type { FoodGroupId, MealsPrefs, NutrientId, ProcessedGroupId, WholeGroupId } from '../types/meals';

// =============================================================================
// MEALS — the food groups a plate is described with, and what each one covers.
//
// The user never decides what counts as whole or processed: they say what was
// on the plate, and services/mealsMath.ts works out pass or fail. So the
// examples here ARE the rules a user sees — keep them concrete.
//
// Two rules the guide states outright (founder, 2026-10-17):
//   - Ready-made food is one chip. A frozen pizza is Processed, not
//     Grains + Dairy + Veggies.
//   - Bacon, sausage, ham and deli meat are Processed, not Pork.
// Dairy is semi-processed for pass/fail by the founder's call — stricter than
// the NOVA research, where plain milk and yogurt count as minimally processed.
// Say so if the guide ever cites NOVA. It has its own chip (2026-10-19) so its
// protein isn't lost among the bread and pasta.
//
// Each group also carries the nutrients it's tagged with (NUTRIENTS below).
// Tags say a plate HAD protein, not how much — the honest reading of a chip.
// =============================================================================

export interface FoodGroup<Id extends FoodGroupId = FoodGroupId> {
  id: Id;
  label: string;
  examples: string;
  nutrients: NutrientId[];
}

export const WHOLE_GROUPS: FoodGroup<WholeGroupId>[] = [
  { id: 'veggies', label: 'Veggies', examples: 'broccoli, spinach, peppers, salad', nutrients: ['fiber'] },
  { id: 'fruit', label: 'Fruit', examples: 'apples, berries, bananas', nutrients: ['fiber'] },
  { id: 'chicken', label: 'Chicken & turkey', examples: 'chicken breast or thighs, turkey', nutrients: ['protein'] },
  { id: 'beef', label: 'Beef', examples: 'steak, ground beef, roast', nutrients: ['protein'] },
  { id: 'pork', label: 'Pork', examples: 'pork chops, tenderloin — not bacon or sausage', nutrients: ['protein'] },
  { id: 'eggs', label: 'Eggs', examples: 'any way you cook them', nutrients: ['protein'] },
  // Healthy fats overcounts lean fish (cod, shrimp) — accepted, founder 2026-10-19.
  { id: 'fish', label: 'Fish & seafood', examples: 'salmon, tuna, shrimp', nutrients: ['protein', 'fats'] },
  { id: 'legumes', label: 'Legumes', examples: 'beans, lentils, chickpeas', nutrients: ['protein', 'fiber'] },
  {
    id: 'nuts',
    label: 'Nuts, seeds & avocado',
    examples: 'almonds, walnuts, chia, nut butter, avocado, olives',
    nutrients: ['fiber', 'fats'],
  },
  // Always Fiber: refined rice and the like belong under Semi-processed anyway.
  { id: 'grains', label: 'Grains & starches', examples: 'rice, oats, quinoa, potatoes', nutrients: ['fiber'] },
];

export const PROCESSED_GROUPS: FoodGroup<ProcessedGroupId>[] = [
  {
    id: 'dairy',
    label: 'Dairy',
    examples: 'milk, yogurt, cheese, cottage cheese — counts as semi-processed',
    nutrients: ['protein'],
  },
  {
    id: 'semi',
    label: 'Semi-processed',
    examples: 'bread, pasta, tortillas, jarred sauce',
    nutrients: [],
  },
  {
    id: 'processed',
    label: 'Processed',
    examples: 'chips, soda, candy, fast food, frozen meals, cereal, protein bars, bacon, deli meat',
    // Nothing, even when the packet says "high protein".
    nutrients: [],
  },
];

const ALL_GROUPS: FoodGroup[] = [...WHOLE_GROUPS, ...PROCESSED_GROUPS];

export const groupLabel = (id: FoodGroupId): string => ALL_GROUPS.find((g) => g.id === id)?.label ?? id;

export const isWholeGroup = (id: FoodGroupId): id is WholeGroupId => WHOLE_GROUPS.some((g) => g.id === id);

export const groupNutrients = (id: FoodGroupId): NutrientId[] => ALL_GROUPS.find((g) => g.id === id)?.nutrients ?? [];

export interface Nutrient {
  id: NutrientId;
  label: string;
}

/** In display order. */
export const NUTRIENTS: Nutrient[] = [
  { id: 'protein', label: 'Protein' },
  { id: 'fiber', label: 'Fiber' },
  { id: 'fats', label: 'Healthy fats' },
];

/** The guide's rules, in the order a first-time user needs them. */
export const MEAL_GUIDE_RULES: string[] = [
  'Tap every group that was on the plate. Real servings only — the lettuce on a burger isn’t Veggies.',
  'Ready-made food is one chip. A frozen pizza is Processed, not Grains + Dairy + Veggies.',
  'Cooking basics don’t need a chip: oil, butter, salt, spices.',
  'A meal passes with at least one whole-food group and nothing Processed. Dairy and Semi-processed are fine alongside real food.',
  'Protein, Fiber and Healthy fats tags come from the groups on the plate. They say a plate had some, not how much.',
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
export const MAX_SLOTS = 8;

export const DEFAULT_MEALS_PREFS: MealsPrefs = {
  slots: [
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'dinner', name: 'Dinner' },
  ],
  pass_goal: 3,
  strict: false,
  group_goals: [],
  linked_habit_ids: [],
};

import type { FoodGroupId, MealsPrefs, ProcessedGroupId, WholeGroupId } from '../types/meals';

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
// Dairy sits under Semi-processed by the founder's call — stricter than the
// NOVA research, where plain milk and yogurt count as minimally processed. Say
// so if the guide ever cites NOVA.
// =============================================================================

export interface FoodGroup<Id extends FoodGroupId = FoodGroupId> {
  id: Id;
  label: string;
  examples: string;
}

export const WHOLE_GROUPS: FoodGroup<WholeGroupId>[] = [
  { id: 'veggies', label: 'Veggies', examples: 'broccoli, spinach, peppers, salad' },
  { id: 'fruit', label: 'Fruit', examples: 'apples, berries, bananas' },
  { id: 'chicken', label: 'Chicken & turkey', examples: 'chicken breast or thighs, turkey' },
  { id: 'beef', label: 'Beef', examples: 'steak, ground beef, roast' },
  { id: 'pork', label: 'Pork', examples: 'pork chops, tenderloin — not bacon or sausage' },
  { id: 'eggs', label: 'Eggs', examples: 'any way you cook them' },
  { id: 'fish', label: 'Fish & seafood', examples: 'salmon, tuna, shrimp' },
  { id: 'legumes', label: 'Legumes', examples: 'beans, lentils, chickpeas' },
  { id: 'nuts', label: 'Nuts & seeds', examples: 'almonds, walnuts, chia, nut butter' },
  { id: 'grains', label: 'Grains & starches', examples: 'rice, oats, quinoa, potatoes' },
];

export const PROCESSED_GROUPS: FoodGroup<ProcessedGroupId>[] = [
  {
    id: 'semi',
    label: 'Semi-processed',
    examples: 'dairy (milk, yogurt, cheese), bread, pasta, tortillas, jarred sauce',
  },
  {
    id: 'processed',
    label: 'Processed',
    examples: 'chips, soda, candy, fast food, frozen meals, cereal, protein bars, bacon, deli meat',
  },
];

const ALL_GROUPS: FoodGroup[] = [...WHOLE_GROUPS, ...PROCESSED_GROUPS];

export const groupLabel = (id: FoodGroupId): string => ALL_GROUPS.find((g) => g.id === id)?.label ?? id;

export const isWholeGroup = (id: FoodGroupId): id is WholeGroupId => WHOLE_GROUPS.some((g) => g.id === id);

/** The guide's rules, in the order a first-time user needs them. */
export const MEAL_GUIDE_RULES: string[] = [
  'Tap every group that was on the plate. Real servings only — the lettuce on a burger isn’t Veggies.',
  'Ready-made food is one chip. A frozen pizza is Processed, not Grains + Dairy + Veggies.',
  'Cooking basics don’t need a chip: oil, butter, salt, spices.',
  'A meal passes with at least one whole-food group and nothing Processed. Semi-processed is fine alongside real food.',
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

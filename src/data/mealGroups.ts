import type { CustomFoodGroup, CustomGroupId, FoodGroupId, MealsPrefs, MealsScoringWeights, NutrientId, ProcessedGroupId, WholeGroupId } from '../types/meals';

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
// Supplements (protein bars, shakes, powder) are semi-processed too, same
// reasoning and same chip treatment (founder, 2026-10-24) — not whole food,
// but not lumped in with chips and soda either. Shown as "Protein shake"
// (2026-11-01); the id stays 'supplements' so saved days keep working. A
// shake on its own scores exactly on target — see isShakeOnly in mealsMath.
//
// Each group also carries the nutrients it's tagged with (NUTRIENTS below).
// Tags say a plate HAD protein, not how much — the honest reading of a chip.
//
// On top of these, a user can define their own foods (CustomFoodGroup in
// types/meals.ts): a name, a score and tags (founder, 2026-11-01). Every
// lookup below takes the user's list so a custom chip reads like any other.
// =============================================================================

export interface FoodGroup<Id extends FoodGroupId = FoodGroupId> {
  id: Id;
  label: string;
  examples: string;
  nutrients: NutrientId[];
}

export const WHOLE_GROUPS: FoodGroup<WholeGroupId>[] = [
  { id: 'veggies', label: 'Veggies', examples: 'broccoli, spinach, peppers, salad', nutrients: ['fiber'] },
  { id: 'fruit', label: 'Fruit', examples: 'apples, berries, bananas', nutrients: ['fiber', 'carbs'] },
  { id: 'chicken', label: 'Chicken & turkey', examples: 'chicken breast or thighs, turkey', nutrients: ['protein'] },
  { id: 'beef', label: 'Beef', examples: 'steak, ground beef, roast', nutrients: ['protein'] },
  { id: 'pork', label: 'Pork', examples: 'pork chops, tenderloin — not bacon or sausage', nutrients: ['protein'] },
  { id: 'eggs', label: 'Eggs', examples: 'any way you cook them', nutrients: ['protein'] },
  // Healthy fats overcounts lean fish (cod, shrimp) — accepted, founder 2026-10-19.
  { id: 'fish', label: 'Fish & seafood', examples: 'salmon, tuna, shrimp', nutrients: ['protein', 'fats'] },
  { id: 'legumes', label: 'Legumes', examples: 'beans, lentils, chickpeas', nutrients: ['protein', 'fiber', 'carbs'] },
  {
    id: 'nuts',
    label: 'Nuts, seeds & avocado',
    examples: 'almonds, walnuts, chia, nut butter, avocado, olives',
    nutrients: ['fiber', 'fats'],
  },
  // Always Fiber: refined rice and the like belong under Semi-processed anyway.
  { id: 'grains', label: 'Grains & starches', examples: 'rice, oats, quinoa, potatoes', nutrients: ['fiber', 'carbs'] },
];

export const PROCESSED_GROUPS: FoodGroup<ProcessedGroupId>[] = [
  {
    id: 'dairy',
    label: 'Dairy',
    examples: 'milk, yogurt, cheese, cottage cheese — counts as semi-processed',
    nutrients: ['protein'],
  },
  {
    id: 'supplements',
    label: 'Protein shake',
    examples: 'protein shakes, protein powder, protein bars — on its own it counts as on target',
    nutrients: ['protein'],
  },
  {
    id: 'semi',
    label: 'Semi-processed',
    examples: 'bread, pasta, tortillas, jarred sauce',
    nutrients: ['carbs'],
  },
  {
    id: 'processed',
    label: 'Processed',
    examples: 'chips, soda, candy, fast food, frozen meals, cereal, bacon, deli meat',
    // Nothing, even when the packet says "high protein".
    nutrients: [],
  },
];

const ALL_GROUPS: FoodGroup[] = [...WHOLE_GROUPS, ...PROCESSED_GROUPS];

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
  /** Earns scoring.nutrient_bonus when a plate has it. Carbs doesn't — it's shown, not scored. */
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
  'Ready-made food is one chip. A frozen pizza is Processed, not Grains + Dairy + Veggies.',
  'Cooking basics don’t need a chip: oil, butter, salt, spices.',
  'Each plate scores 0 to 100. More whole food and fewer other groups scores higher — that ratio is most of the score.',
  'Protein, Fiber and Healthy fats tags add a little on top. They say a plate had some, not how much. Carbs is shown but adds nothing.',
  'Processed costs points beyond just being on the plate. Strict mode (in settings) makes Dairy, Semi-processed and Protein shake cost extra too.',
  'A protein shake on its own counts as an on-target meal. Mixed with food, it counts as semi-processed.',
  'Your own foods (added in settings) score what you gave them. On their own that’s the plate’s score; with other food, each one is a share of the plate at its score.',
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
export const MAX_CUSTOM_GROUPS = 12;

export const DEFAULT_MEALS_SCORING: MealsScoringWeights = {
  ratio_points: 70,
  nutrient_bonus: 5,
  processed_penalty: 30,
  strict_penalty: 10,
  on_target_threshold: 70,
};

export const DEFAULT_MEALS_PREFS: MealsPrefs = {
  slots: [
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'dinner', name: 'Dinner' },
  ],
  strict: false,
  group_goals: [],
  scoring: DEFAULT_MEALS_SCORING,
  custom_groups: [],
  linked_habit_ids: [],
};

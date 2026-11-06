import type {
  BuiltInGroupId,
  ChipProfile,
  CustomFoodGroup,
  CustomGroupId,
  FoodGroupId,
  GoalWeights,
  MealGoalId,
  MealsModel,
  QualityId,
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
// (founder, 2026-11-05). A chip's score is worked out, not hand-picked: each
// group has a PROFILE (protein, fiber, vitamins & minerals, healthy fats,
// refined sugar/flour, processing, animal food) and each GOAL weights those
// qualities (services/mealsMath.ts chipBreakdown). A processing ceiling keeps
// ultra-processed food at 30 or under in every goal, so no goal can make junk
// food score well. Users can still change any chip's final score in settings.
//
// Each group also carries the nutrients it's tagged with (NUTRIENTS below).
// Tags say a plate HAD protein, not how much — the honest reading of a chip.
//
// On top of these, a user can define their own foods (CustomFoodGroup in
// types/meals.ts): a name, a score and tags (founder, 2026-11-01). Every
// lookup below takes the user's list so a custom chip reads like any other.
// =============================================================================

/**
 * Where a chip sits in the picker: by plate portion — a palm of protein, a
 * fist of veggies, a cupped hand of carbs, a thumb of fats — plus mixed
 * takeout (founder, 2026-11-05). Processed food sits where its macros put it
 * (bacon under Protein, soda under Carbs); its score says the rest.
 */
export type FoodSection = 'protein' | 'produce' | 'carbs' | 'fats' | 'mixed';

export const FOOD_SECTIONS: { id: FoodSection; label: string }[] = [
  { id: 'protein', label: 'Protein' },
  { id: 'produce', label: 'Veggies & fruit' },
  { id: 'carbs', label: 'Carbs' },
  { id: 'fats', label: 'Fats' },
  { id: 'mixed', label: 'Takeout & ready meals' },
];

export interface FoodGroup<Id extends FoodGroupId = FoodGroupId> {
  id: Id;
  label: string;
  examples: string;
  section: FoodSection;
  /** What the typical food in the group brings — the score is worked out from it. */
  profile: ChipProfile;
  /** No longer offered; still read and scored on plates that have it. */
  retired?: boolean;
  nutrients: NutrientId[];
}

/** protein, fiber, vitamins & minerals, healthy fats, refined, processing, animal. */
const P = (protein: number, fiber: number, micros: number, fats: number, refined: number, processing: number, animal: number): ChipProfile =>
  ({ protein, fiber, micros, fats, refined, processing, animal });

/** Every built-in chip, in picker order within each section. Profiles: first draft, founder-approved 2026-11-05. */
export const FOOD_GROUPS: FoodGroup<BuiltInGroupId>[] = [
  { id: 'veggies', label: 'Veggies', section: 'produce', examples: 'broccoli, spinach, peppers, salad', nutrients: ['fiber'], profile: P(0, 3, 3, 0, 0, 0, 0) },
  { id: 'fruit', label: 'Fruit', section: 'produce', examples: 'apples, berries, bananas', nutrients: ['fiber', 'carbs'], profile: P(0, 2, 3, 0, 0, 0, 0) },
  { id: 'chicken', label: 'Chicken & turkey', section: 'protein', examples: 'chicken breast or thighs, turkey', nutrients: ['protein'], profile: P(3, 0, 1, 0, 0, 0, 1) },
  { id: 'beef', label: 'Beef', section: 'protein', examples: 'steak, ground beef, roast', nutrients: ['protein'], profile: P(3, 0, 2, 0, 0, 0, 2) },
  { id: 'pork', label: 'Pork', section: 'protein', examples: 'pork chops, tenderloin — not bacon or sausage', nutrients: ['protein'], profile: P(3, 0, 1, 0, 0, 0, 2) },
  // Healthy fats overcounts lean fish (cod, shrimp) — accepted, founder 2026-10-19.
  { id: 'fish', label: 'Fish & seafood', section: 'protein', examples: 'salmon, tuna, shrimp', nutrients: ['protein', 'fats'], profile: P(3, 0, 2, 3, 0, 0, 1) },
  { id: 'eggs', label: 'Eggs', section: 'protein', examples: 'any way you cook them', nutrients: ['protein'], profile: P(3, 0, 2, 1, 0, 0, 1) },
  // Under Protein, where a muscle-focused or vegetarian user looks; they bring carbs and fiber too.
  { id: 'legumes', label: 'Legumes', section: 'protein', examples: 'beans, lentils, chickpeas, tofu', nutrients: ['protein', 'fiber', 'carbs'], profile: P(2, 3, 3, 0, 0, 0, 0) },
  {
    id: 'supplements',
    label: 'Protein shake / bar',
    section: 'protein',
    examples: 'protein shakes, protein powder, protein bars',
    nutrients: ['protein'],
    profile: P(3, 0, 1, 0, 0, 1, 1),
  },
  // Processed food tags nothing, even when the packet says "high protein".
  { id: 'processed_meat', label: 'Processed meat', section: 'protein', examples: 'bacon, sausage, ham, hot dogs, deli meat', nutrients: [], profile: P(2, 0, 0, 0, 0, 3, 2) },
  {
    id: 'grains',
    label: 'Whole grains & potatoes',
    section: 'carbs',
    examples: 'oats, brown rice, quinoa, potatoes, sweet potatoes',
    nutrients: ['fiber', 'carbs'],
    profile: P(1, 2, 2, 0, 0, 0, 0),
  },
  { id: 'bread', label: 'Bread, pasta & white rice', section: 'carbs', examples: 'bread, pasta, tortillas, white rice, bagels', nutrients: ['carbs'], profile: P(0, 1, 1, 0, 1, 2, 0) },
  { id: 'snacks', label: 'Chips & crackers', section: 'carbs', examples: 'chips, crackers, pretzels, snack bars', nutrients: [], profile: P(0, 0, 0, 0, 2, 3, 0) },
  { id: 'sweets', label: 'Sweets & desserts', section: 'carbs', examples: 'candy, cookies, pastries, ice cream, sugary cereal', nutrients: [], profile: P(0, 0, 0, 0, 3, 3, 0) },
  { id: 'sugary_drinks', label: 'Sugary drinks', section: 'carbs', examples: 'soda, juice, sweet coffee drinks, energy drinks', nutrients: [], profile: P(0, 0, 0, 0, 3, 3, 0) },
  {
    id: 'nuts',
    label: 'Nuts, seeds & avocado',
    section: 'fats',
    examples: 'almonds, walnuts, chia, nut butter, avocado, olives',
    nutrients: ['fiber', 'fats'],
    profile: P(1, 2, 2, 3, 0, 0, 0),
  },
  // Not a high-protein food: under Fats, protein 1, vitamins & minerals 1, no tags (founder, 2026-11-05).
  { id: 'dairy', label: 'Dairy', section: 'fats', examples: 'milk, yogurt, cheese, cottage cheese', nutrients: [], profile: P(1, 0, 1, 0, 0, 1, 1) },
  { id: 'sauces', label: 'Sauces & dressings', section: 'fats', examples: 'jarred sauce, ketchup, mayo, bottled dressing', nutrients: [], profile: P(0, 0, 0, 1, 1, 2, 0) },
  { id: 'fast_food', label: 'Fast food & fried', section: 'mixed', examples: 'burgers and fries, fried chicken, takeout pizza', nutrients: [], profile: P(1, 0, 0, 0, 2, 3, 1) },
  {
    id: 'ready_meals',
    label: 'Frozen & ready meals',
    section: 'mixed',
    examples: 'frozen pizza, microwave meals, boxed mac & cheese, instant noodles',
    nutrients: [],
    profile: P(1, 0, 1, 0, 1, 3, 0),
  },
  { id: 'semi', label: 'Semi-processed', section: 'carbs', retired: true, examples: 'bread, pasta, tortillas, jarred sauce', nutrients: ['carbs'], profile: P(0, 1, 1, 0, 1, 2, 0) },
  { id: 'processed', label: 'Processed', section: 'mixed', retired: true, examples: 'chips, soda, candy, fast food', nutrients: [], profile: P(0, 0, 0, 0, 2, 3, 0) },
];

/**
 * The whole-food chips: nothing processed about them. Food-group goals and
 * the servings heatmap use only these.
 */
export const WHOLE_GROUPS = FOOD_GROUPS.filter((g): g is FoodGroup<WholeGroupId> => g.profile.processing === 0);

/** The chips offered in a section. A retired one shows only while it's on the plate, so it can be taken off. */
export const sectionGroups = (section: FoodSection, onPlate: FoodGroupId[] = []): FoodGroup<BuiltInGroupId>[] =>
  FOOD_GROUPS.filter((g) => g.section === section && (!g.retired || onPlate.includes(g.id)));

/** A built-in chip's processing rating (0 whole … 3 ultra-processed); undefined for the user's own foods. */
export const processingOf = (id: FoodGroupId): number | undefined =>
  FOOD_GROUPS.find((g) => g.id === id)?.profile.processing;

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
  'A chip’s score comes from what that food brings: protein, fiber, vitamins & minerals and healthy fats add points; refined sugar or flour and processing take them away.',
  'Your goal (in settings) decides how much each counts. Ultra-processed food is capped low in every goal.',
  'You can change any chip’s score in settings, and add your own foods with their own score.',
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

// --- Scoring a chip from its profile -----------------------------------------------
// score = SCORE_BASE + Σ rating × weight (positives) − Σ rating × weight
// (penalties), clamped to 0-100, then capped by the chip's processing level.

export interface Quality {
  id: QualityId;
  label: string;
  /** Adds points, or takes them away. */
  kind: 'plus' | 'minus';
  /** Highest rating. */
  max: number;
}

export const QUALITIES: Quality[] = [
  { id: 'protein', label: 'Protein', kind: 'plus', max: 3 },
  { id: 'fiber', label: 'Fiber', kind: 'plus', max: 3 },
  { id: 'micros', label: 'Vitamins & minerals', kind: 'plus', max: 3 },
  { id: 'fats', label: 'Healthy fats', kind: 'plus', max: 3 },
  { id: 'refined', label: 'Refined sugar or flour', kind: 'minus', max: 3 },
  { id: 'processing', label: 'Processing', kind: 'minus', max: 3 },
  { id: 'animal', label: 'Animal food', kind: 'minus', max: 2 },
];

/** Where every chip starts. */
export const SCORE_BASE = 50;

/**
 * The most a chip can score at each processing level (whole, lightly
 * processed, processed, ultra-processed), in every goal. It's what keeps
 * processed meat low for Build muscle, where protein alone would lift it.
 */
export const PROCESSING_CEILINGS = [100, 90, 60, 30] as const;

// --- Goals: each one a set of weights ------------------------------------------------
// First draft (founder, 2026-11-05). Tune in the Meals Scoring Model page
// (https://claude.ai/artifact/L42C47AuSGJGUjuDwxR2wW).

export interface MealGoal {
  id: MealGoalId;
  label: string;
  blurb: string;
  weights: GoalWeights;
}

export const MEAL_GOALS: MealGoal[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    blurb: 'Protein, fiber, vitamins & minerals and healthy fats all count.',
    weights: { protein: 5, fiber: 5, micros: 7, fats: 4, refined: 6, processing: 10, animal: 0 },
  },
  {
    id: 'muscle',
    label: 'Build muscle',
    blurb: 'Protein counts most: meat, fish, eggs, legumes, dairy and shakes score higher.',
    weights: { protein: 10, fiber: 3, micros: 5, fats: 3, refined: 6, processing: 8, animal: 0 },
  },
  {
    id: 'plant',
    label: 'Plant-forward',
    blurb: 'Fiber and vitamins & minerals count most; animal food costs points.',
    weights: { protein: 4, fiber: 7, micros: 7, fats: 4, refined: 6, processing: 10, animal: 10 },
  },
];

/**
 * The model the app ships with: the profiles, weights, start and caps above.
 * Admin → Meals scoring can replace it for everyone (services/mealsModel.ts);
 * this is the fallback and the "Reset to built-in" source.
 */
export const BUILT_IN_MEALS_MODEL: MealsModel = {
  base: SCORE_BASE,
  ceilings: [...PROCESSING_CEILINGS],
  weights: Object.fromEntries(MEAL_GOALS.map((g) => [g.id, g.weights])) as Record<MealGoalId, GoalWeights>,
  profiles: Object.fromEntries(FOOD_GROUPS.map((g) => [g.id, g.profile])) as MealsModel['profiles'],
};

/** Realistic plates for previewing a change to the model (Admin → Meals scoring). */
export const SAMPLE_PLATES: { name: string; groups: BuiltInGroupId[] }[] = [
  { name: 'Eggs and berries', groups: ['eggs', 'fruit'] },
  { name: 'Oatmeal with berries and walnuts', groups: ['grains', 'fruit', 'nuts'] },
  { name: 'Greek yogurt with berries', groups: ['dairy', 'fruit'] },
  { name: 'Bagel with cream cheese', groups: ['bread', 'dairy'] },
  { name: 'Bacon and eggs', groups: ['processed_meat', 'eggs'] },
  { name: 'Protein shake', groups: ['supplements'] },
  { name: 'Protein shake with a banana', groups: ['supplements', 'fruit'] },
  { name: 'Turkey sandwich', groups: ['chicken', 'bread'] },
  { name: 'Chicken salad with dressing', groups: ['chicken', 'veggies', 'sauces'] },
  { name: 'Burrito bowl', groups: ['chicken', 'legumes', 'grains', 'veggies'] },
  { name: 'Salmon, white rice and greens', groups: ['fish', 'bread', 'veggies'] },
  { name: 'Steak and potatoes', groups: ['beef', 'grains'] },
  { name: 'Steak, potatoes and broccoli', groups: ['beef', 'grains', 'veggies'] },
  { name: 'Pork chop with veggies', groups: ['pork', 'veggies'] },
  { name: 'Lentil curry with brown rice', groups: ['legumes', 'veggies', 'grains'] },
  { name: 'Tofu stir-fry with bottled sauce', groups: ['legumes', 'veggies', 'grains', 'sauces'] },
  { name: 'Spaghetti with meat sauce', groups: ['bread', 'beef', 'sauces'] },
  { name: 'Apple and peanut butter', groups: ['fruit', 'nuts'] },
  { name: 'Cheese and crackers', groups: ['dairy', 'snacks'] },
  { name: 'Frozen pizza with a side salad', groups: ['ready_meals', 'veggies'] },
  { name: 'Drive-through combo and a soda', groups: ['fast_food', 'sugary_drinks'] },
  { name: 'Bag of chips', groups: ['snacks'] },
  { name: 'Ice cream', groups: ['sweets'] },
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

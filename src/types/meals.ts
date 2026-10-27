// =============================================================================
// Meals (Lab mini-app) — rate each meal by tapping the food groups on the plate;
// the app works out pass or fail. Stored under users/{uid}/lab_meals_*. See
// services/labMeals.ts (storage) and services/mealsMath.ts (the rules).
// =============================================================================

export type WholeGroupId =
  | 'veggies'
  | 'fruit'
  | 'chicken'
  | 'beef'
  | 'pork'
  | 'eggs'
  | 'fish'
  | 'legumes'
  | 'nuts'
  | 'grains';

/**
 * Dairy and Supplements are their own chips so their protein can be told apart
 * from bread and pasta, but for pass/fail they are semi-processed (founder,
 * 2026-10-19 for dairy; 2026-10-24 for supplements).
 */
export type ProcessedGroupId = 'dairy' | 'supplements' | 'semi' | 'processed';

export type FoodGroupId = WholeGroupId | ProcessedGroupId;

/** What a plate can be tagged with, inferred from its food groups — never grams. */
export type NutrientId = 'protein' | 'fiber' | 'fats';

/** One of the user's own meals ("Breakfast", "Pre-workout"). The id never changes. */
export interface MealSlot {
  id: string;
  name: string;
}

/** "Veggies at 2 meals a day" / "Fish 2 times a week". Only whole-food groups. */
export interface GroupGoal {
  id: string;
  group: WholeGroupId;
  count: number;
  period: 'day' | 'week';
}

/**
 * How a plate's 0-100 score is built, and what counts as "on target" for a
 * day. Admin-tunable from Meals Settings — the whole app is already
 * admin-only, so these live right alongside the rest of MealsPrefs rather
 * than behind a separate permission layer.
 */
export interface MealsScoringWeights {
  /** wholeFoodRatio (whole groups ÷ all groups tapped) * this. The dominant term. */
  ratio_points: number;
  /** Per nutrient tag the plate hits (protein/fiber/fats, 0-3), added on top. */
  nutrient_bonus: number;
  /** Flat deduction when 'processed' is on the plate — on top of the ratio dilution it already causes. */
  processed_penalty: number;
  /** Flat deduction, strict mode only, when dairy/semi/supplements are present. */
  strict_penalty: number;
  /** A day's average score at or above this counts as "on target". */
  on_target_threshold: number;
}

/** What a day is scored against. Snapshotted onto each day so editing settings never rescores the past. */
export interface MealsRules {
  slots: MealSlot[];
  /** Strict: dairy/semi/supplements cost `scoring.strict_penalty` instead of only diluting the ratio. */
  strict: boolean;
  group_goals: GroupGoal[];
  scoring: MealsScoringWeights;
}

export interface MealsPrefs extends MealsRules {
  linked_habit_ids: string[];
  intro_seen?: boolean;
}

/** A logged meal: the groups on the plate, or "didn't eat" (never counts against the day). */
export type MealEntry =
  | { groups: FoodGroupId[]; logged_at: string; skipped?: undefined }
  | { skipped: true; logged_at: string; groups?: undefined };

/** "Something additional" — a snack or drink on top of the day's meals. */
export interface MealExtra {
  id: string;
  name?: string;
  groups: FoodGroupId[];
  logged_at: string;
}

/** One calendar day. Doc id = the local date. */
export interface MealsDay {
  date: string;
  /** By slot id. A slot with no entry is not logged yet. */
  meals: Record<string, MealEntry>;
  extras: MealExtra[];
  /** The rules this day is scored under — written with every save. */
  rules?: MealsRules;
  /** Set by "Close out the day". */
  closed_at?: string;
  result?: 'on' | 'off';
  /** MEAL_OFF_REASONS id, when an off-target day said why. */
  off_reason_id?: string;
  /** The habit an on-target close checked off. */
  habit_id?: string;
}

export type MealsStackParamList = {
  /** No date = today. */
  MealsDay: { date?: string } | undefined;
  MealsWeek: undefined;
  MealsClose: undefined;
  MealsSettings: undefined;
  MealsGuide: undefined;
};

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

export type ProcessedGroupId = 'semi' | 'processed';

export type FoodGroupId = WholeGroupId | ProcessedGroupId;

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

/** What a day is scored against. Snapshotted onto each day so editing settings never rescores the past. */
export interface MealsRules {
  slots: MealSlot[];
  /** How many of the slots must pass. The rest are the misses the day can hold. */
  pass_goal: number;
  /** Strict: a pass is whole food only — no Semi-processed either. */
  strict: boolean;
  group_goals: GroupGoal[];
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

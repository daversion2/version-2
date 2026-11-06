// =============================================================================
// Meals (Lab mini-app) — rate each meal by tapping the food groups on the plate;
// the app scores it 0-100. Stored under users/{uid}/lab_meals_*. See
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
 * from bread and pasta, but for scoring they are semi-processed (founder,
 * 2026-10-19 for dairy; 2026-10-24 for supplements).
 */
export type ProcessedGroupId = 'dairy' | 'supplements' | 'semi' | 'processed';

/** One of the user's own foods (see CustomFoodGroup). The prefix keeps it apart from the built-in ids. */
export type CustomGroupId = `custom_${string}`;

export type FoodGroupId = WholeGroupId | ProcessedGroupId | CustomGroupId;

/**
 * What a plate can be tagged with, inferred from its food groups — never grams.
 * Carbs is information only: it adds no points (founder, 2026-11-01).
 */
export type NutrientId = 'protein' | 'fiber' | 'fats' | 'carbs';

/**
 * A food the user defines ("Carb supplement", 80, Carbs). On its own a plate
 * of it scores `score`; mixed with other food it counts as one share of the
 * plate at that score (services/mealsMath.ts scorePlate). Removing one only
 * archives it, so days already logged with it keep their name and score.
 */
export interface CustomFoodGroup {
  id: CustomGroupId;
  label: string;
  /** 0-100. */
  score: number;
  nutrients: NutrientId[];
  archived?: boolean;
}

/**
 * Before 2026-11-05 the user set up named meals ("Breakfast", "Pre-workout")
 * and a day was done once each was logged. Only read now, to name the plates
 * of days saved back then (mealsMath.ts platesOf).
 */
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
 * day. The weights are admin-tunable from Meals Settings (shown to is_admin
 * accounts only, now the app is live for everyone); `on_target_threshold` is
 * the user's own, never below MIN_ON_TARGET_THRESHOLD (services/mealsMath.ts).
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
  /** Legacy: only on days saved before 2026-11-05 — see MealSlot. */
  slots?: MealSlot[];
  /** Strict: dairy/semi/supplements cost `scoring.strict_penalty` instead of only diluting the ratio. */
  strict: boolean;
  group_goals: GroupGoal[];
  scoring: MealsScoringWeights;
  /** The user's own foods, archived ones included. Missing on days saved before they existed. */
  custom_groups?: CustomFoodGroup[];
}

export interface MealsPrefs extends MealsRules {
  linked_habit_ids: string[];
  intro_seen?: boolean;
  /** Days logged a week, the ring on Today. Absent = DEFAULT_APP_WEEKLY_GOALS. */
  weekly_goal?: number;
}

/**
 * One plate: a meal, a snack or a drink. There is no list of meals to fill in;
 * the user logs what they ate, when they ate it (founder, 2026-11-05).
 */
export interface MealPlate {
  id: string;
  /** "Breakfast", "Pre-workout shake". Optional. */
  name?: string;
  groups: FoodGroupId[];
  /** When it was first logged. Editing the plate keeps it. */
  logged_at: string;
}

/** Legacy: a slot's entry on a day saved before 2026-11-05. */
export type MealEntry =
  | { groups: FoodGroupId[]; logged_at: string; skipped?: undefined }
  | { skipped: true; logged_at: string; groups?: undefined };

/**
 * One calendar day. Doc id = the local date. A day is settled once it's
 * closed out, or on its own at midnight (mealsMath.ts isSettled).
 */
export interface MealsDay {
  date: string;
  /** In the order they were logged. */
  plates: MealPlate[];
  /** Legacy, by slot id: days saved before 2026-11-05. Read through platesOf, never written. */
  meals?: Record<string, MealEntry>;
  /** Legacy snacks and drinks: days saved before 2026-11-05. Read through platesOf, never written. */
  extras?: MealPlate[];
  /** The rules this day is scored under — written with every save. */
  rules?: MealsRules;
  /** Set by "Close out the day". A day nobody closes settles at midnight without it. */
  closed_at?: string;
  /** Absent on a closed day with no plates — it counts neither way. */
  result?: 'on' | 'off';
  /** MEAL_OFF_REASONS id, when an off-target day said why. */
  off_reason_id?: string;
  /** The habit an on-target close checked off. */
  habit_id?: string;
  /**
   * When an on-target close handed this day to Today for its rating. Set once
   * and kept through a reopen, so a day is only ever rated once.
   */
  handed_off_at?: string;
}

export type MealsStackParamList = {
  /** No date = today. */
  MealsDay: { date?: string } | undefined;
  MealsWeek: undefined;
  MealsClose: undefined;
  MealsSettings: undefined;
  MealsGuide: undefined;
};

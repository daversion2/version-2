// =============================================================================
// Meals (Lab mini-app) — rate each meal by tapping the food groups on the plate;
// every chip has a score and the plate scores their average. Stored under
// users/{uid}/lab_meals_*. See services/labMeals.ts (storage),
// services/mealsMath.ts (the rules) and data/mealGroups.ts (chips and scores).
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

/** Real food with some processing. 'supplements' is the Protein shake / bar chip. */
export type InBetweenGroupId = 'dairy' | 'supplements' | 'bread' | 'sauces';

/** Processed food, one chip per kind, so the user names what they ate rather than judging it. */
export type ProcessedGroupId = 'ready_meals' | 'processed_meat' | 'snacks' | 'fast_food' | 'sweets' | 'sugary_drinks';

/**
 * Semi-processed and Processed, retired 2026-11-05 when the processed side
 * split into its own chips. No longer offered, but still read on old plates.
 */
export type RetiredGroupId = 'semi' | 'processed';

export type BuiltInGroupId = WholeGroupId | InBetweenGroupId | ProcessedGroupId | RetiredGroupId;

/** One of the user's own foods (see CustomFoodGroup). The prefix keeps it apart from the built-in ids. */
export type CustomGroupId = `custom_${string}`;

export type FoodGroupId = BuiltInGroupId | CustomGroupId;

/** Every built-in chip's 0-100 score. */
export type GroupScores = Record<BuiltInGroupId, number>;

/**
 * What the user eats for. Each goal is a set of weights over the food groups'
 * profiles (data/mealGroups.ts MEAL_GOALS), from which every chip's score is
 * worked out (services/mealsMath.ts goalScores). Named as eating styles, not
 * health outcomes (founder, 2026-11-05).
 */
export type MealGoalId = 'balanced' | 'muscle' | 'plant';

/**
 * What a food group's profile rates. The first four add points, the last
 * three take them away. Each is rated for the TYPICAL food in the group.
 */
export type QualityId = 'protein' | 'fiber' | 'micros' | 'fats' | 'refined' | 'processing' | 'animal';

/**
 * A food group's profile: 0-3 per quality ('animal' 0-2). Processing:
 * 0 whole · 1 lightly processed · 2 processed · 3 ultra-processed.
 */
export type ChipProfile = Record<QualityId, number>;

/** Points per rating point, per quality: added for the first four, subtracted for the rest. */
export type GoalWeights = Record<QualityId, number>;

/**
 * Everything a chip's score is worked out from. The app ships one
 * (data/mealGroups.ts BUILT_IN_MEALS_MODEL); an admin can replace it for
 * everyone from Admin → Meals scoring, stored at config/mealsModel
 * (services/mealsModel.ts).
 */
export interface MealsModel {
  /** Where every chip starts. */
  base: number;
  /** The most a chip can score at processing 0, 1, 2 and 3. */
  ceilings: [number, number, number, number];
  weights: Record<MealGoalId, GoalWeights>;
  profiles: Record<BuiltInGroupId, ChipProfile>;
}

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
 * What counts as "on target" for a day: `on_target_threshold`, the user's own,
 * never below MIN_ON_TARGET_THRESHOLD (services/mealsMath.ts). The other four
 * are the formula plates were scored by before chip scores (2026-11-05); only
 * days saved back then still use them.
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
  /**
   * Each chip's score: the goal's defaults with the user's own changes on top.
   * Absent on days saved before 2026-11-05, which are scored by the formula.
   */
  group_scores?: GroupScores;
  /** The goal those scores came from. */
  goal?: MealGoalId;
  /** Legacy: only on days saved before 2026-11-05 — see MealSlot. */
  slots?: MealSlot[];
  /** Legacy formula only: dairy/semi/supplements cost `scoring.strict_penalty`. */
  strict?: boolean;
  group_goals: GroupGoal[];
  scoring: MealsScoringWeights;
  /** The user's own foods, archived ones included. Missing on days saved before they existed. */
  custom_groups?: CustomFoodGroup[];
}

export interface MealsPrefs extends MealsRules {
  /** Absent = 'balanced'. */
  goal?: MealGoalId;
  /** Only the chips the user changed from their goal's defaults, so a retuned goal still reaches the rest. */
  score_overrides?: Partial<GroupScores>;
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
   * When this day was handed to Today for its rating — a close (on target or
   * off, since 2026-11-11), or Today's next-day catch-up for a day nobody
   * closed. Set once and kept through a reopen, so a day is only ever rated once.
   */
  handed_off_at?: string;
}

export type MealsStackParamList = {
  /** No date = today. */
  MealsDay: { date?: string } | undefined;
  MealsWeek: undefined;
  MealsClose: undefined;
  MealsSettings: undefined;
  MealsScores: undefined;
  MealsGuide: undefined;
};

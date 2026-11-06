/**
 * The Meals scoring model — food-group profiles, goal weights, the start and
 * the processing caps every chip's score is worked out from
 * (services/mealsMath.ts profileBreakdown). The app ships one
 * (BUILT_IN_MEALS_MODEL); an admin can replace it for everyone from
 * Admin → Meals scoring. Stored at config/mealsModel, which firestore.rules
 * lets every signed-in user read and only admins write.
 *
 * A missing, unreadable or slow document means the built-in model: Meals
 * always scores. A saved model only changes today and later — every day keeps
 * the chip scores it was saved with (MealsDay.rules.group_scores).
 */
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { BuiltInGroupId, FoodGroupId, MealGoalId, MealsModel, QualityId } from '../types/meals';
import { BUILT_IN_MEALS_MODEL, DEFAULT_MEALS_SCORING, FOOD_GROUPS, MEAL_GOALS, QUALITIES } from '../data/mealGroups';
import { goalScores } from './mealsMath';

const modelDocRef = () => doc(db, 'config', 'mealsModel');

/** The highest weight an admin can set. */
export const MAX_WEIGHT = 30;

const clampInt = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;

const qualityMax = (id: QualityId): number => QUALITIES.find((q) => q.id === id)?.max ?? 3;

/**
 * A model from whatever the document holds: every number brought into range,
 * anything missing or malformed taken from the built-in model, anything
 * unknown dropped. Never throws.
 */
export const sanitizeMealsModel = (raw: unknown): MealsModel => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const builtIn = BUILT_IN_MEALS_MODEL;
  const ceilings = builtIn.ceilings.map((c, i) => clampInt(data.ceilings?.[i], 0, 100, c)) as MealsModel['ceilings'];
  const weights = Object.fromEntries(
    MEAL_GOALS.map((g) => [
      g.id,
      Object.fromEntries(
        QUALITIES.map((q) => [q.id, clampInt(data.weights?.[g.id]?.[q.id], 0, MAX_WEIGHT, builtIn.weights[g.id][q.id])])
      ),
    ])
  ) as MealsModel['weights'];
  const profiles = Object.fromEntries(
    FOOD_GROUPS.map((g) => [
      g.id,
      Object.fromEntries(
        QUALITIES.map((q) => [q.id, clampInt(data.profiles?.[g.id]?.[q.id], 0, qualityMax(q.id), builtIn.profiles[g.id][q.id])])
      ),
    ])
  ) as MealsModel['profiles'];
  return { base: clampInt(data.base, 0, 100, builtIn.base), ceilings, weights, profiles };
};

/** The model everyone scores with: the saved one, or the built-in one. */
export const getMealsModel = async (): Promise<MealsModel> => {
  try {
    const snap = await getDoc(modelDocRef());
    return snap.exists() ? sanitizeMealsModel(snap.data()) : BUILT_IN_MEALS_MODEL;
  } catch (err) {
    console.warn('Meals model fetch failed — using the built-in model:', err);
    return BUILT_IN_MEALS_MODEL;
  }
};

/** getMealsModel, but never holding up a screen for more than `ms`. */
export const getMealsModelWithTimeout = (ms = 3000): Promise<MealsModel> =>
  Promise.race([
    getMealsModel(),
    new Promise<MealsModel>((resolve) => setTimeout(() => resolve(BUILT_IN_MEALS_MODEL), ms)),
  ]);

/** Admin only (firestore.rules): every user scores with this from their next open. */
export const saveMealsModel = async (model: MealsModel, userId: string): Promise<void> => {
  await setDoc(modelDocRef(), { ...sanitizeMealsModel(model), updated_at: new Date().toISOString(), updated_by: userId });
};

/** Admin only: back to the model the app ships with. */
export const resetMealsModel = async (): Promise<void> => {
  await deleteDoc(modelDocRef());
};

// --- Comparing models, for the admin screen ------------------------------------------

/** How many numbers differ between two models. */
export const modelChangeCount = (a: MealsModel, b: MealsModel): number => {
  let n = a.base === b.base ? 0 : 1;
  a.ceilings.forEach((c, i) => (n += c === b.ceilings[i] ? 0 : 1));
  for (const g of MEAL_GOALS) for (const q of QUALITIES) n += a.weights[g.id][q.id] === b.weights[g.id][q.id] ? 0 : 1;
  for (const f of FOOD_GROUPS) for (const q of QUALITIES) n += a.profiles[f.id][q.id] === b.profiles[f.id][q.id] ? 0 : 1;
  return n;
};

export interface PlatePreview {
  name: string;
  groups: BuiltInGroupId[];
  before: number;
  after: number;
}

const average = (groups: FoodGroupId[], scores: Record<string, number>): number => {
  const ids = [...new Set(groups)];
  return Math.round(ids.reduce((sum, id) => sum + (scores[id] ?? 0), 0) / ids.length);
};

/** Each plate's score under the live model and under the draft, for one goal. */
export const previewPlates = (
  plates: { name: string; groups: BuiltInGroupId[] }[],
  live: MealsModel,
  draft: MealsModel,
  goal: MealGoalId
): PlatePreview[] => {
  const before = goalScores(goal, live);
  const after = goalScores(goal, draft);
  return plates.map((p) => ({ ...p, before: average(p.groups, before), after: average(p.groups, after) }));
};

/** Plates at or above the default on-target line. */
export const onTargetCount = (scores: number[], threshold = DEFAULT_MEALS_SCORING.on_target_threshold): number =>
  scores.filter((s) => s >= threshold).length;

// --- Editing a draft (immutably; goalScores caches per model object) -----------------

export const withBase = (m: MealsModel, base: number): MealsModel => ({ ...m, base: clampInt(base, 0, 100, m.base) });

export const withCeiling = (m: MealsModel, level: number, value: number): MealsModel => ({
  ...m,
  ceilings: m.ceilings.map((c, i) => (i === level ? clampInt(value, 0, 100, c) : c)) as MealsModel['ceilings'],
});

export const withWeight = (m: MealsModel, goal: MealGoalId, quality: QualityId, value: number): MealsModel => ({
  ...m,
  weights: { ...m.weights, [goal]: { ...m.weights[goal], [quality]: clampInt(value, 0, MAX_WEIGHT, m.weights[goal][quality]) } },
});

export const withRating = (m: MealsModel, id: BuiltInGroupId, quality: QualityId, value: number): MealsModel => ({
  ...m,
  profiles: {
    ...m.profiles,
    [id]: { ...m.profiles[id], [quality]: clampInt(value, 0, qualityMax(quality), m.profiles[id][quality]) },
  },
});

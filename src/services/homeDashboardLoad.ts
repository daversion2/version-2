import type { CompletedMeditateSession } from '../types/meditate';
import type { CompletedWorkoutSession, Exercise, TrainingPhase, WeightUnit } from '../types/workouts';
import type { MealsDay, MealsRules } from '../types/meals';
import { addDays } from './homeDashboard';
import { clampWeeklyGoal } from './appCheckins';
import { getMeditatePrefs, listMeditateSessions } from './labMeditate';
import { getWorkoutPrefs, listCustomExercises, listPhases, listSessions, mergeExerciseLibrary } from './labWorkouts';
import { getMealsPrefs, listMealsDays } from './labMeals';
import { rulesOf } from './mealsMath';
import { currentPhase } from './trainingPhases';
import { getTodayString } from '../utils/date';

// The reads behind Today's numbers, shared by Today (old and redesigned) and
// the redesign's app pages. Pair it with the account's nudge logs and hand
// both to buildHomeDashboard (services/homeDashboard.ts).

/** Everything the dashboard reads apart from the check-in logs. */
export interface HomeAppData {
  today: string;
  meditateSessions: CompletedMeditateSession[];
  meditateGoal: number;
  workoutSessions: CompletedWorkoutSession[];
  workoutsGoal: number;
  exercisesById: Record<string, Exercise>;
  unit: WeightUnit;
  phase: TrainingPhase | undefined;
  mealsDays: Record<string, MealsDay>;
  mealsRules: MealsRules;
}

export const loadHomeAppData = async (uid: string): Promise<HomeAppData> => {
  const today = getTodayString();
  const [medSessions, medPrefs, wSessions, wPrefs, custom, phases, mealsPrefs, mealsDays] = await Promise.all([
    listMeditateSessions(uid, 1000),
    getMeditatePrefs(uid),
    listSessions(uid, 300),
    getWorkoutPrefs(uid),
    listCustomExercises(uid),
    listPhases(uid),
    getMealsPrefs(uid),
    listMealsDays(uid, addDays(today, -89), today),
  ]);
  return {
    today,
    meditateSessions: medSessions,
    meditateGoal: clampWeeklyGoal(medPrefs.weekly_goal, 'meditate'),
    workoutSessions: wSessions,
    workoutsGoal: clampWeeklyGoal(wPrefs.weekly_goal, 'workouts'),
    exercisesById: Object.fromEntries(mergeExerciseLibrary(custom).map((e) => [e.id, e])),
    unit: wPrefs.unit,
    phase: currentPhase(phases),
    mealsDays,
    mealsRules: rulesOf(mealsPrefs),
  };
};

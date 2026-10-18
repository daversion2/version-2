import {
  CompletedWorkoutSession,
  Equipment,
  Exercise,
  ExerciseKind,
  ExerciseRecord,
  MuscleGroup,
  WorkoutSession,
} from '../types/workouts';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '../data/workoutExercises';

// =============================================================================
// The exercise library, as the screens use it: what's pickable, what a search
// matches, whether a name is taken, and whether an exercise's logging type is
// still free to change. Pure — the Firestore side is services/labWorkouts.ts.
// =============================================================================

/** What the picker and My exercises show: everything not deleted, A–Z. */
export const activeExercises = (all: Exercise[]): Exercise[] =>
  all.filter((e) => !e.archived_at).sort((a, b) => a.name.localeCompare(b.name));

/**
 * A search matches the name, the equipment or the body part — "dumbbell"
 * finds every dumbbell move, "legs" every leg one.
 */
export const searchExercises = (exercises: Exercise[], term: string): Exercise[] => {
  const t = term.trim().toLowerCase();
  if (!t) return exercises;
  return exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(t) ||
      (!!e.equipment && EQUIPMENT_LABELS[e.equipment].toLowerCase().includes(t)) ||
      MUSCLE_GROUP_LABELS[e.muscle].toLowerCase().includes(t)
  );
};

/**
 * Has this exercise ever been logged? Then its kind is locked: a set stored as
 * weight × reps can't be re-read as a timed hold. Records cover every finished
 * session (one is written for each exercise logged), so this holds even past
 * the history window; the open session covers sets not yet saved.
 */
export const isExerciseUsed = (
  exerciseId: string,
  ctx: {
    records: Record<string, ExerciseRecord>;
    sessions: CompletedWorkoutSession[];
    session?: WorkoutSession | null;
  }
): boolean =>
  !!ctx.records[exerciseId] ||
  ctx.sessions.some((s) => s.blocks.some((b) => b.sets.some((x) => x.exerciseId === exerciseId))) ||
  !!ctx.session?.blocks.some((b) => b.sets.some((x) => x.exerciseId === exerciseId));

export interface ExerciseDraft {
  name: string;
  kind: ExerciseKind;
  muscle: MuscleGroup;
  equipment?: Equipment;
}

/** Null when fine; otherwise the sentence to show under the name field. */
export const validateExerciseName = (
  name: string,
  existing: Exercise[],
  selfId?: string
): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'Give it a name.';
  if (trimmed.length > 60) return 'Keep the name under 60 characters.';
  const clash = existing.find(
    (e) => !e.archived_at && e.id !== selfId && e.name.toLowerCase() === trimmed.toLowerCase()
  );
  return clash ? `There's already an exercise called “${clash.name}”.` : null;
};

/** "Weight · Barbell", "Timed · Bodyweight · yours". */
export const exerciseSubtitle = (exercise: Exercise, kindLabel: string): string =>
  [kindLabel, exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null, exercise.custom ? 'yours' : null]
    .filter(Boolean)
    .join(' · ');

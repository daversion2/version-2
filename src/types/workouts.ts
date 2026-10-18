// Workouts mini-app (Lab). Kept out of types/index.ts so retiring the
// experiment is a file delete. Stored under users/{uid}/lab_workout_* only.

export type ExerciseKind = 'weight' | 'reps' | 'time';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'full_body';

export type WeightUnit = 'lb' | 'kg';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'other';

export interface Exercise {
  id: string;
  name: string;
  /** weight × reps, reps only (bodyweight), or a timed hold. Locks once logged. */
  kind: ExerciseKind;
  muscle: MuscleGroup;
  equipment?: Equipment;
  custom?: boolean;
  /**
   * Set when the user deletes one of their own. It leaves the picker, but past
   * sessions, records and saved workouts still resolve it by id.
   */
  archived_at?: string;
}

/** Planned or logged numbers for one set. Weight is always kilograms underneath. */
export interface SetValues {
  reps?: number;
  weightKg?: number;
  seconds?: number;
}

export interface BlockItem {
  exerciseId: string;
  target: SetValues;
}

/**
 * One step of a workout. A single exercise is a block with ONE item, where a
 * round is a set; a circuit has several items done back to back, and one pass
 * through all of them is a round. Treating them the same is what lets set
 * pills, rest timers and "+ set" work identically for both.
 */
export interface WorkoutBlock {
  id: string;
  type: 'single' | 'circuit';
  /** Circuits only — singles are named by their exercise. */
  name?: string;
  items: BlockItem[];
  /** Sets for a single, rounds for a circuit. */
  rounds: number;
  /** Rest after each completed round. Never between items inside a round. */
  restSec: number;
}

export interface Workout {
  id: string;
  name: string;
  blocks: WorkoutBlock[];
  created_at: string;
  updated_at: string;
  /** Set on the bundled Push/Pull/Legs copies. */
  starter_id?: string;
  last_done_at?: string;
}

export interface LoggedSet extends SetValues {
  exerciseId: string;
  /** 0-based round within its block. */
  round: number;
  at: string;
}

export interface SessionBlock extends WorkoutBlock {
  /** Rounds the saved workout asked for; 0 for a block added mid-session. */
  plannedRounds: number;
  /** Flat, in log order — Firestore rejects arrays nested in arrays. */
  sets: LoggedSet[];
  skipped: boolean;
  added: boolean;
}

export interface RestState {
  endsAt: string;
  totalSec: number;
}

export interface WorkoutSession {
  id: string;
  workoutId?: string;
  workoutName: string;
  /** The habit this session will check off, when it has one. */
  habitId?: string;
  startedAt: string;
  blocks: SessionBlock[];
  /** The block you're on. Unfinished blocks after it come next, then earlier ones. */
  cursor: number;
  /** Block index of every logged set, in order — what "Undo" walks back. */
  history: number[];
  rest?: RestState;
  phase: 'active' | 'summary';
  /** When Finish was tapped — the duration stops here even if the summary sits for hours. */
  endedAt?: string;
}

export interface ExerciseRecord {
  exerciseId: string;
  heaviestKg?: number;
  /** Best reps at each weight, keyed by weightKey(). */
  repsAtWeight?: Record<string, number>;
  maxReps?: number;
  longestSec?: number;
}

export type RecordType = 'heaviest' | 'reps_at_weight' | 'max_reps' | 'longest_hold';

export interface PersonalRecord {
  exerciseId: string;
  type: RecordType;
  value: number;
  previous: number;
  /** The weight a reps_at_weight record was set at. */
  weightKg?: number;
}

export interface CompletedWorkoutSession {
  id: string;
  workout_id?: string;
  workout_name: string;
  habit_id?: string;
  started_at: string;
  finished_at: string;
  duration_sec: number;
  total_sets: number;
  total_volume_kg: number;
  blocks: SessionBlock[];
  prs: PersonalRecord[];
}

export interface WorkoutPrefs {
  unit: WeightUnit;
  /** Habits linked by hand. Library Workout habits are linked automatically. */
  linked_habit_ids: string[];
  starters_seeded: boolean;
  /** The first-open "how this works" card has been dismissed. */
  intro_seen?: boolean;
}

/** A reporting span. Weeks start Monday. */
export type StatsRange = 'week' | 'month' | 'year' | 'all';

export type WorkoutsStackParamList = {
  WorkoutsHome: undefined;
  WorkoutPreview: { workoutId: string };
  WorkoutBuilder: { workoutId?: string };
  WorkoutSession: undefined;
  WorkoutSummary: undefined;
  WorkoutHistory: undefined;
  WorkoutSettings: undefined;
  WorkoutExercises: undefined;
  /** One exercise's or one body part's stats. `id` is an exercise id or a MuscleGroup. */
  WorkoutStatsDetail: { kind: 'exercise' | 'muscle'; id: string; range: StatsRange };
};

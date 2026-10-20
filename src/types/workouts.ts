// Workouts mini-app (Lab). Kept out of types/index.ts so retiring the
// experiment is a file delete. Stored under users/{uid}/lab_workout_* only.

/** `distance` is a time for a fixed distance (a mile run): lower is better. */
export type ExerciseKind = 'weight' | 'reps' | 'time' | 'distance';

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
  /** `distance` exercises only: the fixed distance, in metres. */
  distanceM?: number;
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
  /** The training phase this session counts toward (services/trainingPhases.ts). */
  phaseId?: string;
  /** Ran with the phase's lighter last week applied. */
  lighter?: boolean;
  /** Step-up suggestions answered this session, keyed by stepUpKey(). */
  stepUps?: Record<string, StepUp>;
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
  /** `distance` exercises: the best (lowest) time. */
  fastestSec?: number;
}

export type RecordType = 'heaviest' | 'reps_at_weight' | 'max_reps' | 'longest_hold' | 'fastest';

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
  phase_id?: string;
  /** Seeded by Admin → demo data; removed when demo mode is turned off. */
  is_demo?: boolean;
}

export interface WorkoutPrefs {
  unit: WeightUnit;
  /** @deprecated No longer read: sessions are their own check-ins (services/appCheckins.ts). */
  linked_habit_ids: string[];
  /** Workouts a week, the card's "1 of 3". Absent = DEFAULT_APP_WEEKLY_GOALS. */
  weekly_goal?: number;
  starters_seeded: boolean;
  /** The first-open "how this works" card has been dismissed. */
  intro_seen?: boolean;
}

/**
 * The answer to "try a bit more today?" for one slot. Accepted: the new
 * weight, or reps / seconds added to every set. Declined: the banner goes.
 */
export interface StepUp {
  declined?: boolean;
  weightKg?: number;
  addReps?: number;
  addSeconds?: number;
}

// --- Training phases: test → train for a few weeks → retest → change one thing ---

/** How a test is scored — set by the exercise's kind. */
export type TestType = 'max_reps' | 'reps_at_weight' | 'longest' | 'fastest';

export interface PhaseTest {
  exerciseId: string;
  /** reps_at_weight only: the weight every test of this exercise uses. */
  weightKg?: number;
}

/** The single thing a phase changed from the one before it. */
export type PhaseChangeKey = 'sets' | 'reps' | 'weight' | 'days' | 'rest' | 'swap' | 'none' | 'consistency';

export interface PhaseChange {
  key: PhaseChangeKey;
  /** In the user's words: "Add one set to each exercise". */
  label: string;
  /** Set when the change is about one exercise. */
  exerciseId?: string;
}

export type PhaseStatus = 'baseline' | 'training' | 'complete' | 'ended';

export interface TrainingPhase {
  id: string;
  /** 1 for the first phase in a run of them, then 2, 3… */
  number: number;
  program_name: string;
  template_id?: string;
  /** The workouts the program rotates through. Sessions of these count. */
  workout_ids: string[];
  days_per_week: number;
  weeks: number;
  lighter_last_week: boolean;
  tests: PhaseTest[];
  /** Local dates, YYYY-MM-DD. */
  start_date: string;
  retest_date: string;
  /** Test results by exercise id: reps, or seconds for longest / fastest. */
  baseline: Record<string, number>;
  baseline_at?: string;
  retest?: Record<string, number>;
  retest_at?: string;
  change?: PhaseChange;
  previous_phase_id?: string;
  status: PhaseStatus;
  created_at: string;
  updated_at: string;
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
  PhaseSetup: undefined;
  /** The current phase, or a past one by id. */
  Phase: { phaseId?: string } | undefined;
  PhaseTest: { phaseId: string; mode: 'baseline' | 'retest' };
  PhaseResults: { phaseId: string };
  PhaseNext: { phaseId: string };
};

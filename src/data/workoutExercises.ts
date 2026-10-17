import { Exercise, MuscleGroup, Workout, WorkoutBlock } from '../types/workouts';

// Ids are stored in workouts, sessions and records — never rename one.
export const BUILT_IN_EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', kind: 'weight', muscle: 'chest' },
  { id: 'db-fly', name: 'Dumbbell Fly', kind: 'weight', muscle: 'chest' },
  { id: 'cable-crossover', name: 'Cable Crossover', kind: 'weight', muscle: 'chest' },
  { id: 'push-up', name: 'Push-up', kind: 'reps', muscle: 'chest' },
  { id: 'dip', name: 'Dips', kind: 'reps', muscle: 'chest' },
  // Back
  { id: 'deadlift', name: 'Deadlift', kind: 'weight', muscle: 'back' },
  { id: 'barbell-row', name: 'Barbell Row', kind: 'weight', muscle: 'back' },
  { id: 'db-row', name: 'Dumbbell Row', kind: 'weight', muscle: 'back' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', kind: 'weight', muscle: 'back' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', kind: 'weight', muscle: 'back' },
  { id: 'face-pull', name: 'Face Pull', kind: 'weight', muscle: 'back' },
  { id: 'pull-up', name: 'Pull-up', kind: 'reps', muscle: 'back' },
  { id: 'chin-up', name: 'Chin-up', kind: 'reps', muscle: 'back' },
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', kind: 'weight', muscle: 'shoulders' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', kind: 'weight', muscle: 'shoulders' },
  { id: 'lateral-raise', name: 'Lateral Raise', kind: 'weight', muscle: 'shoulders' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', kind: 'weight', muscle: 'shoulders' },
  // Legs
  { id: 'back-squat', name: 'Back Squat', kind: 'weight', muscle: 'legs' },
  { id: 'front-squat', name: 'Front Squat', kind: 'weight', muscle: 'legs' },
  { id: 'goblet-squat', name: 'Goblet Squat', kind: 'weight', muscle: 'legs' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', kind: 'weight', muscle: 'legs' },
  { id: 'leg-press', name: 'Leg Press', kind: 'weight', muscle: 'legs' },
  { id: 'walking-lunge', name: 'Walking Lunge', kind: 'weight', muscle: 'legs' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', kind: 'weight', muscle: 'legs' },
  { id: 'hip-thrust', name: 'Hip Thrust', kind: 'weight', muscle: 'legs' },
  { id: 'leg-curl', name: 'Leg Curl', kind: 'weight', muscle: 'legs' },
  { id: 'leg-extension', name: 'Leg Extension', kind: 'weight', muscle: 'legs' },
  { id: 'calf-raise', name: 'Calf Raise', kind: 'weight', muscle: 'legs' },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', kind: 'reps', muscle: 'legs' },
  { id: 'box-jump', name: 'Box Jump', kind: 'reps', muscle: 'legs' },
  { id: 'wall-sit', name: 'Wall Sit', kind: 'time', muscle: 'legs' },
  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', kind: 'weight', muscle: 'arms' },
  { id: 'db-curl', name: 'Dumbbell Curl', kind: 'weight', muscle: 'arms' },
  { id: 'hammer-curl', name: 'Hammer Curl', kind: 'weight', muscle: 'arms' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', kind: 'weight', muscle: 'arms' },
  { id: 'skull-crusher', name: 'Skull Crusher', kind: 'weight', muscle: 'arms' },
  // Core
  { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
  { id: 'side-plank', name: 'Side Plank', kind: 'time', muscle: 'core' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', kind: 'reps', muscle: 'core' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', kind: 'reps', muscle: 'core' },
  { id: 'russian-twist', name: 'Russian Twist', kind: 'reps', muscle: 'core' },
  { id: 'dead-bug', name: 'Dead Bug', kind: 'reps', muscle: 'core' },
  // Full body
  { id: 'kettlebell-swing', name: 'Kettlebell Swing', kind: 'weight', muscle: 'full_body' },
  { id: 'burpee', name: 'Burpee', kind: 'reps', muscle: 'full_body' },
  { id: 'mountain-climber', name: 'Mountain Climbers', kind: 'time', muscle: 'full_body' },
  { id: 'jump-rope', name: 'Jump Rope', kind: 'time', muscle: 'full_body' },
  { id: 'farmers-carry', name: "Farmer's Carry", kind: 'time', muscle: 'full_body' },
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  legs: 'Legs',
  arms: 'Arms',
  core: 'Core',
  full_body: 'Full body',
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'core',
  'full_body',
];

export const DEFAULT_REST_SEC = 90;

const single = (
  id: string,
  exerciseId: string,
  rounds: number,
  reps: number,
  restSec = DEFAULT_REST_SEC
): WorkoutBlock => ({
  id,
  type: 'single',
  items: [{ exerciseId, target: { reps } }],
  rounds,
  restSec,
});

/**
 * Bundled starters, copied into the user's own workouts on first open so they
 * can be edited or deleted like any other. No weights: everyone's are
 * different, and the first session's numbers become "last time" from then on.
 */
export const STARTER_WORKOUTS: Omit<Workout, 'created_at' | 'updated_at'>[] = [
  {
    id: 'starter_push',
    starter_id: 'push',
    name: 'Push Day',
    blocks: [
      single('push_1', 'bench-press', 3, 8),
      single('push_2', 'overhead-press', 3, 10),
      single('push_3', 'incline-db-press', 3, 10),
      {
        id: 'push_4',
        type: 'circuit',
        name: 'Finisher',
        items: [
          { exerciseId: 'dip', target: { reps: 12 } },
          { exerciseId: 'push-up', target: { reps: 15 } },
          { exerciseId: 'plank', target: { seconds: 45 } },
        ],
        rounds: 3,
        restSec: DEFAULT_REST_SEC,
      },
    ],
  },
  {
    id: 'starter_pull',
    starter_id: 'pull',
    name: 'Pull Day',
    blocks: [
      single('pull_1', 'deadlift', 3, 5, 120),
      single('pull_2', 'pull-up', 3, 8),
      single('pull_3', 'barbell-row', 3, 10),
      single('pull_4', 'face-pull', 3, 15, 60),
      single('pull_5', 'hammer-curl', 3, 12, 60),
    ],
  },
  {
    id: 'starter_legs',
    starter_id: 'legs',
    name: 'Leg Day',
    blocks: [
      single('legs_1', 'back-squat', 4, 6, 120),
      single('legs_2', 'romanian-deadlift', 3, 8),
      single('legs_3', 'walking-lunge', 3, 12),
      single('legs_4', 'leg-curl', 3, 12, 60),
      single('legs_5', 'calf-raise', 3, 15, 60),
    ],
  },
];

import { Equipment, Exercise, ExerciseKind, MuscleGroup, Workout, WorkoutBlock } from '../types/workouts';
import { LIBRARY_EXERCISES } from './exerciseLibrary';

export const METRES_PER_MILE = 1609.344;

// Ids are stored in workouts, sessions and records — never rename one.
// The hand-made core: each has a demo spec (exerciseDemos.ts) and, once
// approved, generated art.
export const CORE_EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', kind: 'weight', muscle: 'chest', equipment: 'barbell' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', kind: 'weight', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db-fly', name: 'Dumbbell Fly', kind: 'weight', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'cable-crossover', name: 'Cable Crossover', kind: 'weight', muscle: 'chest', equipment: 'cable' },
  { id: 'push-up', name: 'Push-up', kind: 'reps', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'dip', name: 'Dips', kind: 'reps', muscle: 'chest', equipment: 'bodyweight' },
  // Back
  { id: 'deadlift', name: 'Deadlift', kind: 'weight', muscle: 'back', equipment: 'barbell' },
  { id: 'barbell-row', name: 'Barbell Row', kind: 'weight', muscle: 'back', equipment: 'barbell' },
  { id: 'db-row', name: 'Dumbbell Row', kind: 'weight', muscle: 'back', equipment: 'dumbbell' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', kind: 'weight', muscle: 'back', equipment: 'cable' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', kind: 'weight', muscle: 'back', equipment: 'cable' },
  { id: 'face-pull', name: 'Face Pull', kind: 'weight', muscle: 'back', equipment: 'cable' },
  { id: 'pull-up', name: 'Pull-up', kind: 'reps', muscle: 'back', equipment: 'bodyweight' },
  { id: 'chin-up', name: 'Chin-up', kind: 'reps', muscle: 'back', equipment: 'bodyweight' },
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', kind: 'weight', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', kind: 'weight', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', kind: 'weight', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', kind: 'weight', muscle: 'shoulders', equipment: 'dumbbell' },
  // Legs
  { id: 'back-squat', name: 'Back Squat', kind: 'weight', muscle: 'legs', equipment: 'barbell' },
  { id: 'front-squat', name: 'Front Squat', kind: 'weight', muscle: 'legs', equipment: 'barbell' },
  { id: 'goblet-squat', name: 'Goblet Squat', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', kind: 'weight', muscle: 'legs', equipment: 'barbell' },
  { id: 'leg-press', name: 'Leg Press', kind: 'weight', muscle: 'legs', equipment: 'machine' },
  { id: 'walking-lunge', name: 'Walking Lunge', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'hip-thrust', name: 'Hip Thrust', kind: 'weight', muscle: 'legs', equipment: 'barbell' },
  { id: 'leg-curl', name: 'Leg Curl', kind: 'weight', muscle: 'legs', equipment: 'machine' },
  { id: 'leg-extension', name: 'Leg Extension', kind: 'weight', muscle: 'legs', equipment: 'machine' },
  { id: 'calf-raise', name: 'Calf Raise', kind: 'weight', muscle: 'legs', equipment: 'machine' },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'box-jump', name: 'Box Jump', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'wall-sit', name: 'Wall Sit', kind: 'time', muscle: 'legs', equipment: 'bodyweight' },
  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', kind: 'weight', muscle: 'arms', equipment: 'barbell' },
  { id: 'db-curl', name: 'Dumbbell Curl', kind: 'weight', muscle: 'arms', equipment: 'dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', kind: 'weight', muscle: 'arms', equipment: 'dumbbell' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', kind: 'weight', muscle: 'arms', equipment: 'cable' },
  { id: 'skull-crusher', name: 'Skull Crusher', kind: 'weight', muscle: 'arms', equipment: 'barbell' },
  // Core
  { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core', equipment: 'bodyweight' },
  { id: 'side-plank', name: 'Side Plank', kind: 'time', muscle: 'core', equipment: 'bodyweight' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', kind: 'reps', muscle: 'core', equipment: 'bodyweight' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', kind: 'reps', muscle: 'core', equipment: 'other' },
  { id: 'russian-twist', name: 'Russian Twist', kind: 'reps', muscle: 'core', equipment: 'bodyweight' },
  { id: 'dead-bug', name: 'Dead Bug', kind: 'reps', muscle: 'core', equipment: 'bodyweight' },
  // Full body
  { id: 'kettlebell-swing', name: 'Kettlebell Swing', kind: 'weight', muscle: 'full_body', equipment: 'kettlebell' },
  { id: 'burpee', name: 'Burpee', kind: 'reps', muscle: 'full_body', equipment: 'bodyweight' },
  { id: 'mountain-climber', name: 'Mountain Climbers', kind: 'time', muscle: 'full_body', equipment: 'bodyweight' },
  { id: 'jump-rope', name: 'Jump Rope', kind: 'time', muscle: 'full_body', equipment: 'other' },
  { id: 'farmers-carry', name: "Farmer's Carry", kind: 'time', muscle: 'full_body', equipment: 'dumbbell' },
  // Added for the Workout library (2026-11-25, data/workoutLibrary.ts): the
  // movement prep, pillar and single-leg work that Exos-, Boyle- and
  // Cook-style programs are built on, which the catalog didn't have.
  { id: 'worlds-greatest-stretch', name: "World's Greatest Stretch", kind: 'reps', muscle: 'full_body', equipment: 'bodyweight' },
  { id: 'half-kneeling-hip-flexor-stretch', name: 'Half-Kneeling Hip Flexor Stretch', kind: 'time', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'quadruped-t-spine-rotation', name: 'Quadruped T-Spine Rotation', kind: 'reps', muscle: 'back', equipment: 'bodyweight' },
  { id: 'ankle-rock', name: 'Half-Kneeling Ankle Rock', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'active-leg-lowering', name: 'Active Straight-Leg Lowering', kind: 'reps', muscle: 'core', equipment: 'bodyweight' },
  { id: 'crocodile-breathing', name: 'Crocodile Breathing', kind: 'time', muscle: 'core', equipment: 'bodyweight' },
  { id: 'wall-slide', name: 'Wall Slide', kind: 'reps', muscle: 'shoulders', equipment: 'bodyweight' },
  { id: 'inchworm', name: 'Inchworm', kind: 'reps', muscle: 'full_body', equipment: 'bodyweight' },
  { id: 'bird-dog', name: 'Bird Dog', kind: 'reps', muscle: 'core', equipment: 'bodyweight' },
  { id: 'bear-crawl', name: 'Bear Crawl', kind: 'time', muscle: 'full_body', equipment: 'bodyweight' },
  { id: 'pogo-hop', name: 'Pogo Hops', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'split-squat', name: 'Split Squat', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'goblet-split-squat', name: 'Goblet Split Squat', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'bw-bulgarian-split-squat', name: 'Bodyweight Bulgarian Split Squat', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'bw-reverse-lunge', name: 'Bodyweight Reverse Lunge', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'skater-squat', name: 'Skater Squat', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'lateral-lunge', name: 'Lateral Lunge', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'goblet-lateral-lunge', name: 'Goblet Lateral Lunge', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'kb-deadlift', name: 'Kettlebell Deadlift', kind: 'weight', muscle: 'legs', equipment: 'kettlebell' },
  { id: 'db-single-leg-rdl', name: 'Dumbbell Single-Leg RDL', kind: 'weight', muscle: 'legs', equipment: 'dumbbell' },
  { id: 'bw-single-leg-rdl', name: 'Bodyweight Single-Leg RDL', kind: 'reps', muscle: 'legs', equipment: 'bodyweight' },
  { id: 'half-kneeling-db-press', name: 'Half-Kneeling Dumbbell Press', kind: 'weight', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'chin-up-negative', name: 'Chin-up Negative', kind: 'reps', muscle: 'back', equipment: 'bodyweight' },
  { id: 'band-row', name: 'Band Row', kind: 'reps', muscle: 'back', equipment: 'band' },
  { id: 'band-pallof-press', name: 'Band Pallof Press', kind: 'reps', muscle: 'core', equipment: 'band' },
  { id: 'half-kneeling-cable-chop', name: 'Half-Kneeling Cable Chop', kind: 'weight', muscle: 'core', equipment: 'cable' },
  { id: 'half-kneeling-band-chop', name: 'Half-Kneeling Band Chop', kind: 'reps', muscle: 'core', equipment: 'band' },
  { id: 'suitcase-carry', name: 'Suitcase Carry', kind: 'time', muscle: 'core', equipment: 'dumbbell' },
  { id: 'copenhagen-plank', name: 'Copenhagen Plank', kind: 'time', muscle: 'core', equipment: 'bodyweight' },
  { id: 'med-ball-rotational-throw', name: 'Med Ball Rotational Throw', kind: 'reps', muscle: 'core', equipment: 'other' },
  // Cardio. Time for a distance — lower is better
  { id: 'run-400m', name: '400 m Run', kind: 'distance', muscle: 'cardio', equipment: 'other', distanceM: 400 },
  { id: 'run-mile', name: 'Mile Run', kind: 'distance', muscle: 'cardio', equipment: 'other', distanceM: METRES_PER_MILE },
  { id: 'run-5k', name: '5K Run', kind: 'distance', muscle: 'cardio', equipment: 'other', distanceM: 5000 },
  { id: 'row-2000m', name: '2,000 m Row', kind: 'distance', muscle: 'cardio', equipment: 'machine', distanceM: 2000 },
  // Cardio — minutes, an optional distance, and a zone by VT1 / VT2
  { id: 'cardio-run', name: 'Run', kind: 'cardio', muscle: 'cardio', equipment: 'other' },
  { id: 'cardio-walk', name: 'Walk', kind: 'cardio', muscle: 'cardio', equipment: 'other' },
  { id: 'cardio-hike', name: 'Hike', kind: 'cardio', muscle: 'cardio', equipment: 'other' },
  { id: 'cardio-cycle', name: 'Cycling', kind: 'cardio', muscle: 'cardio', equipment: 'other' },
  { id: 'cardio-indoor-bike', name: 'Indoor Bike', kind: 'cardio', muscle: 'cardio', equipment: 'machine' },
  { id: 'cardio-row', name: 'Rowing Machine', kind: 'cardio', muscle: 'cardio', equipment: 'machine' },
  { id: 'cardio-elliptical', name: 'Elliptical', kind: 'cardio', muscle: 'cardio', equipment: 'machine' },
  { id: 'cardio-stairs', name: 'Stair Climber', kind: 'cardio', muscle: 'cardio', equipment: 'machine' },
  { id: 'cardio-swim', name: 'Swim', kind: 'cardio', muscle: 'cardio', equipment: 'other' },
];

/**
 * Every built-in: the core plus the 200 from the exercise library
 * (content/exercise-library/), which bring their own photos and steps.
 */
export const BUILT_IN_EXERCISES: Exercise[] = [
  ...CORE_EXERCISES,
  ...LIBRARY_EXERCISES.map(({ sourceId: _sourceId, steps: _steps, ...exercise }) => exercise),
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  legs: 'Legs',
  arms: 'Arms',
  core: 'Core',
  full_body: 'Full body',
  cardio: 'Cardio',
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'core',
  'full_body',
  'cardio',
];

/** How an exercise is logged, in the words the screens use. */
export const KIND_LABELS: Record<ExerciseKind, string> = {
  weight: 'Weight',
  reps: 'Bodyweight',
  time: 'Timed',
  distance: 'Distance',
  cardio: 'Cardio',
};

export const KIND_HINTS: Record<ExerciseKind, string> = {
  weight: 'Weight × reps',
  reps: 'Reps only',
  time: 'A hold, in seconds',
  distance: 'Your time for a set distance — lower is better',
  cardio: 'Minutes, an optional distance, and how hard (by VT1 / VT2)',
};

/** The distances offered when making a distance exercise. */
export const DISTANCE_PRESETS: { label: string; metres: number }[] = [
  { label: '400 m', metres: 400 },
  { label: '800 m', metres: 800 },
  { label: '1 mile', metres: METRES_PER_MILE },
  { label: '2 km', metres: 2000 },
  { label: '5 km', metres: 5000 },
  { label: '10 km', metres: 10000 },
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  band: 'Band',
  other: 'Other',
};

export const EQUIPMENT_ORDER: Equipment[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'other',
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

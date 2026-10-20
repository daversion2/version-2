import { SetValues, Workout, WorkoutBlock } from '../types/workouts';
import { DEFAULT_REST_SEC, STARTER_WORKOUTS } from './workoutExercises';

// =============================================================================
// Programs a training phase can start from. Each brings its workouts and the
// tests it suggests; the user edits either before starting. Workout ids are
// fixed so a second phase on the same template reuses (not duplicates) the
// workouts the first one wrote — edits included. Push / Pull / Legs is the
// bundled starters, which most accounts already have.
// =============================================================================

export interface PhaseTemplate {
  id: string;
  name: string;
  description: string;
  days_per_week: number;
  workouts: Omit<Workout, 'created_at' | 'updated_at'>[];
  /** Exercise ids, in the order they're tested. */
  tests: string[];
}

const block = (id: string, exerciseId: string, rounds: number, target: SetValues, restSec = DEFAULT_REST_SEC): WorkoutBlock => ({
  id,
  type: 'single',
  items: [{ exerciseId, target }],
  rounds,
  restSec,
});

export const PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    id: 'full-body',
    name: 'Full body, 3 days',
    description: 'Two workouts, A and B, taking turns three days a week.',
    days_per_week: 3,
    workouts: [
      {
        id: 'tpl_fullbody_a',
        name: 'Full Body A',
        blocks: [
          block('fba_1', 'goblet-squat', 3, { reps: 10 }),
          block('fba_2', 'push-up', 3, { reps: 12 }),
          block('fba_3', 'db-row', 3, { reps: 10 }),
          block('fba_4', 'plank', 3, { seconds: 30 }, 60),
        ],
      },
      {
        id: 'tpl_fullbody_b',
        name: 'Full Body B',
        blocks: [
          block('fbb_1', 'romanian-deadlift', 3, { reps: 10 }),
          block('fbb_2', 'pull-up', 3, { reps: 6 }),
          block('fbb_3', 'db-shoulder-press', 3, { reps: 10 }),
          block('fbb_4', 'dead-bug', 3, { reps: 10 }, 60),
        ],
      },
    ],
    tests: ['pull-up', 'push-up', 'goblet-squat', 'plank'],
  },
  {
    id: 'bodyweight',
    name: 'Bodyweight only, 3 days',
    description: 'No equipment beyond a pull-up bar. Two workouts, taking turns.',
    days_per_week: 3,
    workouts: [
      {
        id: 'tpl_bodyweight_a',
        name: 'Bodyweight A',
        blocks: [
          block('bwa_1', 'push-up', 3, { reps: 12 }),
          block('bwa_2', 'bodyweight-squat', 3, { reps: 20 }),
          block('bwa_3', 'pull-up', 3, { reps: 6 }),
          block('bwa_4', 'plank', 3, { seconds: 30 }, 60),
        ],
      },
      {
        id: 'tpl_bodyweight_b',
        name: 'Bodyweight B',
        blocks: [
          block('bwb_1', 'dip', 3, { reps: 8 }),
          block('bwb_2', 'chin-up', 3, { reps: 6 }),
          block('bwb_3', 'box-jump', 3, { reps: 8 }),
          block('bwb_4', 'hanging-leg-raise', 3, { reps: 8 }, 60),
        ],
      },
    ],
    tests: ['pull-up', 'push-up', 'bodyweight-squat', 'plank'],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Your Push, Pull and Leg Day workouts, one each, three days a week.',
    days_per_week: 3,
    workouts: STARTER_WORKOUTS,
    tests: ['bench-press', 'pull-up', 'back-squat'],
  },
];

export const phaseTemplate = (id?: string): PhaseTemplate | undefined =>
  PHASE_TEMPLATES.find((t) => t.id === id);

/** Ways to change one thing between phases — the "pick a different change" list. */
export const PHASE_CHANGE_OPTIONS = [
  { key: 'sets', title: 'Sets', label: 'Add one set to each exercise' },
  { key: 'reps', title: 'Reps', label: 'Change the rep range' },
  { key: 'weight', title: 'Weight', label: 'Start heavier on the weighted lifts' },
  { key: 'days', title: 'Days', label: 'Train one more day a week' },
  { key: 'rest', title: 'Rest', label: 'Shorter rests between sets' },
  { key: 'swap', title: 'Exercise', label: 'Swap in a harder version of one exercise' },
] as const;

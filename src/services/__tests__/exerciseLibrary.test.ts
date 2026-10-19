import {
  activeExercises,
  exerciseSubtitle,
  exercisesInGroup,
  isExerciseUsed,
  searchExercises,
  validateExerciseName,
} from '../exerciseLibrary';
import { BUILT_IN_EXERCISES } from '../../data/workoutExercises';
import { CompletedWorkoutSession, Exercise, WorkoutSession } from '../../types/workouts';

const sled: Exercise = { id: 'custom_1', name: 'Sled Push', kind: 'time', muscle: 'legs', equipment: 'other', custom: true };
const gone: Exercise = { id: 'custom_2', name: 'Old Thing', kind: 'reps', muscle: 'core', custom: true, archived_at: '2026-10-01' };
const library = [...BUILT_IN_EXERCISES, sled, gone];

const sessionWith = (exerciseId: string): CompletedWorkoutSession => ({
  id: 's',
  workout_name: 'W',
  started_at: '2026-10-10T10:00:00Z',
  finished_at: '2026-10-10T11:00:00Z',
  duration_sec: 3600,
  total_sets: 1,
  total_volume_kg: 0,
  prs: [],
  blocks: [
    {
      id: 'b',
      type: 'single',
      items: [{ exerciseId, target: {} }],
      rounds: 1,
      restSec: 0,
      plannedRounds: 1,
      skipped: false,
      added: false,
      sets: [{ exerciseId, round: 0, seconds: 30, at: '2026-10-10T10:10:00Z' }],
    },
  ],
});

describe('built-in exercises', () => {
  it('all carry equipment and unique ids', () => {
    expect(BUILT_IN_EXERCISES.every((e) => !!e.equipment)).toBe(true);
    expect(new Set(BUILT_IN_EXERCISES.map((e) => e.id)).size).toBe(BUILT_IN_EXERCISES.length);
  });
});

describe('activeExercises', () => {
  it('drops deleted ones and sorts A–Z', () => {
    const active = activeExercises([sled, gone, BUILT_IN_EXERCISES[0]]);
    expect(active.map((e) => e.name)).toEqual(['Bench Press', 'Sled Push']);
  });
});

describe('searchExercises', () => {
  it('matches name, equipment and body part', () => {
    expect(searchExercises(library, 'sled').map((e) => e.id)).toEqual(['custom_1']);
    const dumbbell = searchExercises(library, 'Dumbbell');
    expect(dumbbell.length).toBeGreaterThan(5);
    expect(dumbbell.every((e) => e.equipment === 'dumbbell' || e.name.includes('Dumbbell'))).toBe(true);
    expect(searchExercises(library, 'core').every((e) => e.muscle === 'core' || /core/i.test(e.name))).toBe(true);
  });

  it('returns everything for a blank search', () => {
    expect(searchExercises(library, '  ')).toHaveLength(library.length);
  });
});

describe('exercisesInGroup', () => {
  it('keeps one body part, yours first, order otherwise kept', () => {
    const legs = exercisesInGroup(activeExercises(library), 'legs');
    expect(legs[0].id).toBe('custom_1');
    expect(legs.every((e) => e.muscle === 'legs')).toBe(true);
    const builtIns = legs.slice(1).map((e) => e.name);
    expect(builtIns).toEqual([...builtIns].sort((a, b) => a.localeCompare(b)));
    expect(legs).toHaveLength(BUILT_IN_EXERCISES.filter((e) => e.muscle === 'legs').length + 1);
  });

  it('is empty for a body part with nothing in it', () => {
    expect(exercisesInGroup([], 'chest')).toEqual([]);
  });
});

describe('validateExerciseName', () => {
  it('needs a name', () => {
    expect(validateExerciseName('  ', library)).toMatch(/name/);
  });

  it('refuses a name already taken, ignoring case and spaces', () => {
    expect(validateExerciseName(' bench press ', library)).toMatch(/Bench Press/);
    expect(validateExerciseName('sled push', library)).toMatch(/Sled Push/);
  });

  it('lets an exercise keep its own name, and reuse a deleted one’s', () => {
    expect(validateExerciseName('Sled Push', library, 'custom_1')).toBeNull();
    expect(validateExerciseName('Old Thing', library)).toBeNull();
  });

  it('caps the length', () => {
    expect(validateExerciseName('x'.repeat(61), library)).toMatch(/60/);
  });
});

describe('isExerciseUsed', () => {
  const none = { records: {}, sessions: [] };

  it('is false for a never-logged exercise', () => {
    expect(isExerciseUsed('custom_1', none)).toBe(false);
  });

  it('is true once a record, a past session or the open session has it', () => {
    expect(isExerciseUsed('custom_1', { ...none, records: { custom_1: { exerciseId: 'custom_1' } } })).toBe(true);
    expect(isExerciseUsed('custom_1', { ...none, sessions: [sessionWith('custom_1')] })).toBe(true);
    const open = { blocks: sessionWith('custom_1').blocks } as unknown as WorkoutSession;
    expect(isExerciseUsed('custom_1', { ...none, session: open })).toBe(true);
    expect(isExerciseUsed('plank', { ...none, session: open })).toBe(false);
  });
});

describe('exerciseSubtitle', () => {
  it('reads kind, equipment, and whose it is', () => {
    expect(exerciseSubtitle(sled, 'Timed')).toBe('Timed · Other · yours');
    expect(exerciseSubtitle(BUILT_IN_EXERCISES[0], 'Weight')).toBe('Weight · Barbell');
  });
});

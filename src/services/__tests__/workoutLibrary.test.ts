import {
  canSeeWorkoutLibrary,
  countLibrarySets,
  findLibraryCopy,
  libraryWorkoutToWorkout,
  listLibrary,
  resolveLibraryWorkout,
} from '../workoutLibrary';
import {
  LIBRARY_EXCLUDED_EXERCISES,
  LIBRARY_GEAR_LABELS,
  LIBRARY_GEAR_ORDER,
  WORKOUT_LIBRARY,
  findLibraryWorkout,
} from '../../data/workoutLibrary';
import { BUILT_IN_EXERCISES } from '../../data/workoutExercises';
import type { LibraryGear, LibraryWorkout } from '../../types/workouts';

const ALL_GEAR = LIBRARY_GEAR_ORDER;
const byId = new Map(BUILT_IN_EXERCISES.map((e) => [e.id, e]));
const allOptions = WORKOUT_LIBRARY.flatMap((w) =>
  w.blocks.flatMap((b) => b.slots.flatMap((s) => s.options.map((o) => ({ w: w.id, ...o }))))
);
const exerciseIdsIn = (gear: LibraryGear[], id: string) =>
  resolveLibraryWorkout(findLibraryWorkout(id)!, gear)!.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));

describe('workout library data', () => {
  it('has unique, permanent-looking ids and every level', () => {
    const ids = WORKOUT_LIBRARY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^lib_[a-z0-9_]+$/.test(id))).toBe(true);
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(WORKOUT_LIBRARY.filter((w) => w.level === level).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('only uses exercises that exist, with a target that fits how each is logged', () => {
    const bad = allOptions.filter((o) => {
      const ex = byId.get(o.exerciseId);
      if (!ex) return true;
      if (ex.kind === 'time') return !(o.target.seconds! > 0) || o.target.reps !== undefined;
      if (ex.kind === 'weight' || ex.kind === 'reps') return !(o.target.reps! > 0) || o.target.seconds !== undefined;
      return true; // no distance or cardio kinds in the library
    });
    expect(bad.map((o) => `${o.w}: ${o.exerciseId}`)).toEqual([]);
  });

  it('never uses an excluded exercise', () => {
    const excluded = new Set(LIBRARY_EXCLUDED_EXERCISES);
    expect(allOptions.filter((o) => excluded.has(o.exerciseId)).map((o) => `${o.w}: ${o.exerciseId}`)).toEqual([]);
  });

  it('labels every piece of gear an option needs', () => {
    const needed = new Set(allOptions.flatMap((o) => o.needs ?? []));
    expect([...needed].filter((g) => !LIBRARY_GEAR_LABELS[g] || !LIBRARY_GEAR_ORDER.includes(g))).toEqual([]);
  });

  it('starts every session with movement prep', () => {
    const missing = WORKOUT_LIBRARY.filter((w) => w.focus !== 'mobility' && w.blocks[0].name !== 'Movement prep');
    expect(missing.map((w) => w.id)).toEqual([]);
  });

  it('fits every template to a full gym, and with no gear at all', () => {
    expect(WORKOUT_LIBRARY.filter((w) => !resolveLibraryWorkout(w, ALL_GEAR)).map((w) => w.id)).toEqual([]);
    expect(WORKOUT_LIBRARY.filter((w) => !resolveLibraryWorkout(w, [])).map((w) => w.id)).toEqual([]);
  });

  it('keeps bodyweight templates free of equipment', () => {
    // Even with a full gym ticked, they stay bodyweight (a bar for pull-ups is the one extra).
    const uses = (id: string) => resolveLibraryWorkout(findLibraryWorkout(id)!, ALL_GEAR)!.uses;
    expect(uses('lib_bodyweight_basics')).toEqual([]);
    expect(uses('lib_bodyweight_strength')).toEqual([]);
    expect(uses('lib_mobility_reset')).toEqual([]);
    expect(uses('lib_adv_bodyweight')).toEqual(['pullup_bar']);
  });
});

describe('resolveLibraryWorkout', () => {
  it('picks the best option the gear covers', () => {
    expect(exerciseIdsIn(ALL_GEAR, 'lib_total_strength_a')).toContain('trap-bar-deadlift');
    expect(exerciseIdsIn(['kettlebells'], 'lib_total_strength_a')).toContain('kb-deadlift');
    expect(exerciseIdsIn(['dumbbells'], 'lib_total_strength_a')).toContain('db-stiff-leg-deadlift');
    expect(exerciseIdsIn([], 'lib_total_strength_a')).toContain('single-leg-glute-bridge');
  });

  it('needs every piece an option lists', () => {
    // Bench press needs dumbbells AND a bench; dumbbells alone get the floor press.
    expect(exerciseIdsIn(['dumbbells'], 'lib_total_strength_a')).toContain('db-floor-press');
    expect(exerciseIdsIn(['dumbbells', 'bench'], 'lib_total_strength_a')).toContain('db-bench-press');
  });

  it('returns null when a slot has nothing the gear covers', () => {
    const t: LibraryWorkout = {
      ...WORKOUT_LIBRARY[0],
      id: 'lib_test',
      blocks: [{ type: 'single', slots: [{ options: [{ exerciseId: 'box-jump', target: { reps: 5 }, needs: ['box'] }] }], rounds: 3, restSec: 60 }],
    };
    expect(resolveLibraryWorkout(t, [])).toBeNull();
    expect(resolveLibraryWorkout(t, ['box'])).not.toBeNull();
    expect(listLibrary('beginner', [], [t])).toEqual({ fits: [], needMoreGear: 1 });
  });

  it('builds blocks the app can run: stable ids, circuits named, singles not', () => {
    const r = resolveLibraryWorkout(findLibraryWorkout('lib_power_conditioning')!, ['kettlebells'])!;
    expect(r.blocks.map((b) => b.id)).toEqual([1, 2, 3, 4].map((n) => `lib_power_conditioning_${n}`));
    const swings = r.blocks[2];
    expect(swings).toMatchObject({ type: 'single', intervalSec: 60, rounds: 10 });
    expect(swings.name).toBeUndefined();
    expect(r.blocks[0]).toMatchObject({ type: 'circuit', name: 'Movement prep', restSec: 0 });
    expect(r.uses).toEqual(['kettlebells']);
  });

  it('counts sets including prep', () => {
    const r = resolveLibraryWorkout(findLibraryWorkout('lib_mobility_reset')!, [])!;
    expect(countLibrarySets(r)).toBe(2 * 5 + 2 * 5);
  });
});

describe('listLibrary', () => {
  it('lists only the chosen level', () => {
    const { fits } = listLibrary('advanced', ALL_GEAR);
    expect(fits.length).toBeGreaterThan(0);
    expect(fits.every((r) => r.template.level === 'advanced')).toBe(true);
  });
});

describe('copying into my workouts', () => {
  it('makes an independent Workout tagged with its template', () => {
    const r = resolveLibraryWorkout(findLibraryWorkout('lib_foundations_a')!, ['dumbbells'])!;
    const w = libraryWorkoutToWorkout(r, 'w1', new Date('2026-11-25T10:00:00Z'));
    expect(w).toMatchObject({ id: 'w1', name: 'Foundations A', library_id: 'lib_foundations_a', created_at: '2026-11-25T10:00:00.000Z' });
    w.blocks[1].items[0].target.reps = 99;
    expect(r.blocks[1].items[0].target.reps).toBe(10);
    expect(findLibraryCopy([w], 'lib_foundations_a')).toBe(w);
    expect(findLibraryCopy([w], 'lib_foundations_b')).toBeUndefined();
  });
});

describe('canSeeWorkoutLibrary', () => {
  it('is open to everyone', () => {
    expect(canSeeWorkoutLibrary({ is_admin: true })).toBe(true);
    expect(canSeeWorkoutLibrary({ is_admin: false })).toBe(true);
    expect(canSeeWorkoutLibrary(null)).toBe(true);
  });
});

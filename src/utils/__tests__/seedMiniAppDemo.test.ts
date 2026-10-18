jest.mock('../../services/firebase');

import {
  buildMeditateDemo,
  buildWorkoutDemo,
  fallbackMeditateDays,
  fallbackWorkoutDays,
} from '../seedMiniAppDemo';
import { BUILT_IN_EXERCISES } from '../../data/workoutExercises';
import { totalsOf, flattenSets, byMuscle } from '../../services/workoutStats';
import { computeRecords } from '../../services/meditateMath';

const NOW = new Date(2026, 9, 17, 12); // Sat 17 Oct 2026, local
const BY_ID = Object.fromEntries(BUILT_IN_EXERCISES.map((e) => [e.id, e]));

describe('fallback schedules', () => {
  it('trains Mon / Wed / Fri', () => {
    const days = fallbackWorkoutDays(56, NOW);
    expect(days.length).toBe(24);
    for (const d of days) {
      const date = new Date(NOW);
      date.setDate(date.getDate() - d.offset);
      expect([1, 3, 5]).toContain(date.getDay());
    }
  });

  it('meditates most days, in all three modes', () => {
    const days = fallbackMeditateDays(56);
    expect(days.length).toBeGreaterThan(35);
    expect(new Set(days.map((d) => d.mode))).toEqual(new Set(['sit', 'breathe', 'nsdr']));
  });
});

describe('buildWorkoutDemo', () => {
  const days = fallbackWorkoutDays(56, NOW);
  const sessions = buildWorkoutDemo(days, BY_ID, NOW);

  it('rotates Push, Pull and Legs, oldest first, all tagged demo', () => {
    expect(sessions.slice(0, 3).map((s) => s.workout_id)).toEqual(['starter_push', 'starter_pull', 'starter_legs']);
    expect(sessions.every((s) => s.is_demo)).toBe(true);
    expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length);
  });

  it('logs every planned set, circuits included', () => {
    const push = sessions[0];
    expect(push.total_sets).toBe(3 + 3 + 3 + 3 * 3);
    expect(push.blocks[3].sets.map((s) => s.exerciseId)).toEqual([
      'dip', 'push-up', 'plank', 'dip', 'push-up', 'plank', 'dip', 'push-up', 'plank',
    ]);
    expect(push.blocks[3].sets.find((s) => s.exerciseId === 'plank')?.seconds).toBeGreaterThan(0);
  });

  it('gets stronger over the weeks, so records get set', () => {
    const benches = sessions
      .filter((s) => s.workout_id === 'starter_push')
      .map((s) => Math.max(...s.blocks[0].sets.map((x) => x.weightKg ?? 0)));
    expect(benches[benches.length - 1]).toBeGreaterThan(benches[0]);
    expect(sessions[0].prs).toEqual([]);
    expect(sessions.some((s) => s.prs.length > 0)).toBe(true);
  });

  it('fills Stats for every body part the starters train', () => {
    const rows = flattenSets(sessions, BY_ID);
    expect(totalsOf(rows).volumeKg).toBeGreaterThan(0);
    expect(byMuscle(rows).map((m) => m.muscle).sort()).toEqual(['arms', 'back', 'chest', 'core', 'legs', 'shoulders']);
  });

  it('takes the check-in’s duration and habit when given', () => {
    const [s] = buildWorkoutDemo([{ offset: 2, habitId: 'h1', durationMin: 55 }], BY_ID, NOW);
    expect(s).toMatchObject({ habit_id: 'h1', duration_sec: 55 * 60 });
  });
});

describe('buildMeditateDemo', () => {
  const sessions = buildMeditateDemo(fallbackMeditateDays(56), 56, NOW);

  it('fills every mode with a technique, pattern or recording', () => {
    expect(sessions.every((s) => s.is_demo && s.duration_sec > 0)).toBe(true);
    expect(sessions.filter((s) => s.mode === 'sit').every((s) => !!s.technique)).toBe(true);
    expect(sessions.filter((s) => s.mode === 'breathe').every((s) => !!s.pattern && s.style === 'pacer')).toBe(true);
    expect(sessions.filter((s) => s.mode === 'nsdr').every((s) => !!s.nsdr_title)).toBe(true);
  });

  it('lengthens sits over the weeks, and gives each mode a record', () => {
    const sits = sessions.filter((s) => s.mode === 'sit' && !s.ended_early);
    expect(sits[sits.length - 1].planned_sec).toBeGreaterThan(sits[0].planned_sec);
    const records = computeRecords(sessions);
    expect(Object.keys(records).length).toBeGreaterThan(0);
  });

  it('keeps the check-in’s minutes inside the mode’s range', () => {
    const [nsdr] = buildMeditateDemo([{ offset: 0, mode: 'nsdr', durationMin: 22, habitId: 'h' }], 56, NOW);
    expect(nsdr).toMatchObject({ planned_sec: 20 * 60, habit_id: 'h', mode: 'nsdr' });
  });
});

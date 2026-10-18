import {
  archiveCustomExercise,
  deleteWorkout,
  ensureStarterWorkouts,
  listExerciseNotes,
  saveExerciseNote,
  getRecords,
  getWorkoutPrefs,
  listCustomExercises,
  listSessions,
  listWorkouts,
  mergeExerciseLibrary,
  saveCustomExercise,
  saveFinishedSession,
  saveWorkoutPrefs,
  sortWorkouts,
  stripUndefined,
} from '../labWorkouts';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';
import { STARTER_WORKOUTS } from '../../data/workoutExercises';
import { CompletedWorkoutSession, Workout } from '../../types/workouts';

const base = 'users/u1';
const NOW = new Date('2026-10-17T10:00:00.000Z');

const workout = (id: string, name: string, last_done_at?: string): Workout => ({
  id,
  name,
  blocks: [],
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
  ...(last_done_at ? { last_done_at } : {}),
});

describe('stripUndefined', () => {
  it('drops undefined at any depth and keeps falsy values', () => {
    expect(
      stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: 0 }, f: [{ g: undefined, h: '' }] })
    ).toEqual({ a: 1, c: { e: 0 }, f: [{ h: '' }] });
  });
});

describe('prefs', () => {
  it('defaults to pounds with nothing linked', async () => {
    expect(await getWorkoutPrefs('u1')).toEqual({ unit: 'lb', linked_habit_ids: [], starters_seeded: false });
  });

  it('merges a change into what is saved', async () => {
    await saveWorkoutPrefs('u1', { linked_habit_ids: ['h1'] });
    await saveWorkoutPrefs('u1', { unit: 'kg' });
    expect(await getWorkoutPrefs('u1')).toMatchObject({ unit: 'kg', linked_habit_ids: ['h1'] });
  });
});

describe('ensureStarterWorkouts', () => {
  it('copies the starters once and marks them seeded', async () => {
    const prefs = await ensureStarterWorkouts('u1', await getWorkoutPrefs('u1'), NOW);
    expect(prefs.starters_seeded).toBe(true);
    const ids = Object.keys(getMockDB()[`${base}/lab_workouts`]);
    expect(ids.sort()).toEqual(STARTER_WORKOUTS.map((s) => s.id).sort());
    expect((await getWorkoutPrefs('u1')).starters_seeded).toBe(true);
  });

  it('never brings back a starter the user deleted', async () => {
    await ensureStarterWorkouts('u1', await getWorkoutPrefs('u1'), NOW);
    await deleteWorkout('u1', 'starter_push');
    await ensureStarterWorkouts('u1', await getWorkoutPrefs('u1'), NOW);
    expect(Object.keys(getMockDB()[`${base}/lab_workouts`])).not.toContain('starter_push');
  });

  it('includes a circuit among the starters', () => {
    expect(STARTER_WORKOUTS.some((w) => w.blocks.some((b) => b.type === 'circuit'))).toBe(true);
  });
});

describe('listWorkouts', () => {
  it('puts the most recently done first, then never-done alphabetically', async () => {
    addMockDocument(`${base}/lab_workouts`, 'a', workout('a', 'Zeta'));
    addMockDocument(`${base}/lab_workouts`, 'b', workout('b', 'Alpha'));
    addMockDocument(`${base}/lab_workouts`, 'c', workout('c', 'Legs', '2026-10-10T00:00:00Z'));
    addMockDocument(`${base}/lab_workouts`, 'd', workout('d', 'Push', '2026-10-15T00:00:00Z'));
    expect((await listWorkouts('u1')).map((w) => w.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('sorts the same way in memory', () => {
    expect(sortWorkouts([workout('x', 'B'), workout('y', 'A')]).map((w) => w.id)).toEqual(['y', 'x']);
  });
});

describe('custom exercises', () => {
  it('saves one with a custom id and merges it into the library', async () => {
    const saved = await saveCustomExercise('u1', { name: '  Sled push ', kind: 'time', muscle: 'legs' });
    expect(saved).toMatchObject({ name: 'Sled push', kind: 'time', custom: true });
    expect(saved.id.startsWith('custom_')).toBe(true);
    const custom = await listCustomExercises('u1');
    expect(custom.map((e) => e.name)).toEqual(['Sled push']);
    expect(mergeExerciseLibrary(custom).some((e) => e.id === saved.id)).toBe(true);
  });

  it('refuses an unnamed exercise', async () => {
    await expect(saveCustomExercise('u1', { name: '  ', kind: 'reps', muscle: 'core' })).rejects.toThrow();
  });

  it('updates in place when given an id, keeping equipment optional', async () => {
    const saved = await saveCustomExercise('u1', { name: 'Sled push', kind: 'time', muscle: 'legs' });
    expect(getMockDB()[`${base}/lab_workout_exercises`][saved.id].data).not.toHaveProperty('equipment');
    await saveCustomExercise('u1', { id: saved.id, name: 'Sled drag', kind: 'time', muscle: 'legs', equipment: 'other' });
    const list = await listCustomExercises('u1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: saved.id, name: 'Sled drag', equipment: 'other', custom: true });
  });

  it('deletes by hiding, so history still resolves it', async () => {
    const saved = await saveCustomExercise('u1', { name: 'Sled push', kind: 'time', muscle: 'legs' });
    await archiveCustomExercise('u1', saved.id, NOW);
    const [stored] = await listCustomExercises('u1');
    expect(stored).toMatchObject({ id: saved.id, name: 'Sled push', archived_at: NOW.toISOString() });
    expect(mergeExerciseLibrary([stored]).some((e) => e.id === saved.id)).toBe(true);
  });
});

describe('exercise notes', () => {
  it('saves, edits and clears a note on any exercise', async () => {
    await saveExerciseNote('u1', 'bench-press', '  Pause at the chest ', NOW);
    await saveExerciseNote('u1', 'custom_9', 'Seat on 4', NOW);
    expect(await listExerciseNotes('u1')).toEqual({ 'bench-press': 'Pause at the chest', custom_9: 'Seat on 4' });

    await saveExerciseNote('u1', 'bench-press', '   ', NOW);
    expect(await listExerciseNotes('u1')).toEqual({ custom_9: 'Seat on 4' });
  });
});

describe('saveFinishedSession', () => {
  const session: CompletedWorkoutSession = {
    id: 's1',
    workout_id: 'w1',
    workout_name: 'Push Day',
    habit_id: undefined,
    started_at: '2026-10-17T09:30:00.000Z',
    finished_at: NOW.toISOString(),
    duration_sec: 1800,
    total_sets: 1,
    total_volume_kg: 480,
    blocks: [],
    prs: [],
  };

  it('writes the session, its records and the workout in one go', async () => {
    await saveFinishedSession('u1', {
      session,
      records: { bench: { exerciseId: 'bench', heaviestKg: 60, maxReps: undefined } },
      workout: workout('w1', 'Push Day'),
    });
    const dbState = getMockDB();
    expect(dbState[`${base}/lab_workout_sessions`].s1.data).not.toHaveProperty('habit_id');
    expect(dbState[`${base}/lab_workout_records`].bench.data).toEqual({ exerciseId: 'bench', heaviestKg: 60 });
    expect(dbState[`${base}/lab_workouts`].w1.data.last_done_at).toBe(NOW.toISOString());

    expect((await listSessions('u1')).map((s) => s.id)).toEqual(['s1']);
    expect((await getRecords('u1')).bench.heaviestKg).toBe(60);
  });

  it('never writes a check-in itself', async () => {
    await saveFinishedSession('u1', { session, records: {} });
    expect(Object.keys(getMockDB()).some((path) => path.includes('completionLogs'))).toBe(false);
  });
});

describe('listSessions', () => {
  it('returns newest first', async () => {
    const s = (id: string, finished_at: string) => ({ id, finished_at, blocks: [], prs: [] });
    addMockDocument(`${base}/lab_workout_sessions`, 'old', s('old', '2026-10-01T00:00:00Z'));
    addMockDocument(`${base}/lab_workout_sessions`, 'new', s('new', '2026-10-16T00:00:00Z'));
    expect((await listSessions('u1')).map((x) => x.id)).toEqual(['new', 'old']);
  });
});

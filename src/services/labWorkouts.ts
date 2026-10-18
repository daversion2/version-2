import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseRecord,
  Workout,
  WorkoutPrefs,
} from '../types/workouts';
import { BUILT_IN_EXERCISES, STARTER_WORKOUTS } from '../data/workoutExercises';
import type { ExerciseDraft } from './exerciseLibrary';

// =============================================================================
// Workouts (Lab) storage. Everything lives in the user's own
// users/{uid}/lab_workout_* subcollections — the wildcard rule already covers
// them, and nothing here touches completionLogs: the check-in goes through
// Today's normal path (see services/miniApps.ts).
// =============================================================================

const COL = {
  workouts: 'lab_workouts',
  sessions: 'lab_workout_sessions',
  records: 'lab_workout_records',
  exercises: 'lab_workout_exercises',
  notes: 'lab_workout_notes',
  prefs: 'lab_workout_prefs',
} as const;

const PREFS_DOC = 'main';

export const DEFAULT_WORKOUT_PREFS: WorkoutPrefs = {
  unit: 'lb',
  linked_habit_ids: [],
  starters_seeded: false,
};

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

/**
 * Firestore rejects `undefined` anywhere in a document, and this project
 * doesn't set ignoreUndefinedProperties — so optional fields are dropped here
 * rather than trusted to every caller.
 */
export const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
};

// --- Prefs -------------------------------------------------------------------

export const getWorkoutPrefs = async (userId: string): Promise<WorkoutPrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  return { ...DEFAULT_WORKOUT_PREFS, ...(snap.exists() ? (snap.data() as Partial<WorkoutPrefs>) : {}) };
};

export const saveWorkoutPrefs = async (
  userId: string,
  changes: Partial<WorkoutPrefs>
): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

// --- Workouts ----------------------------------------------------------------

/** Most recently done first; never-done ones after, alphabetically. */
export const sortWorkouts = (workouts: Workout[]): Workout[] =>
  [...workouts].sort((a, b) => {
    if (a.last_done_at && b.last_done_at) return b.last_done_at.localeCompare(a.last_done_at);
    if (a.last_done_at) return -1;
    if (b.last_done_at) return 1;
    return a.name.localeCompare(b.name);
  });

export const listWorkouts = async (userId: string): Promise<Workout[]> => {
  const snap = await getDocs(col(userId, COL.workouts));
  return sortWorkouts(snap.docs.map((d) => ({ ...(d.data() as Workout), id: d.id })));
};

export const saveWorkout = async (userId: string, workout: Workout): Promise<void> => {
  await setDoc(ref(userId, COL.workouts, workout.id), stripUndefined(workout));
};

export const deleteWorkout = async (userId: string, workoutId: string): Promise<void> => {
  await deleteDoc(ref(userId, COL.workouts, workoutId));
};

export const newWorkoutId = (userId: string): string => doc(col(userId, COL.workouts)).id;

/**
 * Copies Push/Pull/Legs into the user's workouts the first time, then never
 * again — delete a starter and it stays deleted.
 */
export const ensureStarterWorkouts = async (
  userId: string,
  prefs: WorkoutPrefs,
  now: Date = new Date()
): Promise<WorkoutPrefs> => {
  if (prefs.starters_seeded) return prefs;
  const batch = writeBatch(db);
  const stamp = now.toISOString();
  for (const starter of STARTER_WORKOUTS) {
    batch.set(
      ref(userId, COL.workouts, starter.id),
      stripUndefined({ ...starter, created_at: stamp, updated_at: stamp })
    );
  }
  batch.set(ref(userId, COL.prefs, PREFS_DOC), { starters_seeded: true }, { merge: true });
  await batch.commit();
  return { ...prefs, starters_seeded: true };
};

// --- Exercises ---------------------------------------------------------------

export const listCustomExercises = async (userId: string): Promise<Exercise[]> => {
  const snap = await getDocs(col(userId, COL.exercises));
  return snap.docs.map((d) => ({ ...(d.data() as Exercise), id: d.id, custom: true }));
};

/**
 * Every exercise a session can name — built-ins plus the user's own, deleted
 * ones included, since history still shows them. Pickers narrow this with
 * activeExercises (services/exerciseLibrary.ts).
 */
export const mergeExerciseLibrary = (custom: Exercise[]): Exercise[] =>
  [...BUILT_IN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Creates one of the user's own exercises, or — with `id` — updates it. Only
 * the fields the user edits are written; `custom` is implied by the collection.
 */
export const saveCustomExercise = async (
  userId: string,
  input: ExerciseDraft & { id?: string }
): Promise<Exercise> => {
  const name = input.name.trim();
  if (!name) throw new Error('An exercise needs a name.');
  const id = input.id ?? `custom_${doc(col(userId, COL.exercises)).id}`;
  const stored = stripUndefined({ id, name, kind: input.kind, muscle: input.muscle, equipment: input.equipment });
  await setDoc(ref(userId, COL.exercises, id), stored);
  return { ...stored, custom: true };
};

/** "Delete": hidden from the picker; history, records and workouts still resolve it. */
export const archiveCustomExercise = async (
  userId: string,
  exerciseId: string,
  now: Date = new Date()
): Promise<void> => {
  await setDoc(ref(userId, COL.exercises, exerciseId), { archived_at: now.toISOString() }, { merge: true });
};

// --- Notes (form cues) — on any exercise, built-in or the user's own ---------

export const listExerciseNotes = async (userId: string): Promise<Record<string, string>> => {
  const snap = await getDocs(col(userId, COL.notes));
  const out: Record<string, string> = {};
  snap.docs.forEach((d) => {
    const text = (d.data() as { text?: string }).text;
    if (text) out[d.id] = text;
  });
  return out;
};

/** Blank clears the note rather than storing an empty one. */
export const saveExerciseNote = async (
  userId: string,
  exerciseId: string,
  text: string,
  now: Date = new Date()
): Promise<void> => {
  const trimmed = text.trim();
  if (!trimmed) {
    await deleteDoc(ref(userId, COL.notes, exerciseId));
    return;
  }
  await setDoc(ref(userId, COL.notes, exerciseId), { text: trimmed, updated_at: now.toISOString() });
};

// --- Sessions & records --------------------------------------------------------

export const listSessions = async (
  userId: string,
  max = 100
): Promise<CompletedWorkoutSession[]> => {
  const snap = await getDocs(
    query(col(userId, COL.sessions), orderBy('finished_at', 'desc'), limit(max))
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as CompletedWorkoutSession), id: d.id }))
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
    .slice(0, max);
};

export const getRecords = async (userId: string): Promise<Record<string, ExerciseRecord>> => {
  const snap = await getDocs(col(userId, COL.records));
  const out: Record<string, ExerciseRecord> = {};
  snap.docs.forEach((d) => {
    out[d.id] = { ...(d.data() as ExerciseRecord), exerciseId: d.id };
  });
  return out;
};

/**
 * One batch: the session, every record it touched, and the workout it ran —
 * stamped as just done, with the user's chosen plan changes when there are any.
 */
export const saveFinishedSession = async (
  userId: string,
  input: {
    session: CompletedWorkoutSession;
    records: Record<string, ExerciseRecord>;
    /** The workout to write back — the edited plan, or just a new last_done_at. */
    workout?: Workout;
  }
): Promise<void> => {
  const batch = writeBatch(db);
  batch.set(ref(userId, COL.sessions, input.session.id), stripUndefined(input.session));
  for (const [exerciseId, record] of Object.entries(input.records)) {
    batch.set(ref(userId, COL.records, exerciseId), stripUndefined(record));
  }
  if (input.workout) {
    batch.set(
      ref(userId, COL.workouts, input.workout.id),
      stripUndefined({ ...input.workout, last_done_at: input.session.finished_at })
    );
  }
  await batch.commit();
};

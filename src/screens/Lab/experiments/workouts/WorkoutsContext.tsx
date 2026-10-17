import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseKind,
  ExerciseRecord,
  MuscleGroup,
  Workout,
  WorkoutPrefs,
  WorkoutSession,
} from '../../../../types/workouts';
import {
  DEFAULT_WORKOUT_PREFS,
  deleteWorkout,
  ensureStarterWorkouts,
  getRecords,
  getWorkoutPrefs,
  listCustomExercises,
  listSessions,
  listWorkouts,
  mergeExerciseLibrary,
  saveCustomExercise,
  saveWorkout,
  saveWorkoutPrefs,
  sortWorkouts,
} from '../../../../services/labWorkouts';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { finishSession, isHabitLinkedToMiniApp } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { makeId, startSession } from '../../../../services/workoutSession';

const APP = 'workouts' as const;

const UNKNOWN_EXERCISE: Exercise = { id: 'unknown', name: 'Exercise', kind: 'weight', muscle: 'full_body' };

interface WorkoutsContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  prefs: WorkoutPrefs;
  updatePrefs: (changes: Partial<WorkoutPrefs>) => Promise<void>;

  exercises: Exercise[];
  exercisesById: Record<string, Exercise>;
  /** Never undefined — a deleted custom exercise still renders as something. */
  exercise: (id: string) => Exercise;
  addCustomExercise: (input: { name: string; kind: ExerciseKind; muscle: MuscleGroup }) => Promise<Exercise>;

  workouts: Workout[];
  upsertWorkout: (workout: Workout) => Promise<void>;
  removeWorkout: (workoutId: string) => Promise<void>;

  sessions: CompletedWorkoutSession[];
  records: Record<string, ExerciseRecord>;

  /** Active habits, for linking and for the summary's "check off" choice. */
  habits: PracticeInstance[];
  linkedHabits: PracticeInstance[];
  /** The habit whose Start button opened the app, if one did. */
  launchHabitId?: string;

  session: WorkoutSession | null;
  updateSession: (next: WorkoutSession) => void;
  beginSession: (workout?: Workout) => WorkoutSession;
  discardSession: () => Promise<void>;
  /** After a successful save: fold it into what's on screen and drop the draft. */
  recordFinished: (input: {
    completed: CompletedWorkoutSession;
    records: Record<string, ExerciseRecord>;
    workout?: Workout;
  }) => void;

  closeApp: () => void;
  /** Close the app and hand the habit back to Today to rate and celebrate. */
  closeAndCheckOff: (habitId: string, durationSec: number) => void;
}

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

export const useWorkouts = (): WorkoutsContextValue => {
  const value = useContext(WorkoutsContext);
  if (!value) throw new Error('useWorkouts must be used inside WorkoutsProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const WorkoutsProvider: React.FC<{
  userId: string;
  launchHabitId?: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutsApp'>;
  children: React.ReactNode;
}> = ({ userId, launchHabitId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<WorkoutPrefs>(DEFAULT_WORKOUT_PREFS);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<CompletedWorkoutSession[]>([]);
  const [records, setRecords] = useState<Record<string, ExerciseRecord>>({});
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const sessionRef = useRef<WorkoutSession | null>(null);

  // The draft is read on its own, before anything from the network: an
  // interrupted workout should resume even with no signal.
  useEffect(() => {
    loadSessionDraft<WorkoutSession>(APP, userId)
      .then((draft) => {
        if (!draft || sessionRef.current) return;
        const resumed =
          launchHabitId && !draft.data.habitId ? { ...draft.data, habitId: launchHabitId } : draft.data;
        sessionRef.current = resumed;
        setSession(resumed);
      })
      .catch((e) => console.warn('Workouts: could not read the saved session:', e));
  }, [userId, launchHabitId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const seeded = await ensureStarterWorkouts(userId, await getWorkoutPrefs(userId));
      const [w, custom, s, r, h] = await Promise.all([
        listWorkouts(userId),
        listCustomExercises(userId),
        listSessions(userId),
        getRecords(userId),
        getActiveHabits(userId),
      ]);
      setPrefs(seeded);
      setWorkouts(w);
      setCustomExercises(custom);
      setSessions(s);
      setRecords(r);
      setHabits(h.filter((habit) => !habit.archived_at));
    } catch (e) {
      console.warn('Workouts: load failed:', e);
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const exercises = useMemo(() => mergeExerciseLibrary(customExercises), [customExercises]);
  const exercisesById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e])) as Record<string, Exercise>,
    [exercises]
  );
  const exercise = useCallback(
    (id: string) => exercisesById[id] ?? { ...UNKNOWN_EXERCISE, id },
    [exercisesById]
  );

  const linkedHabits = useMemo(
    () => habits.filter((h) => isHabitLinkedToMiniApp(APP, h, prefs.linked_habit_ids)),
    [habits, prefs.linked_habit_ids]
  );

  const updatePrefs = useCallback(
    async (changes: Partial<WorkoutPrefs>) => {
      setPrefs((p) => ({ ...p, ...changes }));
      await saveWorkoutPrefs(userId, changes);
    },
    [userId]
  );

  const addCustomExercise = useCallback(
    async (input: { name: string; kind: ExerciseKind; muscle: MuscleGroup }) => {
      const saved = await saveCustomExercise(userId, input);
      setCustomExercises((list) => [...list, saved]);
      return saved;
    },
    [userId]
  );

  const upsertWorkout = useCallback(
    async (workout: Workout) => {
      await saveWorkout(userId, workout);
      setWorkouts((list) => sortWorkouts([...list.filter((w) => w.id !== workout.id), workout]));
    },
    [userId]
  );

  const removeWorkout = useCallback(
    async (workoutId: string) => {
      await deleteWorkout(userId, workoutId);
      setWorkouts((list) => list.filter((w) => w.id !== workoutId));
    },
    [userId]
  );

  const updateSession = useCallback(
    (next: WorkoutSession) => {
      sessionRef.current = next;
      setSession(next);
      saveSessionDraft(APP, userId, next).catch((e) =>
        console.warn('Workouts: could not save the session draft:', e)
      );
    },
    [userId]
  );

  const beginSession = useCallback(
    (workout?: Workout) => {
      const next = startSession({
        id: makeId('session'),
        workout,
        name: 'Empty workout',
        habitId: launchHabitId,
        now: new Date(),
      });
      updateSession(next);
      return next;
    },
    [launchHabitId, updateSession]
  );

  const discardSession = useCallback(async () => {
    sessionRef.current = null;
    setSession(null);
    await clearSessionDraft(APP, userId);
  }, [userId]);

  const recordFinished = useCallback<WorkoutsContextValue['recordFinished']>(
    ({ completed, records: touched, workout }) => {
      setSessions((list) => [completed, ...list.filter((s) => s.id !== completed.id)]);
      setRecords((all) => ({ ...all, ...touched }));
      if (workout) {
        const stamped = { ...workout, last_done_at: completed.finished_at };
        setWorkouts((list) => sortWorkouts([...list.filter((w) => w.id !== workout.id), stamped]));
      }
      sessionRef.current = null;
      setSession(null);
      clearSessionDraft(APP, userId).catch((e) => console.warn('Workouts: draft not cleared:', e));
    },
    [userId]
  );

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const closeAndCheckOff = useCallback(
    (habitId: string, durationSec: number) => {
      finishSession({ appId: APP, habitId, durationSec });
      if (launchHabitId) {
        rootNavigation.goBack();
      } else {
        // Opened from the Lab, not Today: land on Today, where the rating and
        // the celebration live. One action, so nothing runs from a closed screen.
        rootNavigation.popTo('Main', { screen: 'Home', params: { screen: 'HomeScreen', pop: true } });
      }
    },
    [rootNavigation, launchHabitId]
  );

  const value: WorkoutsContextValue = {
    userId,
    loading,
    loadError,
    reload,
    prefs,
    updatePrefs,
    exercises,
    exercisesById,
    exercise,
    addCustomExercise,
    workouts,
    upsertWorkout,
    removeWorkout,
    sessions,
    records,
    habits,
    linkedHabits,
    launchHabitId,
    session,
    updateSession,
    beginSession,
    discardSession,
    recordFinished,
    closeApp,
    closeAndCheckOff,
  };

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
};

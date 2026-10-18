import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseRecord,
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
  archiveCustomExercise,
  listExerciseNotes,
  listSessions,
  listWorkouts,
  mergeExerciseLibrary,
  saveCustomExercise,
  saveExerciseNote,
  saveWorkout,
  saveWorkoutPrefs,
  sortWorkouts,
} from '../../../../services/labWorkouts';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { finishSession, isHabitLinkedToMiniApp } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { makeId, startSession } from '../../../../services/workoutSession';
import { activeExercises, ExerciseDraft, isExerciseUsed } from '../../../../services/exerciseLibrary';

const APP = 'workouts' as const;
/** A ceiling, not a page size — years of training for one person. */
const ALL_SESSIONS = 5000;

const UNKNOWN_EXERCISE: Exercise = { id: 'unknown', name: 'Exercise', kind: 'weight', muscle: 'full_body' };

interface WorkoutsContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  prefs: WorkoutPrefs;
  updatePrefs: (changes: Partial<WorkoutPrefs>) => Promise<void>;

  /** What can be picked: built-ins plus the user's own, minus deleted ones. */
  exercises: Exercise[];
  /** Every exercise, deleted ones included — history still names them. */
  exercisesById: Record<string, Exercise>;
  /** Never undefined — an unknown id still renders as something. */
  exercise: (id: string) => Exercise;
  /** Create (no id) or update one of the user's own exercises. */
  saveExercise: (input: ExerciseDraft & { id?: string }) => Promise<Exercise>;
  archiveExercise: (exerciseId: string) => Promise<void>;
  /** Logged at least once — its logging type is locked. */
  isExerciseUsed: (exerciseId: string) => boolean;
  /** Form cues, keyed by exercise id, on built-ins and the user's own alike. */
  notes: Record<string, string>;
  saveNote: (exerciseId: string, text: string) => Promise<void>;

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
  const [notes, setNotes] = useState<Record<string, string>>({});
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
      const [w, custom, s, r, h, n] = await Promise.all([
        listWorkouts(userId),
        listCustomExercises(userId),
        // All of them: Stats' "All" span means all, not the last 100.
        listSessions(userId, ALL_SESSIONS),
        getRecords(userId),
        getActiveHabits(userId),
        listExerciseNotes(userId),
      ]);
      setPrefs(seeded);
      setWorkouts(w);
      setCustomExercises(custom);
      setSessions(s);
      setRecords(r);
      setHabits(h.filter((habit) => !habit.archived_at));
      setNotes(n);
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

  const allExercises = useMemo(() => mergeExerciseLibrary(customExercises), [customExercises]);
  const exercises = useMemo(() => activeExercises(allExercises), [allExercises]);
  const exercisesById = useMemo(
    () => Object.fromEntries(allExercises.map((e) => [e.id, e])) as Record<string, Exercise>,
    [allExercises]
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

  const saveExercise = useCallback(
    async (input: ExerciseDraft & { id?: string }) => {
      const saved = await saveCustomExercise(userId, input);
      setCustomExercises((list) => [...list.filter((e) => e.id !== saved.id), saved]);
      return saved;
    },
    [userId]
  );

  const archiveExercise = useCallback(
    async (exerciseId: string) => {
      const now = new Date();
      await archiveCustomExercise(userId, exerciseId, now);
      setCustomExercises((list) =>
        list.map((e) => (e.id === exerciseId ? { ...e, archived_at: now.toISOString() } : e))
      );
    },
    [userId]
  );

  const saveNote = useCallback(
    async (exerciseId: string, text: string) => {
      await saveExerciseNote(userId, exerciseId, text);
      setNotes((all) => {
        const next = { ...all };
        if (text.trim()) next[exerciseId] = text.trim();
        else delete next[exerciseId];
        return next;
      });
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

  const exerciseUsed = useCallback(
    (exerciseId: string) => isExerciseUsed(exerciseId, { records, sessions, session }),
    [records, sessions, session]
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
    saveExercise,
    archiveExercise,
    isExerciseUsed: exerciseUsed,
    notes,
    saveNote,
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

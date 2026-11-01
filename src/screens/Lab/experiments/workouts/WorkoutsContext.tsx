import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseRecord,
  ExerciseTest,
  TrainingPhase,
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
  listExerciseTests,
  listPhases,
  listSessions,
  listWorkouts,
  mergeExerciseLibrary,
  saveCustomExercise,
  saveExerciseNote,
  saveExerciseTest,
  savePhase,
  saveSessionChange,
  saveWorkout,
  saveWorkoutPrefs,
  sortWorkouts,
} from '../../../../services/labWorkouts';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { finishSession } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { makeId, startSession } from '../../../../services/workoutSession';
import { activeExercises, ExerciseDraft, isExerciseUsed } from '../../../../services/exerciseLibrary';
import { currentPhase as findCurrentPhase, isLighterWeek, lightenSession } from '../../../../services/trainingPhases';
import { toLocalDateString } from '../../../../utils/date';
import { addLoggedSets, logSessionId, recordsFor, replaceSession, shouldAskCheckin } from '../../../../services/weeklyVolume';
import type { PersonalRecord, SetValues } from '../../../../types/workouts';

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

  /** Every training phase, newest first. */
  phases: TrainingPhase[];
  /** The phase waiting on its baseline or in training, if there is one. */
  currentPhase?: TrainingPhase;
  upsertPhase: (phase: TrainingPhase) => Promise<void>;

  /** Standalone tests (services/exerciseTests.ts), newest first. */
  tests: ExerciseTest[];
  addTest: (test: ExerciseTest) => Promise<void>;
  /** Workouts written outside upsertWorkout (a template's), folded into state. */
  addWorkoutsLocally: (workouts: Workout[]) => void;

  /** Active habits on the account. */
  habits: PracticeInstance[];
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

  /**
   * This week: sets added to today's logged-sets session. `askCheckin` says
   * this was the day's first and "rate it now?" should be asked — it's
   * already marked as asked, so it never comes up twice.
   */
  logSets: (exercise: Exercise, values: SetValues, count: number) => Promise<{ askCheckin: boolean; prs: PersonalRecord[]; session: CompletedWorkoutSession }>;
  /** This week: a session rewritten or (null) deleted, and its records rebuilt. */
  changeSession: (sessionId: string, next: CompletedWorkoutSession | null, exerciseIds: string[]) => Promise<void>;
  /** Today's logged sets, handed to Today to be rated. Closes the app. */
  rateLoggedSets: (log: CompletedWorkoutSession) => Promise<void>;

  closeApp: () => void;
  /**
   * Close the app and hand the session back to Today, which rates it as the
   * Workouts check-in (services/appCheckins.ts). `date` for a past session.
   */
  /** `sessionId`: the saved session, for a finished workout; absent for a past session. */
  closeAndCheckOff: (durationSec: number, date?: string, sessionId?: string) => void;
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
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [tests, setTests] = useState<ExerciseTest[]>([]);
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
      const [w, custom, s, r, h, n, ph, t] = await Promise.all([
        listWorkouts(userId),
        listCustomExercises(userId),
        // All of them: Stats' "All" span means all, not the last 100.
        listSessions(userId, ALL_SESSIONS),
        getRecords(userId),
        getActiveHabits(userId),
        listExerciseNotes(userId),
        listPhases(userId),
        listExerciseTests(userId),
      ]);
      setPrefs(seeded);
      setWorkouts(w);
      setCustomExercises(custom);
      setSessions(s);
      setRecords(r);
      setHabits(h.filter((habit) => !habit.archived_at));
      setNotes(n);
      setPhases(ph);
      setTests(t);
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

  const currentPhase = useMemo(() => findCurrentPhase(phases), [phases]);

  const upsertPhase = useCallback(
    async (phase: TrainingPhase) => {
      await savePhase(userId, phase);
      setPhases((list) =>
        [phase, ...list.filter((p) => p.id !== phase.id)].sort(
          (a, b) => b.start_date.localeCompare(a.start_date) || b.number - a.number || b.created_at.localeCompare(a.created_at)
        )
      );
    },
    [userId]
  );

  const addTest = useCallback(
    async (test: ExerciseTest) => {
      await saveExerciseTest(userId, test);
      setTests((list) => [test, ...list.filter((t) => t.id !== test.id)]);
    },
    [userId]
  );

  const addWorkoutsLocally = useCallback((added: Workout[]) => {
    if (!added.length) return;
    setWorkouts((list) => sortWorkouts([...list.filter((w) => !added.some((a) => a.id === w.id)), ...added]));
  }, []);

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

  // A program workout started while its phase is training counts toward
  // that phase, from wherever it was started — and runs light in a light week.
  const beginSession = useCallback(
    (workout?: Workout) => {
      const now = new Date();
      const phase =
        workout && currentPhase?.status === 'training' && currentPhase.workout_ids.includes(workout.id)
          ? currentPhase
          : undefined;
      let next = startSession({
        id: makeId('session'),
        workout,
        name: 'Empty workout',
        habitId: launchHabitId,
        phaseId: phase?.id,
        now,
      });
      if (phase && isLighterWeek(phase, toLocalDateString(now))) next = lightenSession(next);
      updateSession(next);
      return next;
    },
    [launchHabitId, updateSession, currentPhase]
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

  // Kept in a ref too: two quick adds in a row must both land on the same day's doc.
  const sessionsRef = useRef<CompletedWorkoutSession[]>([]);
  sessionsRef.current = sessions;

  const changeSession = useCallback<WorkoutsContextValue['changeSession']>(
    async (sessionId, next, exerciseIds) => {
      const nextSessions = replaceSession(sessionsRef.current, sessionId, next);
      const touched = recordsFor(nextSessions, exercisesById, exerciseIds);
      await saveSessionChange(userId, { sessionId, session: next, records: touched });
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      setRecords((all) => ({ ...all, ...touched }));
    },
    [userId, exercisesById]
  );

  const logSets = useCallback<WorkoutsContextValue['logSets']>(
    async (ex, values, count) => {
      const now = new Date();
      const id = logSessionId(toLocalDateString(now));
      const existing = sessionsRef.current.find((s) => s.id === id);
      const { session: built, record, prs } = addLoggedSets({ existing, exercise: ex, values, count, records, exercisesById, now });
      const askCheckin = shouldAskCheckin(sessionsRef.current, built);
      const next = askCheckin ? { ...built, checkin_asked_at: now.toISOString() } : built;
      await saveSessionChange(userId, { sessionId: id, session: next, records: { [ex.id]: record } });
      const nextSessions = replaceSession(sessionsRef.current, id, next);
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      setRecords((all) => ({ ...all, [ex.id]: record }));
      return { askCheckin, prs, session: next };
    },
    [userId, records, exercisesById]
  );

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const closeAndCheckOff = useCallback(
    (durationSec: number, date?: string, sessionId?: string) => {
      finishSession({ appId: APP, durationSec, ...(date ? { date } : {}), ...(sessionId ? { sessionId } : {}) });
      // Land on Today, where the rating and the celebration live — from its
      // card or from the Lab alike. One action, so nothing runs from a closed screen.
      rootNavigation.popTo('Main', { screen: 'Home', params: { screen: 'HomeScreen', pop: true } });
    },
    [rootNavigation]
  );

  const rateLoggedSets = useCallback(
    async (log: CompletedWorkoutSession) => {
      // The newest copy: sets added since `log` was read must not be overwritten.
      const latest = sessionsRef.current.find((s) => s.id === log.id) ?? log;
      const sent = { ...latest, checkin_sent_at: new Date().toISOString() };
      await saveSessionChange(userId, { sessionId: log.id, session: sent, records: {} });
      sessionsRef.current = replaceSession(sessionsRef.current, log.id, sent);
      setSessions(sessionsRef.current);
      // No real duration for a day of logged sets: the sheet's own default stands.
      closeAndCheckOff(0, undefined, log.id);
    },
    [userId, closeAndCheckOff]
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
    phases,
    currentPhase,
    upsertPhase,
    tests,
    addTest,
    addWorkoutsLocally,
    habits,
    launchHabitId,
    session,
    updateSession,
    beginSession,
    discardSession,
    recordFinished,
    logSets,
    changeSession,
    rateLoggedSets,
    closeApp,
    closeAndCheckOff,
  };

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
};

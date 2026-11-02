import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  isTimeoutError,
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
  SAVE_TIMEOUT_MS,
  saveSessionChange,
  saveWorkout,
  saveWorkoutPrefs,
  sortWorkouts,
  withTimeout,
} from '../../../../services/labWorkouts';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { finishSession } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { makeId, startSession } from '../../../../services/workoutSession';
import {
  activeExercises,
  ExerciseDraft,
  hiddenExercises as findHiddenExercises,
  isExerciseUsed,
  visibleExercises,
  withExerciseHidden,
} from '../../../../services/exerciseLibrary';
import { showAlert } from '../../../../utils/alert';
import { currentPhase as findCurrentPhase, isLighterWeek, lightenSession } from '../../../../services/trainingPhases';
import { toLocalDateString } from '../../../../utils/date';
import { addLoggedSets, applySessionChange, logSessionId, replaceSession, shouldAskCheckin } from '../../../../services/weeklyVolume';
import type { PersonalRecord, SetValues } from '../../../../types/workouts';

const APP = 'workouts' as const;
/** A ceiling, not a page size — years of training for one person. */
const ALL_SESSIONS = 5000;

const UNKNOWN_EXERCISE: Exercise = { id: 'unknown', name: 'Exercise', kind: 'weight', muscle: 'full_body' };

/** What's on screen once it has loaded — trusted enough to build a save on. */
export interface LoadedWorkouts {
  sessions: CompletedWorkoutSession[];
  records: Record<string, ExerciseRecord>;
  workouts: Workout[];
  prefs: WorkoutPrefs;
}

/**
 * A save that timed out offline is still queued and lands once the phone is
 * back online — so it stays on screen, and this says it isn't there yet.
 */
export const showNotSavedYet = () =>
  showAlert('Not saved yet', 'No connection right now. It saves once you’re back online — keep the app open till then.');

interface WorkoutsContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  /** Resolves true when everything loaded. */
  reload: () => Promise<boolean>;
  /**
   * Before a save that builds on loaded data: retries a failed load, and
   * throws if it still can't — saving on top of the empty defaults a failed
   * load leaves would overwrite real records, days and settings.
   */
  ensureLoaded: () => Promise<LoadedWorkouts>;

  prefs: WorkoutPrefs;
  updatePrefs: (changes: Partial<WorkoutPrefs>) => Promise<void>;

  /** What can be picked: built-ins plus the user's own, minus deleted and hidden ones. */
  exercises: Exercise[];
  /** Hidden from the picker by the user (Settings → Hidden exercises), A–Z. */
  hiddenExercises: Exercise[];
  /** Hide an exercise from the picker, or bring it back. Never touches history. */
  setExerciseHidden: (exerciseId: string, hidden: boolean) => Promise<void>;
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
  // Hiding two exercises in quick succession must build on the first.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<CompletedWorkoutSession[]>([]);
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

  // Only a load that succeeded makes what's on screen safe to save on top of.
  // A later refresh that fails (no signal) leaves the good data in place.
  const loadedRef = useRef(false);
  const loadingRef = useRef<Promise<boolean> | null>(null);
  const [records, setRecords] = useState<Record<string, ExerciseRecord>>({});
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const workoutsRef = useRef(workouts);
  workoutsRef.current = workouts;
  // Kept in a ref too: two quick adds in a row must both land on the same day's doc.
  const sessionsRef = useRef<CompletedWorkoutSession[]>([]);
  sessionsRef.current = sessions;

  const load = useCallback(async (): Promise<boolean> => {
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
      prefsRef.current = seeded;
      workoutsRef.current = w;
      sessionsRef.current = s;
      recordsRef.current = r;
      setPrefs(seeded);
      setWorkouts(w);
      setCustomExercises(custom);
      setSessions(s);
      setRecords(r);
      setHabits(h.filter((habit) => !habit.archived_at));
      setNotes(n);
      setPhases(ph);
      setTests(t);
      loadedRef.current = true;
      return true;
    } catch (e) {
      console.warn('Workouts: load failed:', e);
      setLoadError(errorText(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const reload = useCallback((): Promise<boolean> => {
    const run = load();
    loadingRef.current = run;
    run.then(() => {
      if (loadingRef.current === run) loadingRef.current = null;
    });
    return run;
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Opened with no signal: try again when the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !loadedRef.current && !loadingRef.current) reload();
    });
    return () => sub.remove();
  }, [reload]);

  const ensureLoaded = useCallback(async (): Promise<LoadedWorkouts> => {
    if (!loadedRef.current) await (loadingRef.current ?? reload());
    if (!loadedRef.current) throw new Error('Workouts not loaded');
    return {
      sessions: sessionsRef.current,
      records: recordsRef.current,
      workouts: workoutsRef.current,
      prefs: prefsRef.current,
    };
  }, [reload]);

  const allExercises = useMemo(() => mergeExerciseLibrary(customExercises), [customExercises]);
  const active = useMemo(() => activeExercises(allExercises), [allExercises]);
  const exercises = useMemo(() => visibleExercises(active, prefs.hidden_exercise_ids), [active, prefs.hidden_exercise_ids]);
  const hiddenExercises = useMemo(
    () => findHiddenExercises(active, prefs.hidden_exercise_ids),
    [active, prefs.hidden_exercise_ids]
  );
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
      // Lists and maps here are built from what's on screen — never from defaults.
      await ensureLoaded();
      prefsRef.current = { ...prefsRef.current, ...changes };
      setPrefs((p) => ({ ...p, ...changes }));
      await saveWorkoutPrefs(userId, changes);
    },
    [userId, ensureLoaded]
  );

  const setExerciseHidden = useCallback(
    async (exerciseId: string, hidden: boolean) => {
      // The whole list is written: built on a list that never loaded, it would
      // replace every exercise hidden before with just this one.
      try {
        await ensureLoaded();
      } catch {
        showAlert("Couldn't save that", 'Check your connection and try again.');
        return;
      }
      const before = prefsRef.current.hidden_exercise_ids ?? [];
      const next = withExerciseHidden(before, exerciseId, hidden);
      prefsRef.current = { ...prefsRef.current, hidden_exercise_ids: next };
      setPrefs((p) => ({ ...p, hidden_exercise_ids: next }));
      try {
        await saveWorkoutPrefs(userId, { hidden_exercise_ids: next });
      } catch (e) {
        console.warn('Workouts: could not save hidden exercises:', e);
        // Undo just this one, keeping any change made since.
        const undone = withExerciseHidden(prefsRef.current.hidden_exercise_ids, exerciseId, !hidden);
        prefsRef.current = { ...prefsRef.current, hidden_exercise_ids: undone };
        setPrefs((p) => ({ ...p, hidden_exercise_ids: undone }));
        showAlert("Couldn't save that", 'Check your connection and try again.');
      }
    },
    [userId, ensureLoaded]
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
        // Only a unit that loaded; otherwise screens fall back to prefs once they do.
        unit: loadedRef.current ? prefsRef.current.unit : undefined,
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

  /** Puts sessions (and records) on screen now, ahead of the save. */
  const showSessions = (next: CompletedWorkoutSession[], nextRecords?: Record<string, ExerciseRecord>) => {
    sessionsRef.current = next;
    setSessions(next);
    if (nextRecords) {
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
    }
  };

  // Every change below goes on screen before its save is sent. Offline the
  // save is queued and can take any time: the next change has to build on
  // this one, or it would overwrite it once both land. A save that times out
  // stays (it's queued); one refused outright is taken back off.
  const changeSession = useCallback<WorkoutsContextValue['changeSession']>(
    async (sessionId, next, exerciseIds) => {
      const { sessions: before, records: recordsBefore } = await ensureLoaded();
      const out = applySessionChange({ sessions: before, sessionId, next, exercisesById, exerciseIds });
      showSessions(out.sessions, { ...recordsBefore, ...out.records });
      try {
        await withTimeout(saveSessionChange(userId, { sessionId, session: out.session, records: out.records }), SAVE_TIMEOUT_MS);
      } catch (e) {
        if (!isTimeoutError(e) && sessionsRef.current === out.sessions) showSessions(before, recordsBefore);
        throw e;
      }
    },
    [userId, exercisesById, ensureLoaded]
  );

  const logSets = useCallback<WorkoutsContextValue['logSets']>(
    async (ex, values, count) => {
      await ensureLoaded();
      const now = new Date();
      const id = logSessionId(toLocalDateString(now));
      const before = sessionsRef.current;
      const recordsBefore = recordsRef.current;
      const existing = before.find((s) => s.id === id);
      const { session: built, record, prs } = addLoggedSets({ existing, exercise: ex, values, count, records: recordsBefore, exercisesById, now });
      const askCheckin = shouldAskCheckin(before, built);
      const next = askCheckin ? { ...built, checkin_asked_at: now.toISOString() } : built;
      const nextSessions = replaceSession(before, id, next);
      showSessions(nextSessions, { ...recordsBefore, [ex.id]: record });
      try {
        await withTimeout(saveSessionChange(userId, { sessionId: id, session: next, records: { [ex.id]: record } }), SAVE_TIMEOUT_MS);
      } catch (e) {
        // Refused, not just slow: take these sets back off — unless more went on top since.
        if (!isTimeoutError(e) && sessionsRef.current === nextSessions) showSessions(before, recordsBefore);
        throw e;
      }
      return { askCheckin, prs, session: next };
    },
    [userId, exercisesById, ensureLoaded]
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
      const { sessions: before } = await ensureLoaded();
      // The newest copy: sets added since `log` was read must not be overwritten.
      const latest = before.find((s) => s.id === log.id) ?? log;
      const sent = { ...latest, checkin_sent_at: new Date().toISOString() };
      const nextSessions = replaceSession(before, log.id, sent);
      showSessions(nextSessions);
      try {
        await withTimeout(saveSessionChange(userId, { sessionId: log.id, session: sent, records: {} }), SAVE_TIMEOUT_MS);
      } catch (e) {
        // Timed out: the "sent" mark is queued and lands later, so the rating
        // goes ahead — stopping here would hide the card with nothing rated.
        if (!isTimeoutError(e)) {
          if (sessionsRef.current === nextSessions) showSessions(before);
          throw e;
        }
      }
      // No real duration for a day of logged sets: the sheet's own default stands.
      closeAndCheckOff(0, undefined, log.id);
    },
    [userId, closeAndCheckOff, ensureLoaded]
  );

  const value: WorkoutsContextValue = {
    userId,
    loading,
    loadError,
    reload,
    ensureLoaded,
    prefs,
    updatePrefs,
    exercises,
    hiddenExercises,
    setExerciseHidden,
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

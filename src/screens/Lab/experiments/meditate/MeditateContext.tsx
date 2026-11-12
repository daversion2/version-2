import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import { CompletedMeditateSession, GuidedRecording, MeditatePrefs, MeditateSession } from '../../../../types/meditate';
import {
  DEFAULT_MEDITATE_PREFS,
  getMeditatePrefs,
  listGuidedRecordings,
  listMeditateSessions,
  newMeditateId,
  saveMeditatePrefs,
} from '../../../../services/labMeditate';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { finishSession } from '../../../../services/miniApps';
import { recordAbandonedStart } from '../../../../services/overrideStarts';
import { toLocalDateString } from '../../../../utils/date';
import { getActiveHabits } from '../../../../services/practices';
import { checkinChoices, endSession, startSession } from '../../../../services/meditateMath';
import {
  BellPermission,
  cancelBell,
  getBellPermission,
  requestBellPermission,
  scheduleBell,
} from '../../../../services/sessionBell';
import { formatMinutes } from '../../../../services/sessionTimer';

const APP = 'meditate' as const;

type StartInput = Omit<Parameters<typeof startSession>[0], 'id' | 'now' | 'habitId'>;

interface MeditateContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  prefs: MeditatePrefs;
  updatePrefs: (changes: Partial<MeditatePrefs>) => Promise<void>;

  /** Newest first. */
  sessions: CompletedMeditateSession[];

  /** Published guided recordings; empty if none (or they couldn't load — see guidedStatus). */
  guided: GuidedRecording[];
  /** Whether the guided catalog has loaded, is loading, or failed (and can be retried). */
  guidedStatus: GuidedStatus;
  /** Fetches the catalog again; a no-op while a fetch is already running. */
  reloadGuided: () => void;

  habits: PracticeInstance[];
  /** The habit whose Start button opened the app, if one did. */
  launchHabit?: PracticeInstance;
  launchHabitId?: string;

  /** Whether a bell can ring — re-read whenever the app comes back to the front. */
  bellPermission: BellPermission;

  session: MeditateSession | null;
  updateSession: (next: MeditateSession) => void;
  /** Starts a session and, for a timed one, schedules its bell. */
  begin: (input: StartInput) => Promise<MeditateSession>;
  /** Ends it now: the bell is cancelled if it hasn't rung. */
  end: (early: boolean) => MeditateSession | null;
  discardSession: () => Promise<void>;
  /** After a successful save: fold it into history and drop the draft. */
  recordFinished: (completed: CompletedMeditateSession) => void;

  closeApp: () => void;
  /**
   * Close the app and hand the session back to Today, which rates it as the
   * Meditate check-in (services/appCheckins.ts). The session's own date is
   * used, so a past session lands on the day it happened.
   */
  closeAndCheckOff: (completed: CompletedMeditateSession) => void;
}

export type GuidedStatus = 'loading' | 'ready' | 'error';

const MeditateContext = createContext<MeditateContextValue | null>(null);

export const useMeditate = (): MeditateContextValue => {
  const value = useContext(MeditateContext);
  if (!value) throw new Error('useMeditate must be used inside MeditateProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const BELL_TITLE: Record<MeditateSession['mode'], string> = {
  sit: 'Time — your sit is done',
  breathe: 'Time — your breathing is done',
  nsdr: 'Time — your NSDR is done',
};

export const MeditateProvider: React.FC<{
  userId: string;
  launchHabitId?: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'MeditateApp'>;
  children: React.ReactNode;
}> = ({ userId, launchHabitId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<MeditatePrefs>(DEFAULT_MEDITATE_PREFS);
  const [sessions, setSessions] = useState<CompletedMeditateSession[]>([]);
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const [guided, setGuided] = useState<GuidedRecording[]>([]);
  const [guidedStatus, setGuidedStatus] = useState<GuidedStatus>('loading');
  const guidedInFlight = useRef(false);
  /**
   * Saved prefs have been read at least once. Until then the NSDR list in
   * state is the empty default, and writing it would replace the saved links.
   */
  const prefsLoaded = useRef(false);
  const [bellPermission, setBellPermission] = useState<BellPermission>('undetermined');
  const [session, setSession] = useState<MeditateSession | null>(null);
  const sessionRef = useRef<MeditateSession | null>(null);

  // The draft is read on its own, before anything from the network: a sit
  // started on a plane should still be there when you land.
  useEffect(() => {
    loadSessionDraft<MeditateSession>(APP, userId)
      .then((draft) => {
        if (!draft || sessionRef.current) return;
        const resumed =
          launchHabitId && !draft.data.habitId ? { ...draft.data, habitId: launchHabitId } : draft.data;
        sessionRef.current = resumed;
        setSession(resumed);
      })
      .catch((e) => console.warn('Meditate: could not read the saved session:', e));
  }, [userId, launchHabitId]);

  // Notifications can be switched on in Settings while the app is away.
  useEffect(() => {
    getBellPermission().then(setBellPermission);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getBellPermission().then(setBellPermission);
    });
    return () => sub.remove();
  }, []);

  // Each on its own, so one failing doesn't throw away the others.
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [p, s, h] = await Promise.allSettled([
      getMeditatePrefs(userId),
      listMeditateSessions(userId),
      getActiveHabits(userId),
    ]);
    if (p.status === 'fulfilled') {
      prefsLoaded.current = true;
      setPrefs(p.value);
    } else console.warn('Meditate: prefs not loaded:', p.reason);
    if (s.status === 'fulfilled') setSessions(s.value);
    else console.warn('Meditate: history not loaded:', s.reason);
    if (h.status === 'fulfilled') setHabits(h.value.filter((habit) => !habit.archived_at));
    else console.warn('Meditate: habits not loaded:', h.reason);
    const failed = [p, s].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) setLoadError(errorText(failed.reason));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The guided catalog on its own: if it can't load, Meditate works as before
  // and it's tried again (reloadGuided — on coming back to the app, the start
  // screen, or the guided screen's Try again).
  const reloadGuided = useCallback(() => {
    if (guidedInFlight.current) return;
    guidedInFlight.current = true;
    setGuidedStatus('loading');
    listGuidedRecordings()
      .then((list) => {
        setGuided(list);
        setGuidedStatus('ready');
      })
      .catch((e) => {
        console.warn('Meditate: guided recordings not loaded:', e);
        setGuidedStatus('error');
      })
      .finally(() => {
        guidedInFlight.current = false;
      });
  }, []);

  useEffect(() => {
    reloadGuided();
  }, [reloadGuided]);

  const guidedStatusRef = useRef(guidedStatus);
  guidedStatusRef.current = guidedStatus;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && guidedStatusRef.current === 'error') reloadGuided();
    });
    return () => sub.remove();
  }, [reloadGuided]);

  const launchHabit = habits.find((h) => h.id === launchHabitId);

  const updatePrefs = useCallback(
    async (changes: Partial<MeditatePrefs>) => {
      // The links are written whole: before the saved ones are read, that
      // would overwrite them with just the new one. Try loading again instead.
      if (changes.nsdr_links && !prefsLoaded.current) {
        reload();
        throw new Error('Meditate prefs not loaded yet');
      }
      setPrefs((p) => ({ ...p, ...changes }));
      await saveMeditatePrefs(userId, changes);
    },
    [userId, reload]
  );

  const updateSession = useCallback(
    (next: MeditateSession) => {
      sessionRef.current = next;
      setSession(next);
      saveSessionDraft(APP, userId, next).catch((e) =>
        console.warn('Meditate: could not save the session draft:', e)
      );
    },
    [userId]
  );

  const begin = useCallback(
    async (input: StartInput) => {
      const timed = !input.guided && (input.mode !== 'breathe' || input.breatheStyle === 'timer');
      // Asks only if never answered; a "no" just means no bell. Before the
      // clock starts, so time spent on the prompt isn't counted.
      if (timed && (await getBellPermission()) === 'undetermined') {
        await requestBellPermission();
        setBellPermission(await getBellPermission());
      }
      let next = startSession({ ...input, id: newMeditateId(userId), now: new Date(), habitId: launchHabitId });
      if (next.style === 'timer') {
        const bellId = await scheduleBell(next.plannedSec, {
          title: BELL_TITLE[next.mode],
          body: `${formatMinutes(next.plannedSec)} done. Open Meditate when you’re ready to log it.`,
          // A tap opens Meditate (RootNavigator), where it's ready to log.
          data: { open: 'MeditateApp' },
        });
        if (bellId) next = { ...next, bellId };
      }
      updateSession(next);
      return next;
    },
    [userId, launchHabitId, updateSession]
  );

  const end = useCallback(
    (early: boolean) => {
      const current = sessionRef.current;
      if (!current) return null;
      if (current.endedAt) return current;
      const ended = endSession(current, new Date(), early);
      // Harmless once it has rung; ended early, it stops a bell for nothing.
      cancelBell(current.bellId);
      updateSession(ended);
      return ended;
    },
    [updateSession]
  );

  const discardSession = useCallback(async () => {
    cancelBell(sessionRef.current?.bellId);
    // Started, then thrown away: the start still happened (services/overrideStarts.ts).
    recordAbandonedStart(userId, APP, sessionRef.current);
    sessionRef.current = null;
    setSession(null);
    await clearSessionDraft(APP, userId);
  }, [userId]);

  const recordFinished = useCallback(
    (completed: CompletedMeditateSession) => {
      setSessions((list) => [completed, ...list.filter((s) => s.id !== completed.id)]);
      sessionRef.current = null;
      setSession(null);
      clearSessionDraft(APP, userId).catch((e) => console.warn('Meditate: draft not cleared:', e));
    },
    [userId]
  );

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const closeAndCheckOff = useCallback(
    (completed: CompletedMeditateSession) => {
      finishSession({
        appId: APP,
        durationSec: completed.duration_sec,
        choices: checkinChoices(completed),
        mode: completed.mode,
        sessionId: completed.id,
        // Tapped on Start; a past session has none, so Today asks it before push.
        ...(completed.override ? { override: completed.override } : {}),
        ...(completed.date !== toLocalDateString(new Date()) ? { date: completed.date } : {}),
      });
      // Land on Today, where the rating and the celebration live — from its
      // card or from the Lab alike. One action, so nothing runs from a closed screen.
      rootNavigation.popTo('Main', { screen: 'Home', params: { screen: 'HomeScreen', pop: true } });
    },
    [rootNavigation]
  );

  const value: MeditateContextValue = {
    userId,
    loading,
    loadError,
    reload,
    prefs,
    updatePrefs,
    sessions,
    guided,
    guidedStatus,
    reloadGuided,
    habits,
    launchHabit,
    launchHabitId,
    bellPermission,
    session,
    updateSession,
    begin,
    end,
    discardSession,
    recordFinished,
    closeApp,
    closeAndCheckOff,
  };

  return <MeditateContext.Provider value={value}>{children}</MeditateContext.Provider>;
};

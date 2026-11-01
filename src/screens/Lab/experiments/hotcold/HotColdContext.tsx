import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { HotColdPrefs, HotColdSession, HotColdTimerDraft, ThermalKind } from '../../../../types/hotcold';
import { DEFAULT_HOTCOLD_PREFS } from '../../../../data/hotcold';
import {
  deleteHotColdSession,
  getHotColdPrefs,
  listHotColdSessions,
  newHotColdId,
  saveHotColdPrefs,
  saveHotColdSession,
} from '../../../../services/labHotCold';
import { newRecords, RecordId } from '../../../../services/hotcoldMath';
import { addDays } from '../../../../services/habitSchedule';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../../../services/miniAppDrafts';
import { cancelBell, getBellPermission, requestBellPermission, scheduleBell } from '../../../../services/sessionBell';
import { elapsedSec } from '../../../../services/sessionTimer';
import { formatDuration } from '../../../../services/hotcoldMath';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';

const APP = 'hotcold' as const;
/** How far back History looks; also enough weeks for the streak. */
const HISTORY_DAYS = 12 * 7;

/** What the timer hands to the log sheet when it stops. */
export interface TimedResult {
  kind: ThermalKind;
  duration_sec: number;
}

interface HotColdContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  /** Local YYYY-MM-DD, refreshed when the app comes back to the front. */
  today: string;

  prefs: HotColdPrefs;
  updatePrefs: (changes: Partial<HotColdPrefs>) => Promise<void>;

  /** The last 12 weeks, any order. */
  sessions: HotColdSession[];
  /**
   * Shown at once, written in the background; a failed write puts things back
   * and says so. Resolves to the records it broke, or null if it failed.
   */
  saveSession: (session: HotColdSession) => Promise<RecordId[] | null>;
  deleteSession: (id: string) => Promise<void>;
  newId: () => string;

  /** The running timer, if any — survives a killed app (miniAppDrafts). */
  timer: HotColdTimerDraft | null;
  startTimer: (kind: ThermalKind, targetSec?: number) => Promise<void>;
  /** Stops it and returns what to log. */
  stopTimer: () => TimedResult | null;
  cancelTimer: () => Promise<void>;
  /** A stopped timer waiting for Home to open the log sheet. */
  pendingLog: TimedResult | null;
  takePendingLog: () => TimedResult | null;

  closeApp: () => void;
}

const HotColdContext = createContext<HotColdContextValue | null>(null);

export const useHotCold = (): HotColdContextValue => {
  const value = useContext(HotColdContext);
  if (!value) throw new Error('useHotCold must be used inside HotColdProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const phoneLocale = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
};

export const HotColdProvider: React.FC<{
  userId: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'HotColdApp'>;
  children: React.ReactNode;
}> = ({ userId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [prefs, setPrefs] = useState<HotColdPrefs>(DEFAULT_HOTCOLD_PREFS);
  const [sessions, setSessions] = useState<HotColdSession[]>([]);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [timer, setTimer] = useState<HotColdTimerDraft | null>(null);
  const timerRef = useRef<HotColdTimerDraft | null>(null);
  const [pendingLog, setPendingLog] = useState<TimedResult | null>(null);

  // Left open past midnight, "today" has to move on with the clock.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toLocalDateString(new Date()));
    });
    return () => sub.remove();
  }, []);

  // A timer started before the app was killed is still running.
  useEffect(() => {
    loadSessionDraft<HotColdTimerDraft>(APP, userId)
      .then((draft) => {
        if (!draft || timerRef.current) return;
        timerRef.current = draft.data;
        setTimer(draft.data);
      })
      .catch((e) => console.warn('Hot & Cold: could not read the running timer:', e));
  }, [userId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, s] = await Promise.all([
        getHotColdPrefs(userId, phoneLocale()),
        listHotColdSessions(userId, addDays(today, -HISTORY_DAYS)),
      ]);
      setPrefs(p);
      setSessions(s);
    } catch (e) {
      console.warn('Hot & Cold: load failed:', e);
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updatePrefs = useCallback(
    async (changes: Partial<HotColdPrefs>) => {
      const before = prefs;
      setPrefs((p) => ({ ...p, ...changes }));
      try {
        await saveHotColdPrefs(userId, changes);
      } catch (e) {
        console.warn('Hot & Cold: prefs save failed:', e);
        setPrefs(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
      }
    },
    [userId, prefs]
  );

  const saveSession = useCallback(
    async (session: HotColdSession) => {
      const before = sessionsRef.current;
      const broke = newRecords(session, before);
      setSessions([...before.filter((s) => s.id !== session.id), session]);
      try {
        await saveHotColdSession(userId, session);
        return broke;
      } catch (e) {
        console.warn('Hot & Cold: session save failed:', e);
        setSessions(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
        return null;
      }
    },
    [userId]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const before = sessionsRef.current;
      setSessions(before.filter((s) => s.id !== id));
      try {
        await deleteHotColdSession(userId, id);
      } catch (e) {
        console.warn('Hot & Cold: delete failed:', e);
        setSessions(before);
        showAlert("Couldn't delete that", 'Check your connection and try again.');
      }
    },
    [userId]
  );

  const newId = useCallback(() => newHotColdId(userId), [userId]);

  const setTimerState = useCallback(
    (next: HotColdTimerDraft | null) => {
      timerRef.current = next;
      setTimer(next);
      const write = next ? saveSessionDraft(APP, userId, next) : clearSessionDraft(APP, userId);
      write.catch((e) => console.warn('Hot & Cold: could not save the timer:', e));
    },
    [userId]
  );

  const startTimer = useCallback(
    async (kind: ThermalKind, targetSec?: number) => {
      // Asks only if never answered; a "no" just means no bell. Before the
      // clock starts, so time on the prompt isn't counted.
      if (targetSec && (await getBellPermission()) === 'undetermined') await requestBellPermission();
      const startedAt = new Date().toISOString();
      const bellId = targetSec
        ? await scheduleBell(targetSec, {
            title: 'Time’s up',
            body: `${formatDuration(targetSec)} in the cold. Get out when you’re ready, then log it.`,
          })
        : undefined;
      setTimerState({ kind, startedAt, targetSec, bellId });
    },
    [setTimerState]
  );

  const stopTimer = useCallback((): TimedResult | null => {
    const current = timerRef.current;
    if (!current) return null;
    cancelBell(current.bellId);
    const result = {
      kind: current.kind,
      duration_sec: elapsedSec({ startedAt: current.startedAt, plannedSec: 0 }, new Date()),
    };
    setTimerState(null);
    setPendingLog(result);
    return result;
  }, [setTimerState]);

  const cancelTimer = useCallback(async () => {
    cancelBell(timerRef.current?.bellId);
    setTimerState(null);
  }, [setTimerState]);

  const takePendingLog = useCallback(() => {
    const result = pendingLog;
    setPendingLog(null);
    return result;
  }, [pendingLog]);

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const value: HotColdContextValue = {
    userId,
    loading,
    loadError,
    reload,
    today,
    prefs,
    updatePrefs,
    sessions,
    saveSession,
    deleteSession,
    newId,
    timer,
    startTimer,
    stopTimer,
    cancelTimer,
    pendingLog,
    takePendingLog,
    closeApp,
  };

  return <HotColdContext.Provider value={value}>{children}</HotColdContext.Provider>;
};

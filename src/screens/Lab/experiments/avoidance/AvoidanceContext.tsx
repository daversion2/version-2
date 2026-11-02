import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { AvoidancePrefs, AvoidanceTask, Level } from '../../../../types/avoidance';
import type { AvoidanceTask as OldAvoidanceTask } from '../../../../types';
import { DEFAULT_AVOIDANCE_PREFS } from '../../../../data/avoidance';
import {
  deleteAvoidanceTask,
  getAvoidancePrefs,
  listAvoidanceTasks,
  newAvoidanceId,
  saveAvoidancePrefs,
  saveAvoidanceTask,
  saveAvoidanceTasks,
} from '../../../../services/labAvoidance';
import { getAvoidanceTasks as getOldAvoidanceTasks } from '../../../../services/avoidanceTasks';
import { cleanTaskText, importable, importedIds, notYetImported } from '../../../../services/avoidanceMath';
import { RESISTANCE_SCALE } from '../../../../constants/resistance';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';

interface AvoidanceContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  /** Local YYYY-MM-DD, refreshed when the app comes back to the front. */
  today: string;

  prefs: AvoidancePrefs;
  updatePrefs: (changes: Partial<AvoidancePrefs>) => Promise<void>;

  tasks: AvoidanceTask[];
  /** Adds a line; false when there was nothing to add or the save failed. */
  addTask: (text: string, forecast?: Level) => Promise<boolean>;
  /** Cleared: "Did it", with how hard starting was. */
  clearTask: (task: AvoidanceTask, resistance?: Level) => Promise<AvoidanceTask | null>;
  /** Rename it, or change what you expect. */
  updateTask: (task: AvoidanceTask) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;

  /** Open tasks in the old Avoidance Training not brought over yet. */
  oldToImport: OldAvoidanceTask[];
  /** Brings them over once; a second call while one is running does nothing. */
  importOld: () => Promise<number>;
  importing: boolean;

  closeApp: () => void;
}

const AvoidanceContext = createContext<AvoidanceContextValue | null>(null);

export const useAvoidance = (): AvoidanceContextValue => {
  const value = useContext(AvoidanceContext);
  if (!value) throw new Error('useAvoidance must be used inside AvoidanceProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const saveFailed = () => showAlert("Couldn't save that", 'Check your connection and try again.');

export const AvoidanceProvider: React.FC<{
  userId: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'AvoidanceApp'>;
  children: React.ReactNode;
}> = ({ userId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [prefs, setPrefs] = useState<AvoidancePrefs>(DEFAULT_AVOIDANCE_PREFS);
  const [tasks, setTasks] = useState<AvoidanceTask[]>([]);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const [oldTasks, setOldTasks] = useState<OldAvoidanceTask[]>([]);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  // A ref, not just state: a fast double tap on Bring lands before a re-render.
  const importingRef = useRef(false);
  const [importing, setImporting] = useState(false);

  // Left open past midnight, "today" has to move on with the clock.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toLocalDateString(new Date()));
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, t] = await Promise.all([getAvoidancePrefs(userId), listAvoidanceTasks(userId)]);
      setPrefs(p);
      setTasks(t);
    } catch (e) {
      console.warn('Avoidance: load failed:', e);
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The old list, read only, on its own: if it fails, nothing else is affected.
  useEffect(() => {
    getOldAvoidanceTasks(userId)
      .then(setOldTasks)
      .catch((e) => console.warn('Avoidance: old list not read:', e));
  }, [userId]);

  const updatePrefs = useCallback(
    async (changes: Partial<AvoidancePrefs>) => {
      const before = prefs;
      setPrefs((p) => ({ ...p, ...changes }));
      try {
        await saveAvoidancePrefs(userId, changes);
      } catch (e) {
        console.warn('Avoidance: prefs save failed:', e);
        setPrefs(before);
        saveFailed();
      }
    },
    [userId, prefs]
  );

  /** Shown at once, written in the background; a failed write puts the list back. */
  const put = useCallback(
    async (task: AvoidanceTask): Promise<boolean> => {
      const before = tasksRef.current;
      setTasks([...before.filter((t) => t.id !== task.id), task]);
      try {
        await saveAvoidanceTask(userId, task);
        return true;
      } catch (e) {
        console.warn('Avoidance: save failed:', e);
        setTasks(before);
        saveFailed();
        return false;
      }
    },
    [userId]
  );

  const addTask = useCallback(
    async (text: string, forecast?: Level) => {
      const clean = cleanTaskText(text);
      if (!clean) return false;
      const now = new Date();
      return put({
        id: newAvoidanceId(userId),
        text: clean,
        created_at: now.toISOString(),
        created_date: toLocalDateString(now),
        forecast,
        status: 'open',
      });
    },
    [userId, put]
  );

  const clearTask = useCallback(
    async (task: AvoidanceTask, resistance?: Level) => {
      const now = new Date();
      const cleared: AvoidanceTask = {
        ...task,
        status: 'done',
        done_date: toLocalDateString(now),
        done_at: now.toISOString(),
        resistance,
        resistance_scale: resistance ? RESISTANCE_SCALE : undefined,
      };
      return (await put(cleared)) ? cleared : null;
    },
    [put]
  );

  const updateTask = useCallback(
    async (task: AvoidanceTask) => {
      const clean = cleanTaskText(task.text);
      if (!clean) return false;
      return put({ ...task, text: clean });
    },
    [put]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const before = tasksRef.current;
      setTasks(before.filter((t) => t.id !== id));
      try {
        await deleteAvoidanceTask(userId, id);
      } catch (e) {
        console.warn('Avoidance: delete failed:', e);
        setTasks(before);
        showAlert("Couldn't delete that", 'Check your connection and try again.');
      }
    },
    [userId]
  );

  const oldToImport = notYetImported(oldTasks, tasks, prefs.imported_ids);

  const importOld = useCallback(async () => {
    if (importingRef.current) return 0;
    const remembered = prefsRef.current.imported_ids;
    const incoming = importable(oldTasks, tasksRef.current, () => newAvoidanceId(userId), new Date(), remembered);
    if (incoming.length === 0) return 0;
    importingRef.current = true;
    setImporting(true);
    try {
      await saveAvoidanceTasks(userId, incoming);
      setTasks((list) => [...list, ...incoming]);
    } catch (e) {
      console.warn('Avoidance: import failed:', e);
      saveFailed();
      return 0;
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
    // Remember what came over, so deleting one later doesn't offer it again.
    // The tasks are saved either way; if this write fails they still carry
    // imported_from, which is what counted before.
    const imported_ids = importedIds([...tasksRef.current, ...incoming], remembered);
    setPrefs((p) => ({ ...p, imported_ids }));
    saveAvoidancePrefs(userId, { imported_ids }).catch((e) =>
      console.warn('Avoidance: imported ids not saved:', e)
    );
    return incoming.length;
  }, [userId, oldTasks]);

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const value: AvoidanceContextValue = {
    userId,
    loading,
    loadError,
    reload,
    today,
    prefs,
    updatePrefs,
    tasks,
    addTask,
    clearTask,
    updateTask,
    deleteTask,
    oldToImport,
    importOld,
    importing,
    closeApp,
  };

  return <AvoidanceContext.Provider value={value}>{children}</AvoidanceContext.Provider>;
};

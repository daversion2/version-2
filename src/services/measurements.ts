import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Goal,
  MeasurementLogEntry,
  MeasurementProgress,
  MeasurementConfigDoneByDate,
  MeasurementConfigReachNumber,
} from '../types';

const measurementLogsRef = (userId: string) =>
  collection(db, 'users', userId, 'measurementLogs');

const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Create a measurement log entry.
 */
export const logMeasurement = async (
  userId: string,
  goalId: string,
  entry: {
    value: number;
    source: 'manual';
    note?: string;
  }
): Promise<string> => {
  const now = new Date();
  const logData: Record<string, unknown> = {
    goal_id: goalId,
    date: getTodayStr(),
    created_at: now.toISOString(),
    value: entry.value,
    source: entry.source,
  };
  if (entry.note?.trim()) logData.note = entry.note.trim();

  const docRef = await addDoc(measurementLogsRef(userId), logData);
  return docRef.id;
};

/**
 * Get all measurement log entries for a goal, ordered by date descending.
 */
export const getMeasurementLogs = async (
  userId: string,
  goalId: string
): Promise<MeasurementLogEntry[]> => {
  // Single-field query (auto-indexed) + in-memory sort to avoid needing a composite index
  const q = query(
    measurementLogsRef(userId),
    where('goal_id', '==', goalId)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MeasurementLogEntry));
  logs.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  return logs;
};

/**
 * Compute measurement progress for a goal from its logs and config.
 */
export const getMeasurementProgress = async (
  userId: string,
  goal: Goal
): Promise<MeasurementProgress | null> => {
  if (!goal.measurement_type) return null;

  const type = goal.measurement_type;
  const config = goal.measurement_config;

  // done_by_date needs no logs
  if (type === 'done_by_date') {
    const c = config as MeasurementConfigDoneByDate | undefined;
    const targetDate = c?.target_date || goal.end_date;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const [y, m, d] = targetDate.split('-').map(Number);
    const end = new Date(y, m - 1, d);
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Percentage = time elapsed / total duration
    const [sy, sm, sd] = goal.start_date.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = totalDays - daysRemaining;
    const percentage = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))) : 0;

    return {
      measurement_type: type,
      current_value: daysRemaining,
      target_value: 0,
      percentage,
      total_entries: 0,
      days_remaining: daysRemaining,
    };
  }

  // All other types need logs
  const logs = await getMeasurementLogs(userId, goal.id);

  if (type === 'reach_number') {
    const c = config as MeasurementConfigReachNumber | undefined;
    const startingValue = c?.starting_value ?? 0;
    const targetValue = c?.target_value ?? 0;
    const direction = c?.direction ?? 'up';
    const metricName = c?.metric_name ?? '';

    const sum = logs.reduce((acc, log) => acc + log.value, 0);
    const currentValue = direction === 'up'
      ? startingValue + sum
      : startingValue - sum;

    const totalRange = Math.abs(targetValue - startingValue);
    const progress = Math.abs(currentValue - startingValue);
    const percentage = totalRange > 0
      ? Math.min(100, Math.max(0, Math.round((progress / totalRange) * 100)))
      : 0;

    return {
      measurement_type: type,
      current_value: currentValue,
      target_value: targetValue,
      starting_value: startingValue,
      percentage,
      total_entries: logs.length,
      latest_entry: logs[0] || undefined,
      metric_name: metricName,
    };
  }

  return null;
};

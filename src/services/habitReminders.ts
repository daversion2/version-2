/**
 * Per-habit local reminders.
 *
 * Turns a habit's `reminder` ({ time, enabled }) into a daily on-device
 * notification fired at the anchor's time of day, using the pairing as the hook.
 * Local (not push) because a per-habit daily reminder at a user-local time needs
 * no server, no timezone math, and works offline.
 *
 * The scheduled notification id is stored back on the habit's `reminder` so it can
 * be cancelled or rescheduled when the plan changes.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitActionPlan, HabitReminder, Nudge } from '../types';
import { getHabitById, updateHabit } from './habits';

const ANDROID_CHANNEL = 'habit-reminders';

/** The fields a reminder needs — satisfied by Nudge, or by a lightweight stand-in. */
interface RemindableHabit {
  id: string;
  name: string;
  action_plan?: HabitActionPlan;
  reminder?: HabitReminder;
}

/** Re-phrase a first-person anchor ("have my coffee") so notification copy addresses the user. */
const toSecondPerson = (phrase: string): string => phrase.replace(/\bmy\b/gi, 'your');

const parseHHMM = (time: string): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return { hour: Number.isNaN(h) ? 9 : h, minute: Number.isNaN(m) ? 0 : m };
};

const buildBody = (habit: RemindableHabit): string => {
  const anchor = habit.action_plan?.anchor;
  const pairing = habit.action_plan?.pairing;
  if (anchor && pairing) return `Right after you ${toSecondPerson(anchor)}. Don't forget ${pairing} 🎧`;
  if (anchor) return `Right after you ${toSecondPerson(anchor)} — a few minutes is all it takes.`;
  if (pairing) return `Make it enjoyable — pair it with ${pairing} 🎧`;
  return 'A few minutes now is all it takes.';
};

/** Request notification permission (and set up the Android channel) on demand. */
export const ensureReminderPermissions = async (): Promise<boolean> => {
  // Local notifications work in the simulator too (unlike push, which needs a real
  // device for a token), so we only bail on web.
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (status !== 'granted') {
    finalStatus = (await Notifications.requestPermissionsAsync()).status;
  }
  if (finalStatus !== 'granted') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return true;
};

const cancel = async (notificationId?: string): Promise<void> => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already cancelled or never existed — nothing to do.
  }
};

/** Schedule a daily notification for the habit; returns its id, or undefined on failure. */
const schedule = async (habit: RemindableHabit, time: string): Promise<string | undefined> => {
  const { hour, minute } = parseHHMM(time);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: habit.name, body: buildBody(habit) },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
    });
  } catch (e) {
    console.warn('Failed to schedule habit reminder', e);
    return undefined;
  }
};

/**
 * Reconcile a single habit's local reminder after its plan was saved.
 *
 * Loads the freshly-saved habit, cancels whatever was scheduled before, and — if
 * the reminder is enabled and permission is granted — schedules a new daily
 * notification and persists its id.
 *
 * @param prevReminder the reminder the habit had before the save (for its notificationId)
 */
export const syncHabitReminder = async (
  userId: string,
  habitId: string,
  prevReminder?: HabitReminder
): Promise<void> => {
  await cancel(prevReminder?.notificationId);

  const habit = await getHabitById(userId, habitId);
  const desired = habit?.reminder;

  if (!habit || !desired?.enabled || !desired.time) {
    // Disabled (or cleared): drop any stored id so it isn't reused.
    if (habit && desired?.notificationId) {
      await updateHabit(userId, habitId, { reminder: { time: desired.time, enabled: desired.enabled } });
    }
    return;
  }

  const granted = await ensureReminderPermissions();
  if (!granted) return; // keep the user's intent; reconcile can retry once permission is granted

  const notificationId = await schedule(habit, desired.time);
  if (notificationId) {
    await updateHabit(userId, habitId, { reminder: { ...desired, notificationId } });
  }
};

/** Cancel a habit's reminder entirely — call on delete/deactivate. */
export const cancelHabitReminder = async (habit: RemindableHabit): Promise<void> => {
  await cancel(habit.reminder?.notificationId);
};

/**
 * Gap-fill: schedule any enabled reminder that has no notification id yet — e.g.
 * habits whose reminder was saved before scheduling shipped, or while permission
 * was denied. Only touches habits missing an id, so it's safe to run on app load.
 * Skips the permission prompt entirely when there's nothing to schedule.
 */
export const reconcileHabitReminders = async (userId: string, habits: Nudge[]): Promise<void> => {
  const pending = habits.filter(
    (h) => h.is_active && h.reminder?.enabled && h.reminder.time && !h.reminder.notificationId
  );
  if (pending.length === 0) return;

  const granted = await ensureReminderPermissions();
  if (!granted) return;

  for (const habit of pending) {
    const notificationId = await schedule(habit, habit.reminder!.time);
    if (notificationId) {
      await updateHabit(userId, habit.id, {
        reminder: { ...habit.reminder!, notificationId },
      });
    }
  }
};

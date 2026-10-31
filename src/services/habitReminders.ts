/**
 * Habit reminders — REMOVED (founder, 2026-10-31).
 *
 * Habits left the Today screen (docs/no-generic-habits-micro-apps.md), so a
 * reminder for one would land on a screen with nothing to log. Nothing
 * schedules a habit reminder any more. What's left here:
 *   - clean-up: cancelling the reminders already on a device, and the ids a
 *     habit still carries;
 *   - the notification permission, which Meditate's bell, the Workouts rest
 *     alert and Craving Crusher still ask for through here.
 *
 * Habit docs may still hold `reminder: { time, enabled }`. It is ignored.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitReminder } from '../types';
import { getHabitById, updateHabit } from './practices';

const ANDROID_CHANNEL = 'habit-reminders';

/** The fields cancelling needs. */
interface RemindableHabit {
  reminder?: HabitReminder;
}

/** Why a reminder isn't live on this device. Since the removal, always 'disabled' or 'not_found'. */
export type ReminderSkipReason = 'disabled' | 'not_found' | 'permission_denied' | 'no_slots';

export interface ReminderSyncResult {
  scheduled: boolean;
  reason?: ReminderSkipReason;
  slotsNeeded?: number;
  slotsAvailable?: number;
}

/** Every OS handle a reminder holds, including the pre-weekday single id. */
const notificationIdsOf = (reminder?: HabitReminder): string[] => [
  ...(reminder?.notificationIds ?? []),
  ...(reminder?.notificationId ? [reminder.notificationId] : []),
];

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

const cancel = async (notificationIds: string[]): Promise<void> => {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Already cancelled or never existed — nothing to do.
    }
  }
};

/**
 * Called wherever a habit's reminder used to be (re)scheduled. It now only
 * cancels: the previous ids, the habit's own, and the stored ids are cleared
 * so they're never reused. Never schedules.
 */
export const syncHabitReminder = async (
  userId: string,
  habitId: string,
  prevReminder?: HabitReminder
): Promise<ReminderSyncResult> => {
  await cancel(notificationIdsOf(prevReminder));
  const habit = await getHabitById(userId, habitId);
  if (!habit) return { scheduled: false, reason: 'not_found' };
  const stored = notificationIdsOf(habit.reminder);
  if (stored.length) {
    await cancel(stored);
    await updateHabit(userId, habitId, { reminder: { time: habit.reminder!.time, enabled: false } });
  }
  return { scheduled: false, reason: 'disabled' };
};

/** Cancel a habit's reminders entirely — call on archive/delete/deactivate. */
export const cancelHabitReminder = async (habit: RemindableHabit): Promise<void> => {
  await cancel(notificationIdsOf(habit.reminder));
};

/**
 * Cancel every habit reminder still scheduled on this device.
 *
 * Habit reminders were the only REPEATING local notifications the app ever
 * scheduled (daily, or weekly per weekday). Meditate's end bell, the Workouts
 * rest alert and Craving Crusher's pings are all one-shot, so cancelling
 * repeating ones only removes habit reminders — even on a device whose ids
 * were never written back to Firestore. Safe to run on every launch. Never throws.
 */
export const cancelScheduledHabitReminders = async (): Promise<number> => {
  if (Platform.OS === 'web') return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const habitReminders = scheduled.filter((n) => isRepeating(n.trigger));
    await cancel(habitReminders.map((n) => n.identifier));
    return habitReminders.length;
  } catch (e) {
    console.warn('Failed to cancel habit reminders', e);
    return 0;
  }
};

/** Daily and weekly triggers repeat; iOS reports them back as a repeating calendar trigger. */
const isRepeating = (trigger: Notifications.NotificationTrigger | null): boolean => {
  if (!trigger) return false;
  const t = trigger as { type?: string; repeats?: boolean };
  return t.type === 'daily' || t.type === 'weekly' || t.repeats === true;
};

/**
 * Cancel every local notification pending on this device, whoever scheduled it.
 *
 * Call before sign-out and before account deletion: once the session ends
 * there is no handle left to cancel anything with. Nothing durable is lost —
 * the remaining schedulers (Meditate's bell, the rest alert, Craving
 * Crusher) only hold one-shot pings for something already over. Never throws.
 */
export const cancelAllHabitReminders = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel scheduled notifications', e);
  }
};

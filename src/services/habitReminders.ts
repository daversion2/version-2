/**
 * Per-habit local reminders.
 *
 * Turns a habit's `reminder` ({ time, enabled }) into on-device notifications
 * fired at the anchor's time of day, using the pairing as the hook. Local (not
 * push) because a per-habit reminder at a user-local time needs no server, no
 * timezone math, and works offline.
 *
 * A habit pinned to specific weekdays gets ONE WEEKLY notification PER DAY it
 * asks for — the OS has no "these four days" trigger — so a Mon/Wed/Fri habit
 * schedules three and stops nagging on the four days it never claimed. A count
 * habit ("4× a week") has no particular day to fire on, so it stays daily.
 *
 * The scheduled ids are stored back on the habit's `reminder` so they can be
 * cancelled or rescheduled when the plan changes.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitActionPlan, HabitReminder, PracticeInstance } from '../types';
import { getHabitById, updateHabit } from './practices';
import { scheduledDays } from './habitSchedule';

const ANDROID_CHANNEL = 'habit-reminders';

/** The fields a reminder needs — satisfied by PracticeInstance, or by a lightweight stand-in. */
interface RemindableHabit {
  id: string;
  name: string;
  action_plan?: HabitActionPlan;
  reminder?: HabitReminder;
  /** 0 = Sunday … 6 = Saturday. Absent for a count-scheduled habit. */
  scheduled_days?: number[];
}

/** Every OS handle a reminder holds, including the pre-weekday single id. */
const notificationIdsOf = (reminder?: HabitReminder): string[] => [
  ...(reminder?.notificationIds ?? []),
  ...(reminder?.notificationId ? [reminder.notificationId] : []),
];

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
      name: 'Practice reminders',
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
 * Schedule the habit's reminders; returns their ids, empty on failure.
 *
 * One daily notification, or one weekly notification per scheduled weekday.
 * Expo's weekday is 1-based with Sunday = 1, while the app stores JS weekdays
 * (Sunday = 0) — hence the +1, which is the whole of the conversion.
 */
const schedule = async (habit: RemindableHabit, time: string): Promise<string[]> => {
  const { hour, minute } = parseHHMM(time);
  const androidChannel = Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {};
  const days = scheduledDays(habit);

  const triggers: Notifications.NotificationTriggerInput[] = days
    ? days.map((day) => ({
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour,
        minute,
        ...androidChannel,
      }))
    : [
        {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...androidChannel,
        },
      ];

  const ids: string[] = [];
  for (const trigger of triggers) {
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: habit.name, body: buildBody(habit) },
          trigger,
        })
      );
    } catch (e) {
      console.warn('Failed to schedule habit reminder', e);
    }
  }
  return ids;
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
  await cancel(notificationIdsOf(prevReminder));

  const habit = await getHabitById(userId, habitId);
  const desired = habit?.reminder;

  if (!habit || !desired?.enabled || !desired.time) {
    // Disabled (or cleared): drop any stored ids so they aren't reused. Writing
    // the reminder map whole replaces it, which also sheds the legacy
    // single-id field.
    if (habit && desired && notificationIdsOf(desired).length) {
      await updateHabit(userId, habitId, { reminder: { time: desired.time, enabled: desired.enabled } });
    }
    return;
  }

  const granted = await ensureReminderPermissions();
  if (!granted) return; // keep the user's intent; reconcile can retry once permission is granted

  const notificationIds = await schedule(habit, desired.time);
  if (notificationIds.length) {
    await updateHabit(userId, habitId, {
      reminder: { time: desired.time, enabled: desired.enabled, notificationIds },
    });
  }
};

/** Cancel a habit's reminders entirely — call on archive/delete/deactivate. */
export const cancelHabitReminder = async (habit: RemindableHabit): Promise<void> => {
  await cancel(notificationIdsOf(habit.reminder));
};

/**
 * Gap-fill: schedule any enabled reminder that isn't actually scheduled on this
 * device — e.g. habits whose reminder was saved before scheduling shipped, while
 * permission was denied, or on a new device/reinstall. The stored notificationId
 * is an OS handle valid only on the device that created it, so it's checked
 * against the device's real scheduled notifications rather than trusted.
 * Safe to run on app load; skips the permission prompt when there's nothing to do.
 */
export const reconcileHabitReminders = async (userId: string, habits: PracticeInstance[]): Promise<void> => {
  const enabled = habits.filter(
    (h) => h.is_active && h.reminder?.enabled && h.reminder.time
  );
  if (enabled.length === 0) return;

  let scheduledIds: Set<string>;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    scheduledIds = new Set(scheduled.map((n) => n.identifier));
  } catch {
    scheduledIds = new Set();
  }

  // A day-scheduled habit needs one live notification per day it asks for, so
  // "has some ids" isn't enough — a habit that gained a day, or was migrated
  // from the single daily reminder, is short one and has to be rebuilt.
  const pending = enabled.filter((h) => {
    const ids = notificationIdsOf(h.reminder);
    const live = ids.filter((id) => scheduledIds.has(id));
    return live.length !== (scheduledDays(h)?.length ?? 1);
  });
  if (pending.length === 0) return;

  const granted = await ensureReminderPermissions();
  if (!granted) return;

  for (const habit of pending) {
    // Clear the stale set first, or a rebuilt habit accumulates orphaned
    // notifications the app can no longer reach to cancel.
    await cancel(notificationIdsOf(habit.reminder));
    const notificationIds = await schedule(habit, habit.reminder!.time);
    if (notificationIds.length) {
      await updateHabit(userId, habit.id, {
        reminder: {
          time: habit.reminder!.time,
          enabled: habit.reminder!.enabled,
          notificationIds,
        },
      });
    }
  }
};

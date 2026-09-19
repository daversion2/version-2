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
 *
 * This module is deliberately thin: it owns the OS calls and nothing else. The
 * two decisions worth proving live in tested modules that don't import
 * expo-notifications — the slot budget in habitSchedule (iOS drops pending
 * notifications past 64 in silence) and the body copy in reminderCopy (it quotes
 * the user's own words onto a lock screen). Neither can be unit-tested from
 * here, because importing this file pulls in the native module.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitActionPlan, HabitReminder, PracticeInstance } from '../types';
import { getHabitById, updateHabit } from './practices';
import {
  HABIT_REMINDER_SLOT_BUDGET,
  fitRemindersToBudget,
  reminderSlotsFor,
  scheduledDays,
  toExpoWeekday,
} from './habitSchedule';
import { reminderBody } from './reminderCopy';

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

/** Why a reminder the user asked for isn't live on this device. */
export type ReminderSkipReason =
  /** The reminder is off, or has no time set. */
  | 'disabled'
  /** The habit document wasn't found. */
  | 'not_found'
  /** Notification permission isn't granted; intent is kept for a later retry. */
  | 'permission_denied'
  /** Scheduling it would cross iOS's silent 64-notification ceiling. */
  | 'no_slots';

/**
 * The outcome of reconciling one habit's reminder.
 *
 * syncHabitReminder used to return void, which meant 'no_slots' would have been
 * as invisible as the OS-level drop it exists to replace. Callers may ignore
 * this, but a screen where the user just chose a reminder time should not.
 */
export interface ReminderSyncResult {
  scheduled: boolean;
  reason?: ReminderSkipReason;
  /** Set on 'no_slots', for copy that can say how far over the line they are. */
  slotsNeeded?: number;
  slotsAvailable?: number;
}

/** Every OS handle a reminder holds, including the pre-weekday single id. */
const notificationIdsOf = (reminder?: HabitReminder): string[] => [
  ...(reminder?.notificationIds ?? []),
  ...(reminder?.notificationId ? [reminder.notificationId] : []),
];

const parseHHMM = (time: string): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return { hour: Number.isNaN(h) ? 9 : h, minute: Number.isNaN(m) ? 0 : m };
};

/**
 * Slots left for new habit reminders on this device.
 *
 * FAILS OPEN. If the pending list can't be read we return the full budget and
 * let the schedule attempt proceed: refusing every reminder because a query
 * failed is a worse outcome than the cap risk this guards, and the cap only
 * bites at habit counts most users never reach.
 */
const availableSlots = async (): Promise<number> => {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    return Math.max(0, HABIT_REMINDER_SLOT_BUDGET - pending.length);
  } catch {
    return HABIT_REMINDER_SLOT_BUDGET;
  }
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
 * The weekday conversion is toExpoWeekday — see its comment for why it is a
 * named, tested function rather than arithmetic written out here.
 */
const schedule = async (habit: RemindableHabit, time: string): Promise<string[]> => {
  const { hour, minute } = parseHHMM(time);
  const androidChannel = Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {};
  const days = scheduledDays(habit);

  const triggers: Notifications.NotificationTriggerInput[] = days
    ? days.map((day) => ({
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(day),
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

  const body = reminderBody(habit.action_plan);
  const ids: string[] = [];
  for (const trigger of triggers) {
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: habit.name, body },
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
): Promise<ReminderSyncResult> => {
  await cancel(notificationIdsOf(prevReminder));

  const habit = await getHabitById(userId, habitId);
  const desired = habit?.reminder;

  if (!habit) return { scheduled: false, reason: 'not_found' };

  if (!desired?.enabled || !desired.time) {
    // Disabled (or cleared): drop any stored ids so they aren't reused. Writing
    // the reminder map whole replaces it, which also sheds the legacy
    // single-id field.
    if (desired && notificationIdsOf(desired).length) {
      await updateHabit(userId, habitId, { reminder: { time: desired.time, enabled: desired.enabled } });
    }
    return { scheduled: false, reason: 'disabled' };
  }

  const granted = await ensureReminderPermissions();
  // Keep the user's intent; reconcile can retry once permission is granted.
  if (!granted) return { scheduled: false, reason: 'permission_denied' };

  // This habit's own notifications were cancelled above, so the count read here
  // already excludes them — no need to credit them back.
  const slotsAvailable = await availableSlots();
  const slotsNeeded = reminderSlotsFor(habit);
  if (slotsNeeded > slotsAvailable) {
    console.warn(
      `Reminder for "${habit.name}" needs ${slotsNeeded} notification slot(s), ${slotsAvailable} left of ${HABIT_REMINDER_SLOT_BUDGET}`
    );
    return { scheduled: false, reason: 'no_slots', slotsNeeded, slotsAvailable };
  }

  const notificationIds = await schedule(habit, desired.time);
  if (!notificationIds.length) return { scheduled: false };

  await updateHabit(userId, habitId, {
    reminder: { time: desired.time, enabled: desired.enabled, notificationIds },
  });
  return { scheduled: true };
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
export const reconcileHabitReminders = async (
  userId: string,
  habits: PracticeInstance[]
): Promise<{ skipped: PracticeInstance[] }> => {
  const none = { skipped: [] as PracticeInstance[] };
  const enabled = habits.filter(
    (h) => h.is_active && h.reminder?.enabled && h.reminder.time
  );
  if (enabled.length === 0) return none;

  let scheduledIds: Set<string>;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    scheduledIds = new Set(scheduled.map((n) => n.identifier));
  } catch {
    scheduledIds = new Set();
  }

  const liveIdsOf = (habit: PracticeInstance): string[] =>
    notificationIdsOf(habit.reminder).filter((id) => scheduledIds.has(id));

  // A day-scheduled habit needs one live notification per day it asks for, so
  // "has some ids" isn't enough — a habit that gained a day, or was migrated
  // from the single daily reminder, is short one and has to be rebuilt.
  const pending = enabled.filter(
    (h) => liveIdsOf(h).length !== reminderSlotsFor(h)
  );
  if (pending.length === 0) return none;

  const granted = await ensureReminderPermissions();
  if (!granted) return none;

  // Headroom AFTER the rebuild: everything currently pending, minus the stale
  // notifications these habits are about to give back. Without crediting those
  // the reconcile would refuse to rebuild the very reminders whose slots it is
  // already holding, and a device at the ceiling could never recover.
  const freedByRebuild = pending.reduce((n, h) => n + liveIdsOf(h).length, 0);
  const slotsAvailable = Math.max(
    0,
    HABIT_REMINDER_SLOT_BUDGET - (scheduledIds.size - freedByRebuild)
  );

  // Order IS priority (see fitRemindersToBudget). `pending` follows the caller's
  // habit order, which is the user's own Home ordering — the closest thing to an
  // intent signal available here.
  const { scheduled: fits, skipped } = fitRemindersToBudget(pending, slotsAvailable);
  if (skipped.length) {
    console.warn(
      `${skipped.length} reminder(s) skipped — ${slotsAvailable} of ${HABIT_REMINDER_SLOT_BUDGET} slot(s) available: ${skipped
        .map((h) => h.name)
        .join(', ')}`
    );
  }

  for (const habit of fits) {
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

  return { skipped };
};

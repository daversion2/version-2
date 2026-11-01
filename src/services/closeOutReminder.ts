import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ensureReminderPermissions } from './habitReminders';
import { parseTime } from './closeOutTimes';

// =============================================================================
// CLOSE-OUT REMINDER — one local notification a day: "Close out the day".
//
// Onboarding's last screen offers it (founder, 2026-11-01), so the iOS
// permission prompt arrives with a reason attached rather than cold. iOS gives
// one prompt per install, so it is only spent on someone who has picked a time.
//
// The time is saved on the user doc and the notification is scheduled on the
// device. Today calls syncCloseOutReminder once per launch, which puts it back
// on a new phone or after a reinstall without asking again.
// =============================================================================

/** A fixed id, so rescheduling replaces it and the habit-reminder cleanup can skip it. */
export const CLOSEOUT_REMINDER_ID = 'closeout-reminder';

const ANDROID_CHANNEL = 'habit-reminders'; // the channel habitReminders sets up

export { CLOSEOUT_TIMES, DEFAULT_CLOSEOUT_TIME, formatReminderTime, parseTime } from './closeOutTimes';

const CONTENT = {
  title: 'Close out the day',
  body: 'One minute: grade the effort, then plan tomorrow’s session.',
};

const cancelLocal = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(CLOSEOUT_REMINDER_ID);
  } catch {
    // Never scheduled on this device — nothing to cancel.
  }
};

/** Put the daily notification on this device. False when it can't (no permission, bad time). */
const scheduleLocal = async (hhmm: string): Promise<boolean> => {
  const t = parseTime(hhmm);
  if (!t) return false;
  await cancelLocal();
  await Notifications.scheduleNotificationAsync({
    identifier: CLOSEOUT_REMINDER_ID,
    content: { ...CONTENT, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: t.hour,
      minute: t.minute,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
  });
  return true;
};

/**
 * Turn the reminder on at `hhmm` (asking for permission if it hasn't been
 * answered), or off with null. Returns whether a reminder is now scheduled.
 * The time is only saved when it is — a refused prompt saves nothing.
 */
export const setCloseOutReminder = async (userId: string, hhmm: string | null): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  if (hhmm === null) {
    await cancelLocal();
    await setDoc(doc(db, 'users', userId), { closeout_reminder_time: null }, { merge: true });
    return false;
  }
  if (!parseTime(hhmm) || !(await ensureReminderPermissions())) return false;
  await scheduleLocal(hhmm);
  await setDoc(doc(db, 'users', userId), { closeout_reminder_time: hhmm }, { merge: true });
  return true;
};

/**
 * Once per launch: make this device match the saved time. Never prompts —
 * without permission it quietly does nothing. Never throws.
 */
export const syncCloseOutReminder = async (hhmm: string | null | undefined): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    if (!parseTime(hhmm)) {
      await cancelLocal();
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await scheduleLocal(hhmm as string);
  } catch (e) {
    console.warn('Close-out reminder: could not sync:', e);
  }
};

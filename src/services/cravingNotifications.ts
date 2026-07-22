/**
 * Local notifications for off-app craving rides.
 *
 * When the user takes a mission out into the world, the app holds the timer
 * and pings them: once at the halfway mark (encouragement, only if far enough
 * out to be worth it) and once when the wave should have passed (the call to
 * come back and log). Both are cancelled the moment they return in-app.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureReminderPermissions } from './habitReminders';

const ANDROID_CHANNEL = 'habit-reminders'; // reuse the channel habitReminders sets up

/** Skip the halfway ping when it would land sooner than this. */
const MIN_HALFWAY_LEAD_SECONDS = 90;

const scheduleIn = async (
  seconds: number,
  title: string,
  body: string
): Promise<string | undefined> => {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
    });
  } catch (e) {
    console.warn('Failed to schedule craving ping', e);
    return undefined;
  }
};

/**
 * Schedule the away-mode pings. Returns the scheduled ids (possibly empty when
 * permission is denied — the ride still works, there's just no ping).
 */
export const scheduleCravingPings = async (
  secondsLeft: number,
  plannedSeconds: number
): Promise<string[]> => {
  const granted = await ensureReminderPermissions();
  if (!granted) return [];

  const ids: string[] = [];
  const elapsed = plannedSeconds - secondsLeft;
  const untilHalfway = Math.ceil(plannedSeconds / 2 - elapsed);

  if (untilHalfway >= MIN_HALFWAY_LEAD_SECONDS) {
    const halfId = await scheduleIn(
      untilHalfway,
      'Halfway — past the peak',
      'It only fades from here. Whatever you’re doing, keep doing it.'
    );
    if (halfId) ids.push(halfId);
  }

  if (secondsLeft > 0) {
    const minutes = Math.round(plannedSeconds / 60);
    const endId = await scheduleIn(
      secondsLeft,
      'The wave should have passed 🌊',
      `${minutes} minutes ridden — nice. Still standing? Come log how it landed (either answer counts).`
    );
    if (endId) ids.push(endId);
  }

  return ids;
};

export const cancelCravingPings = async (ids: string[]): Promise<void> => {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
};

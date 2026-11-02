import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureReminderPermissions } from './habitReminders';

// =============================================================================
// SESSION BELL — the end-of-session ring for services/sessionTimer.ts, as a
// scheduled local notification: it arrives with the phone locked and the app
// closed, which is the whole point.
//
// Two limits, both native work to lift (an App Store build, not an OTA):
//   - it's the system notification sound — a custom chime has to be bundled
//     into the binary;
//   - a Focus mode or Do Not Disturb silences it like any other notification.
//     Breaking through needs Apple's time-sensitive entitlement.
// =============================================================================

const ANDROID_CHANNEL = 'habit-reminders'; // the channel habitReminders sets up

export type BellPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Every bell carries this in its data, so the foreground handler
 * (services/notifications.ts) can let it ring with the app open — other
 * notifications arrive silently there.
 */
export const SESSION_BELL_KIND = 'session-bell';

export const isSessionBell = (data: unknown): boolean =>
  !!data && typeof data === 'object' && (data as Record<string, unknown>).kind === SESSION_BELL_KIND;

/** Read-only — never prompts. For warning before a session that no bell will ring. */
export const getBellPermission = async (): Promise<BellPermission> => {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
};

/** Asks if it hasn't been answered yet. True = a bell can ring. */
export const requestBellPermission = (): Promise<boolean> => ensureReminderPermissions();

/**
 * Schedule the bell `seconds` from now. Returns its id, or undefined when it
 * couldn't be scheduled (no permission) — the session still runs, the user
 * just has to come back on their own.
 */
export const scheduleBell = async (
  seconds: number,
  content: {
    title: string;
    body: string;
    /** Extra notification data — e.g. `{ open: 'MeditateApp' }`, which a tap routes on (RootNavigator). */
    data?: Record<string, string>;
  }
): Promise<string | undefined> => {
  if (seconds < 1) return undefined;
  try {
    if ((await getBellPermission()) !== 'granted') return undefined;
    return await Notifications.scheduleNotificationAsync({
      // A local notification without `sound` arrives silently on iOS — and a
      // silent bell is no bell.
      content: { ...content, sound: 'default', data: { ...content.data, kind: SESSION_BELL_KIND } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
    });
  } catch (e) {
    console.warn('Session bell: could not schedule:', e);
    return undefined;
  }
};

export const cancelBell = async (id?: string): Promise<void> => {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already rung or never scheduled — nothing to do.
  }
};

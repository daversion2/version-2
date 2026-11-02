import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken, savePushTokenAndTimezone } from './users';
import * as Localization from 'expo-localization';
import { isSessionBell } from './sessionBell';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowAlert: true,
      // Silent with the app open — except a session's end bell, which is the
      // whole point of it (services/sessionBell.ts).
      shouldPlaySound: isSessionBell(notification.request.content.data),
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const registerForPushNotifications = async (userId?: string): Promise<string | null> => {
  try {
    // Simulators can't get a push token.
    if (Platform.OS === 'web' || !Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const timezone = Localization.getCalendars()[0]?.timeZone || 'America/New_York';

    if (userId && token) {
      await savePushTokenAndTimezone(userId, token, timezone);
    }

    return token;
  } catch (error) {
    console.error('Error in registerForPushNotifications:', error);
    throw error;
  }
};

/**
 * Once per launch: if this account has push on (a saved token) and the phone
 * still allows it, save the device's current token when it has changed — a
 * reinstall or a new phone issues a new one, and the old one stops delivering.
 *
 * Never prompts, never throws, says nothing. Returns the new token when it
 * saved one, otherwise null.
 */
export const refreshPushToken = async (
  userId: string,
  savedToken: string | null | undefined
): Promise<string | null> => {
  try {
    if (!savedToken || Platform.OS === 'web' || !Device.isDevice) return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token || token === savedToken) return null;
    await savePushToken(userId, token);
    return token;
  } catch (error) {
    console.warn('Push token refresh failed:', error);
    return null;
  }
};


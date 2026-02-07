import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushTokenAndTimezone } from './users';
import * as Localization from 'expo-localization';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (userId?: string): Promise<string | null> => {
  try {
    console.log('registerForPushNotifications called with userId:', userId);

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    console.log('Getting permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('Existing permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      console.log('Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('New permission status:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    console.log('Getting push token...');
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const timezone = Localization.getCalendars()[0]?.timeZone || 'America/New_York';

    console.log('Expo Push Token:', token);
    console.log('User Timezone:', timezone);

    if (userId && token) {
      console.log('Saving token and timezone to Firestore...');
      await savePushTokenAndTimezone(userId, token, timezone);
      console.log('Token saved successfully');
    }

    return token;
  } catch (error) {
    console.error('Error in registerForPushNotifications:', error);
    throw error;
  }
};

export const scheduleMorningReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Neuro-Nudge',
      body: "Time to set today's challenge. Keep moving forward.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
};

export const scheduleEveningReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Neuro-Nudge',
      body: "Don't forget to complete your challenge today.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
};

import { Platform } from 'react-native';

const POINTS_ALERT_HIDDEN_KEY = 'points_alert_hidden_until';

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.setItem(key, value);
  },
};

/**
 * Check if points alerts should be shown today
 */
export const shouldShowPointsAlert = async (): Promise<boolean> => {
  try {
    const hiddenUntil = await storage.getItem(POINTS_ALERT_HIDDEN_KEY);
    if (!hiddenUntil) return true;

    const hiddenUntilDate = new Date(hiddenUntil);
    const now = new Date();

    // If we're past the hidden date, show alerts again
    return now >= hiddenUntilDate;
  } catch {
    return true;
  }
};

/**
 * Hide points alerts for the rest of today
 */
export const hidePointsAlertForToday = async (): Promise<void> => {
  try {
    // Set hidden until midnight tonight
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await storage.setItem(POINTS_ALERT_HIDDEN_KEY, tomorrow.toISOString());
  } catch (e) {
    console.warn('Failed to save alert preference:', e);
  }
};

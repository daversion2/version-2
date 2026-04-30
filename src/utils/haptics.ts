import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Fire haptic for standard reward moment (challenge completion).
 * Uses iOS "success" notification pattern. No-op on web.
 */
export const triggerRewardHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    console.warn('Haptic feedback failed:', e);
  }
};

/**
 * Fire haptic for milestone events (level-up, streak tier change).
 * Uses heavier impact pattern. No-op on web.
 */
export const triggerMilestoneHaptic = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {
    console.warn('Haptic feedback failed:', e);
  }
};

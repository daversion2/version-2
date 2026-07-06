import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Fonts, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface HoldToCommitButtonProps {
  title: string;
  /** Fires once when the hold completes. */
  onCommit: () => void;
  disabled?: boolean;
  /** How long the button must be held (ms). */
  holdMs?: number;
  style?: ViewStyle;
}

// Haptics can throw on unsupported platforms — never let a buzz break the flow.
const haptic = (fn: () => Promise<unknown>) => {
  try {
    fn().catch(() => {});
  } catch {
    /* no-op */
  }
};

/**
 * Press-and-hold commit button: holding sweeps a fill across the button;
 * releasing early rolls it back. Completing the hold fires onCommit with a
 * success haptic — a small deliberate act, in the spirit of the override.
 */
export const HoldToCommitButton: React.FC<HoldToCommitButtonProps> = ({
  title,
  onCommit,
  disabled = false,
  holdMs = 1200,
  style,
}) => {
  const progress = useSharedValue(0);
  // Guards double-fires if press events race the completion callback.
  const committedRef = useRef(false);

  const complete = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    onCommit();
  };

  const onPressIn = () => {
    if (disabled || committedRef.current) return;
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    progress.value = withTiming(
      1,
      { duration: holdMs, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(complete)();
      }
    );
  };

  const onPressOut = () => {
    if (committedRef.current) return;
    progress.value = withTiming(0, { duration: 180 });
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[styles.base, disabled && styles.disabled, style]}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Mirrors Button's primary variant so it drops into the same slots.
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  text: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.white,
  },
});

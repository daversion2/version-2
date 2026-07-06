import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface FadeRiseProps {
  /** Stagger offset in ms — space siblings ~150–250ms apart. */
  delay?: number;
  duration?: number;
  /** How far below its resting position the content starts (px). */
  distance?: number;
  /**
   * Horizontal start offset (px). Positive = enters from the right,
   * negative = from the left. Combine with distance=0 for a pure
   * slide-fade (e.g. page transitions).
   */
  horizontalDistance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Fade-rise reveal: content fades in while drifting up to its resting
 * position. Runs once on mount — key an ancestor (e.g. by onboarding step id)
 * to replay it when the content changes.
 */
export const FadeRise: React.FC<FadeRiseProps> = ({
  delay = 0,
  duration = 450,
  distance = 14,
  horizontalDistance = 0,
  style,
  children,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * distance },
      { translateX: (1 - progress.value) * horizontalDistance },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

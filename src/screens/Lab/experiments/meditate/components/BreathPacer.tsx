import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { BREATH_FULL, BreathPatternKey, getBreathPattern } from '../../../../../data/breathPatterns';
import { MEDITATE_ACCENT } from './meditateStyle';

const BASE_SIZE = 120; // diameter of the contracted circle

// Haptics can throw on unsupported platforms — never let a buzz break the pacer.
const haptic = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* no-op */
  }
};

interface Props {
  pattern: BreathPatternKey;
  plannedSec: number;
  /** Seconds already breathed — non-zero when resuming a saved session. */
  pacedSec: number;
  /** After each phase, with its length — the session counts these, so pauses never do. */
  onPhaseDone: (sec: number) => void;
  /** The planned time is used up. */
  onComplete: () => void;
}

/**
 * Breathwork's follow-along circle, for a session already running: expands on
 * the inhale, holds, contracts on the exhale, with a haptic at each change.
 * The one Meditate mode that keeps the screen on — you're watching it.
 *
 * Patterns come from data/breathPatterns.ts, shared with the older
 * PracticeBreathPacer (which also carries its own setup screen).
 */
export const BreathPacer: React.FC<Props> = ({ pattern: patternKey, plannedSec, pacedSec, onPhaseDone, onComplete }) => {
  const pattern = getBreathPattern(patternKey);
  const [paused, setPaused] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [count, setCount] = useState(pattern.phases[0].sec);
  const elapsedRef = useRef(pacedSec);
  // Read when a phase ends, not when it started.
  const onPhaseDoneRef = useRef(onPhaseDone);
  const onCompleteRef = useRef(onComplete);
  onPhaseDoneRef.current = onPhaseDone;
  onCompleteRef.current = onComplete;
  const step = pattern.phases[stepIndex];

  const scale = useSharedValue(1);
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.12 }],
    opacity: 0.18 + (scale.value - 1) * 0.22,
  }));

  useEffect(() => {
    activateKeepAwakeAsync('meditate-pacer');
    return () => {
      deactivateKeepAwake('meditate-pacer');
    };
  }, []);

  // Enter a phase: animate to its target, count it down, then move on. Pausing
  // re-runs the current phase from its start, and only finished phases count.
  useEffect(() => {
    if (paused) return;
    const current = pattern.phases[stepIndex];
    haptic(() =>
      Haptics.impactAsync(
        current.kind === 'exhale' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      )
    );
    scale.value = current.from;
    scale.value = withTiming(current.to, {
      duration: current.sec * 1000,
      easing: current.kind === 'hold' || current.kind === 'rest' ? Easing.linear : Easing.inOut(Easing.ease),
    });
    setCount(current.sec);
    const tick = setInterval(() => setCount((c) => (c > 1 ? c - 1 : 1)), 1000);
    const advance = setTimeout(() => {
      elapsedRef.current += current.sec;
      onPhaseDoneRef.current(current.sec);
      if (elapsedRef.current >= plannedSec) {
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        onCompleteRef.current();
        return;
      }
      setStepIndex((i) => (i + 1) % pattern.phases.length);
    }, current.sec * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(advance);
      cancelAnimation(scale);
    };
    // The pattern and plan are fixed for a running session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, stepIndex]);

  const remainingMin = Math.max(0, Math.ceil((plannedSec - elapsedRef.current) / 60));

  return (
    <View style={styles.wrap}>
      <Text style={styles.meta}>
        {pattern.label} · about {remainingMin} min left
      </Text>
      <View style={styles.stage}>
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
        <Animated.View style={[styles.circle, circleStyle]}>
          <Text style={styles.count}>{count}</Text>
        </Animated.View>
      </View>
      <Text style={styles.cue}>{paused ? 'Paused' : step.label}</Text>
      <TouchableOpacity
        style={styles.pause}
        onPress={() => setPaused((p) => !p)}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume' : 'Pause'}
      >
        <Ionicons name={paused ? 'play' : 'pause'} size={16} color={MEDITATE_ACCENT} />
        <Text style={styles.pauseText}>{paused ? 'Resume' : 'Pause'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.lg, width: '100%' },
  meta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Room for the fully-expanded circle plus its glow.
  stage: {
    width: BASE_SIZE * BREATH_FULL * 1.2,
    height: BASE_SIZE * BREATH_FULL * 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: MEDITATE_ACCENT,
  },
  circle: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEDITATE_ACCENT,
  },
  count: { fontFamily: Fonts.primaryBold, fontSize: 40, color: Colors.white },
  cue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: MEDITATE_ACCENT },
  pause: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: MEDITATE_ACCENT,
  },
  pauseText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
});

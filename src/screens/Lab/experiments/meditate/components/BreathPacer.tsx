import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, MeditateNight, Spacing, TextStyles } from '../../../../../constants/theme';
import { BREATH_FULL, BreathPatternKey, getBreathPattern } from '../../../../../data/breathPatterns';

const BASE_SIZE = 150; // diameter of the contracted circle; fully inhaled is BREATH_FULL × this

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
      <View style={styles.header}>
        <Text style={styles.title}>{pattern.label}</Text>
        <Text style={styles.meta}>About {Math.max(1, remainingMin)} min left</Text>
      </View>
      <View style={styles.stage}>
        <View style={styles.ring} pointerEvents="none" />
        <Animated.View style={[styles.circle, circleStyle]} pointerEvents="none" />
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.cue}>{paused ? 'Paused' : step.label}</Text>
          {!paused && <Text style={styles.count}>{count}</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={styles.pause}
        onPress={() => setPaused((p) => !p)}
        accessibilityRole="button"
      >
        <Text style={styles.pauseText}>{paused ? 'Resume' : 'Pause'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const FULL = BASE_SIZE * BREATH_FULL;

// Canvas "Meditate · breathing pacer": a dark teal room, a faint ring at full
// size, and the breathing circle growing into it.
const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', width: '100%' },
  header: { alignItems: 'center', gap: 4 },
  title: { ...TextStyles.headline, color: Colors.white },
  meta: { ...TextStyles.subhead, color: MeditateNight.text2 },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: FULL,
    height: FULL,
    borderRadius: FULL / 2,
    borderWidth: 1,
    borderColor: MeditateNight.veil,
  },
  circle: {
    position: 'absolute',
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    // Thin, so it stays a hairline-ish edge at full size (it scales with the circle).
    borderWidth: 1,
    borderColor: MeditateNight.glow,
    backgroundColor: MeditateNight.glow + '33',
  },
  readout: { alignItems: 'center', gap: 2 },
  cue: { ...TextStyles.title1, fontWeight: '600', color: Colors.white },
  count: { fontFamily: TextStyles.body.fontFamily, fontSize: 56, lineHeight: 64, fontWeight: '300', color: Colors.white },
  pause: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 26,
    backgroundColor: MeditateNight.veil,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pauseText: { ...TextStyles.headline, color: Colors.white },
});

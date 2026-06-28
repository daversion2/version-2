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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Slider } from '../common/Slider';

// ---------------------------------------------------------------------------
// Breathing patterns. Each is a sequence of phases the circle animates through,
// looping until the session length is reached. `from`/`to` are the circle's
// scale at the start/end of the phase (1 = contracted, FULL = fully inhaled),
// so re-entering a phase (e.g. after a pause) is deterministic and jump-free.
// The pattern keys match the breathwork practice's `technique` tracking values,
// so the chosen pattern can seed the capture form.
// ---------------------------------------------------------------------------
const FULL = 2; // fully-inhaled scale of the base circle

type PhaseKind = 'inhale' | 'hold' | 'exhale' | 'rest';
interface Phase {
  kind: PhaseKind;
  label: string;
  sec: number;
  from: number;
  to: number;
}
interface Pattern {
  key: 'box' | '478' | 'sigh' | 'coherent' | 'extended';
  label: string;
  blurb: string;
  phases: Phase[];
}

const PATTERNS: Pattern[] = [
  {
    key: 'box',
    label: 'Box',
    blurb: 'Inhale 4 · hold 4 · exhale 4 · hold 4',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: FULL },
      { kind: 'hold', label: 'Hold', sec: 4, from: FULL, to: FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 4, from: FULL, to: 1 },
      { kind: 'hold', label: 'Hold', sec: 4, from: 1, to: 1 },
    ],
  },
  {
    key: '478',
    label: '4-7-8',
    blurb: 'Inhale 4 · hold 7 · exhale 8',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: FULL },
      { kind: 'hold', label: 'Hold', sec: 7, from: FULL, to: FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 8, from: FULL, to: 1 },
    ],
  },
  {
    key: 'sigh',
    label: 'Physiological sigh',
    blurb: 'Two inhales · one long exhale',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 2, from: 1, to: 1.7 },
      { kind: 'inhale', label: 'Top up', sec: 1, from: 1.7, to: FULL },
      { kind: 'exhale', label: 'Long exhale', sec: 6, from: FULL, to: 1 },
      { kind: 'rest', label: 'Rest', sec: 1, from: 1, to: 1 },
    ],
  },
  {
    key: 'coherent',
    label: 'Coherent',
    blurb: 'Inhale 6 · exhale 6',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 6, from: 1, to: FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 6, from: FULL, to: 1 },
    ],
  },
  {
    key: 'extended',
    label: 'Extended exhale',
    blurb: 'Inhale 4 · exhale 8',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: FULL },
      { kind: 'exhale', label: 'Long exhale', sec: 8, from: FULL, to: 1 },
    ],
  },
];

const MIN_MINUTES = 1;
const MAX_MINUTES = 20;
const BASE_SIZE = 120; // diameter of the contracted circle

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// Haptics are iOS/Android-only and can throw on unsupported platforms — never let
// a buzz break the pacer.
const haptic = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* no-op */
  }
};

interface Props {
  accentColor: string;
  /** Seed session length (clamped 1–20); from the practice's default. */
  defaultMinutes: number;
  /** Fires with minutes spent + the pattern key, to seed the capture form. */
  onDone: (minutes: number, technique: Pattern['key']) => void;
  /** "I already did it" — skip straight to logging. */
  onSkip: () => void;
}

/**
 * The "pacer" variant of the breathwork session (timerDisplay: 'pacer'): a
 * follow-along breathing guide whose circle expands on the inhale, holds, and
 * contracts on the exhale, looping the chosen pattern for the set duration. A
 * gentle haptic marks each phase change. On finish the measured minutes and the
 * chosen pattern prefill the capture form.
 *
 * The visual runs on the UI thread via Reanimated; the phase state machine lives
 * in JS (timeouts) so labels, the per-phase count, and haptics stay in sync.
 * The screen is kept awake for the whole session.
 */
export const PracticeBreathPacer: React.FC<Props> = ({
  accentColor,
  defaultMinutes,
  onDone,
  onSkip,
}) => {
  const seed = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(defaultMinutes)));
  const [phase, setPhase] = useState<'setup' | 'running'>('setup');
  const [paused, setPaused] = useState(false);
  const [minutes, setMinutes] = useState(seed);
  const [patternKey, setPatternKey] = useState<Pattern['key']>('box');

  const [stepIndex, setStepIndex] = useState(0);
  const [count, setCount] = useState(0); // seconds remaining in the current phase
  const [remaining, setRemaining] = useState(seed * 60); // whole-session seconds left

  const pattern = PATTERNS.find((p) => p.key === patternKey)!;
  const step = pattern.phases[stepIndex];

  // Whole-session elapsed, accumulated as each phase completes.
  const elapsedRef = useRef(0);

  const scale = useSharedValue(1);
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // The glow halo tracks the circle but a touch larger and softer.
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.12 }],
    opacity: 0.18 + (scale.value - 1) * 0.22,
  }));

  // Keep the screen awake for the whole active session.
  useEffect(() => {
    if (phase !== 'running') return;
    activateKeepAwakeAsync('breath-pacer');
    return () => {
      deactivateKeepAwake('breath-pacer');
    };
  }, [phase]);

  // The phase engine: on entering a phase (or resuming), animate the circle to
  // the phase's target, run a 1-second visible countdown, and schedule the next
  // phase. Pausing re-runs the current phase from its start when resumed.
  useEffect(() => {
    if (phase !== 'running' || paused) return;

    const current = pattern.phases[stepIndex];
    haptic(() =>
      Haptics.impactAsync(
        current.kind === 'exhale'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
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
      const left = minutes * 60 - elapsedRef.current;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        finish();
        return;
      }
      setStepIndex((i) => (i + 1) % pattern.phases.length);
    }, current.sec * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(advance);
      cancelAnimation(scale);
    };
    // finish is stable for this run; minutes/pattern are fixed once running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, stepIndex]);

  const finish = () => {
    const spent = Math.max(1, Math.round(elapsedRef.current / 60));
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    onDone(spent, patternKey);
  };

  const start = () => {
    elapsedRef.current = 0;
    setRemaining(minutes * 60);
    setStepIndex(0);
    setPaused(false);
    setPhase('running');
  };

  const endEarly = () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    const spent = Math.max(1, Math.round((minutes * 60 - remaining) / 60));
    onDone(spent, patternKey);
  };

  // ---- Setup: pick a pattern + duration. -------------------------------------
  if (phase === 'setup') {
    return (
      <View style={styles.wrap}>
        <View style={styles.patternList}>
          {PATTERNS.map((p) => {
            const active = p.key === patternKey;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.patternCard, active && { borderColor: accentColor, backgroundColor: accentColor + '12' }]}
                onPress={() => setPatternKey(p.key)}
                activeOpacity={0.85}
              >
                <View style={styles.patternHead}>
                  <Text style={[styles.patternLabel, active && { color: accentColor }]}>{p.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
                </View>
                <Text style={styles.patternBlurb}>{p.blurb}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sliderWrap}>
          <View style={styles.sliderLabels}>
            <Text style={styles.edge}>{MIN_MINUTES} min</Text>
            <Text style={[styles.fieldValue, { color: accentColor }]}>{minutes} min</Text>
            <Text style={styles.edge}>{MAX_MINUTES} min</Text>
          </View>
          <Slider
            value={minutes}
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={1}
            onChange={setMinutes}
            color={accentColor}
          />
        </View>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: accentColor }]} onPress={start} activeOpacity={0.85}>
          <Ionicons name="play" size={18} color={Colors.white} />
          <Text style={styles.startText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>I already did it · skip pacer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Running: the follow-along breathing circle. ---------------------------
  return (
    <View style={styles.wrap}>
      <Text style={styles.sessionMeta}>
        {pattern.label} · {fmt(remaining)} left
      </Text>

      <View style={styles.stage}>
        <Animated.View
          style={[styles.glow, glowStyle, { backgroundColor: accentColor }]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.circle, circleStyle, { backgroundColor: accentColor }]}>
          <Text style={styles.circleCount}>{count}</Text>
        </Animated.View>
      </View>

      <Text style={[styles.cue, { color: accentColor }]}>{paused ? 'Paused' : step.label}</Text>

      <View style={styles.runRow}>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: accentColor }]}
          onPress={() => setPaused((p) => !p)}
          activeOpacity={0.85}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={16} color={accentColor} />
          <Text style={[styles.secondaryText, { color: accentColor }]}>{paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: Colors.gray }]}
          onPress={endEarly}
          activeOpacity={0.85}
        >
          <Ionicons name="stop" size={16} color={Colors.gray} />
          <Text style={[styles.secondaryText, { color: Colors.gray }]}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.md, width: '100%' },

  // Setup
  patternList: { width: '100%', gap: Spacing.sm },
  patternCard: {
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.cardBg,
  },
  patternHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  patternLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  patternBlurb: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2 },

  sliderWrap: { width: '100%', paddingHorizontal: Spacing.sm },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  edge: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  fieldValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    minWidth: 200,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  skip: { paddingVertical: Spacing.xs },
  skipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textDecorationLine: 'underline' },

  // Running
  sessionMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Reserve room for the fully-expanded circle (BASE_SIZE * FULL * glow factor).
  stage: {
    width: BASE_SIZE * FULL * 1.2,
    height: BASE_SIZE * FULL * 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
  },
  circle: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCount: { fontFamily: Fonts.primaryBold, fontSize: 40, color: Colors.white },
  cue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl },

  runRow: { flexDirection: 'row', gap: Spacing.md },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  secondaryText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm },
});

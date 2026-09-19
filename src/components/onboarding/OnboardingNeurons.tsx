import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 2 — THE NEURONS
//
// The mechanism, made physical. It used to be two paragraphs at the bottom of
// the premise; here a diagram carries the claim and the prose only names it.
//
// WHAT THE DIAGRAM SAYS: one pathway, three cell bodies, read left to right.
// The first connection is thin and pale, the last is thick and solid — that IS
// the claim, drawn. A signal runs the length of it on a loop so the thing being
// repeated is visibly a signal rather than a decoration.
//
// NO CITATION HERE, DELIBERATELY. Per the policy in data/habitScience.ts —
// verified or absent — naming a study would mean sourcing and checking one
// first, and an unsourced claim stated as prose is acceptable where a
// fabricated citation in a health app is not. "Fire together, wire together" is
// stated at the level it is actually established at, and nothing here claims a
// timescale, an effect size, or a named brain region.
//
// DRAWN IN VIEWS, NOT SVG. react-native-svg is not a dependency and this is not
// worth adding one for — the whole figure is circles and rectangles.
// ============================================================================

/** Geometry of the pathway, in px. The axon lengths are what `flex: 1` leaves. */
const SOMA = 34;
const PULSE = 9;

/** How long the signal takes to cross the whole pathway. */
const PULSE_DURATION = 2600;

const Soma: React.FC<{ size: number; fill: string; border: string; nucleus: string }> = ({
  size,
  fill,
  border,
  nucleus,
}) => (
  <View
    style={[
      styles.soma,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderColor: border },
    ]}
  >
    <View style={[styles.nucleus, { backgroundColor: nucleus }]} />
  </View>
);

/**
 * The travelling signal. Runs on a loop, and stops dead — rather than merely
 * slowing — when the OS reports a reduced-motion preference, because a dot
 * cycling forever in the corner of the eye is exactly what that setting is for.
 */
const Pulse: React.FC<{ width: number }> = ({ width }) => {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || width <= 0) return;
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress, reduced, width]);

  // Centre of the first soma to centre of the last, so the signal runs the
  // pathway rather than overshooting its ends.
  const from = SOMA / 2;
  const distance = Math.max(0, width - SOMA / 2 - (SOMA + 4) / 2);

  // translateX off a measured width rather than a percentage `left`: the
  // transform runs on the UI thread, a percentage layout prop does not.
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: from + progress.value * distance }],
    // Fades at both ends so the reset reads as a signal arriving, not as a dot
    // teleporting back to the start.
    opacity:
      progress.value < 0.08
        ? progress.value / 0.08
        : progress.value > 0.92
          ? (1 - progress.value) / 0.08
          : 1,
  }));

  if (reduced || width <= 0) return null;
  return (
    <Animated.View style={[styles.pulseTrack, style]} pointerEvents="none">
      <View style={styles.pulseDot} />
    </Animated.View>
  );
};

export const OnboardingNeurons: React.FC = () => {
  // The distance the signal has to travel, measured rather than assumed — the
  // pathway is laid out with flex, so nothing here knows it ahead of time.
  const [trackWidth, setTrackWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <FadeRise>
        <Text style={ob.eyebrow}>What it wires</Text>
        <Text style={ob.headline}>
          Push through it and the same handful of neurons fire together.
        </Text>
      </FadeRise>

      <FadeRise delay={400}>
        <View style={styles.figure}>
          <View
            style={styles.pathway}
            onLayout={onLayout}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Three neurons in a pathway. The connection between them thickens from left to right as the same signal is repeated."
          >
            <Soma size={SOMA} fill="#EAF2F3" border="#9FC2C8" nucleus="#9FC2C8" />
            <View style={styles.axonWeak} />
            <Soma size={SOMA} fill="#DCEAEC" border="#4E97A3" nucleus="#4E97A3" />
            <View style={styles.axonStrong} />
            <Soma
              size={SOMA + 4}
              fill={Colors.primary}
              border={Colors.primary}
              nucleus={Colors.white}
            />
            <Pulse width={trackWidth} />
          </View>
          <View style={styles.captionRow}>
            <Text style={styles.caption}>First time</Text>
            <Text style={styles.caption}>Hundredth time</Text>
          </View>
        </View>
      </FadeRise>

      <FadeRise delay={800}>
        <Text style={ob.body}>
          Neurons that fire together wire together. Repeat the same override and that pathway
          thickens and speeds up, until pushing through that internal resistance you feel becomes
          second nature.{' '}
          <Text style={ob.bodyStrong}>The friction drops because the wiring changed.</Text>
        </Text>
      </FadeRise>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },

  figure: { marginBottom: Spacing.lg },
  pathway: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  soma: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nucleus: { width: 8, height: 8, borderRadius: 4 },

  // The claim, drawn: same pathway, four times the connection.
  axonWeak: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#9FC2C8' },
  axonStrong: { flex: 1, height: 12, borderRadius: 6, backgroundColor: Colors.primary },

  // Stretched top-to-bottom and centred, so the dot stays on the axon without
  // anything having to know the row's height or padding.
  pulseTrack: {
    position: 'absolute',
    left: -PULSE / 2,
    top: 0,
    bottom: 0,
    width: PULSE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: PULSE,
    height: PULSE,
    borderRadius: PULSE / 2,
    backgroundColor: Colors.secondary,
  },

  captionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

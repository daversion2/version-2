import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { triggerRewardHaptic } from '../../utils/haptics';

interface HabitCelebrationModalProps {
  visible: boolean;
  pointsEarned: number;
  streakDays: number;
  /** Optional line under the points, e.g. the first-try double-points note. */
  bonusLabel?: string | null;
  onDismiss: () => void;
}

// "Ring close" celebration: a segmented ring sweeps shut like closing a
// fitness ring, snaps with a flash + checkmark, then the points card springs
// up and streak dots fill one by one. Pure Reanimated — OTA-safe (no Skia).
const TEAL = '#217180';
const TEAL3 = '#33ADBF';
const AMBER = '#FFA500';

const RING_SIZE = 210;
const TICKS = 44;
const TICK_W = 6;
const TICK_H = 18;
const RADIUS = RING_SIZE / 2 - TICK_H / 2 - 2;
const BURST_DOTS = 10;

const SWEEP_MS = 1000; // ring fill duration
const CLOSE_AT = SWEEP_MS + 80; // flash + check + haptic
const CARD_AT = CLOSE_AT + 180; // points card springs in
const DOTS_AT = CARD_AT + 250; // streak dots stagger
const MAX_DOTS = 7;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const hexLerp = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

/** Ring gradient along the sweep: teal → bright teal → amber. */
const sweepColor = (t: number): string =>
  t < 0.5 ? hexLerp(TEAL, TEAL3, t * 2) : hexLerp(TEAL3, AMBER, (t - 0.5) * 2);

/** One spark flying off the ring edge when it snaps shut. */
const BurstDot: React.FC<{ angle: number; color: string; size: number }> = ({
  angle,
  color,
  size,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(CLOSE_AT, withTiming(1, { duration: 600 }));
  }, []);

  const style = useAnimatedStyle(() => {
    const distance = RADIUS + 10 + 55 * progress.value;
    return {
      opacity: progress.value === 0 ? 0 : 1 - progress.value,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.burstDot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
};

export const HabitCelebrationModal: React.FC<HabitCelebrationModalProps> = ({
  visible,
  pointsEarned,
  streakDays,
  bonusLabel,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const flash = useSharedValue(0);
  const rootOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    // The subtree remounts each open (we render null when hidden), which
    // replays all entering animations — but shared values and state persist
    // on this component, so reset them here.
    setDismissed(false);
    rootOpacity.value = 1;
    buttonScale.value = 1;
    flash.value = 0;
    flash.value = withDelay(CLOSE_AT, withTiming(1, { duration: 350 }));
    const haptic = setTimeout(() => triggerRewardHaptic(), CLOSE_AT);
    return () => clearTimeout(haptic);
  }, [visible]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value === 0 ? 0 : 0.55 * (1 - flash.value),
    transform: [{ scale: 1 + 0.22 * flash.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleWorthIt = () => {
    if (dismissed) return;
    setDismissed(true);
    triggerRewardHaptic();
    buttonScale.value = withSequence(
      withSpring(1.12, { damping: 6, stiffness: 300 }),
      withTiming(1, { duration: 120 })
    );
    rootOpacity.value = withDelay(150, withTiming(0, { duration: 280 }));
    setTimeout(onDismiss, 450);
  };

  if (!visible) return null;

  const filledDots = Math.min(streakDays, MAX_DOTS);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(200)} style={[styles.overlay, rootStyle]}>
        {/* Ring */}
        <View style={styles.ring}>
          <View style={styles.innerDisc} />
          {Array.from({ length: TICKS }).map((_, i) => {
            const color = sweepColor(i / (TICKS - 1));
            return (
              // Outer view owns the radial placement; the inner view animates.
              // (Entering animations drive `transform`, so they'd clobber the
              // rotate/translate if both lived on one view.)
              <View
                key={i}
                style={[
                  styles.tickSlot,
                  { transform: [{ rotate: `${(i / TICKS) * 360}deg` }, { translateY: -RADIUS }] },
                ]}
              >
                <Animated.View
                  entering={ZoomIn.springify()
                    .damping(14)
                    .stiffness(220)
                    .delay((SWEEP_MS / TICKS) * i)}
                  style={[styles.tick, { backgroundColor: color, shadowColor: color }]}
                />
              </View>
            );
          })}
          <Animated.View style={[styles.flashRing, flashStyle]} />
          {Array.from({ length: BURST_DOTS }).map((_, i) => (
            <BurstDot
              key={i}
              angle={(i / BURST_DOTS) * Math.PI * 2}
              color={i % 2 === 0 ? AMBER : TEAL3}
              size={i % 3 === 0 ? 8 : 5}
            />
          ))}
          <Animated.View
            entering={ZoomIn.springify().damping(9).stiffness(180).delay(CLOSE_AT)}
            style={styles.checkWrap}
          >
            <Ionicons name="checkmark-sharp" size={72} color={Colors.white} />
          </Animated.View>
        </View>

        {/* Points card */}
        <Animated.View
          entering={FadeInDown.springify().damping(13).delay(CARD_AT)}
          style={styles.card}
        >
          <Text style={styles.pointsText}>+{pointsEarned}</Text>
          <Text style={styles.pointsLabel}>XP</Text>

          {!!bonusLabel && (
            <View style={styles.bonusRow}>
              <Ionicons name="sparkles" size={14} color={AMBER} />
              <Text style={styles.bonusText}>{bonusLabel}</Text>
            </View>
          )}

          {streakDays > 0 && (
            <>
              <View style={styles.dotsRow}>
                {Array.from({ length: MAX_DOTS }).map((_, i) => (
                  <View key={i} style={styles.dotSlot}>
                    {i < filledDots && (
                      <Animated.View
                        entering={ZoomIn.springify()
                          .damping(12)
                          .stiffness(260)
                          .delay(DOTS_AT + i * 110)}
                        style={styles.dotFill}
                      />
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.streakRow}>
                <Text style={styles.streakText}>{streakDays} day streak</Text>
              </View>
            </>
          )}

          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              style={styles.worthItButton}
              onPress={handleWorthIt}
              activeOpacity={0.8}
              disabled={dismissed}
            >
              <Text style={styles.worthItText}>Worth it?</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDisc: {
    position: 'absolute',
    width: RING_SIZE - TICK_H * 2 - 16,
    height: RING_SIZE - TICK_H * 2 - 16,
    borderRadius: (RING_SIZE - TICK_H * 2 - 16) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tickSlot: {
    position: 'absolute',
    left: RING_SIZE / 2 - TICK_W / 2,
    top: RING_SIZE / 2 - TICK_H / 2,
    width: TICK_W,
    height: TICK_H,
  },
  tick: {
    flex: 1,
    borderRadius: TICK_W / 2,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  flashRing: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: RING_SIZE + 8,
    height: RING_SIZE + 8,
    borderRadius: (RING_SIZE + 8) / 2,
    borderWidth: 8,
    borderColor: Colors.white,
  },
  burstDot: {
    position: 'absolute',
  },
  checkWrap: {
    shadowColor: TEAL3,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 320,
  },
  pointsText: {
    fontFamily: Fonts.primaryBold,
    fontSize: 56,
    color: Colors.primary,
    lineHeight: 60,
  },
  pointsLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  bonusText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dotSlot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.lightGray,
  },
  dotFill: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: '#FF5B02',
  },
  streakRow: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  streakText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  worthItButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  worthItText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});

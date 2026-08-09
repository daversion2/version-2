import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
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
import { NeuroscienceTidbit } from '../../types';

interface HabitCelebrationModalProps {
  visible: boolean;
  pointsEarned: number;
  streakDays: number;
  /** Optional line under the points, e.g. the first-try double-points note. */
  bonusLabel?: string | null;
  /**
   * Neuroscience tidbit shown inside this card. Previously a second modal that
   * opened after this one was dismissed — two sequential native modals (plus a
   * 300ms handoff) on every completion. Passing it here collapses the reward
   * into one surface. Omit to keep the points-only card.
   */
  tidbit?: NeuroscienceTidbit | null;
  /** Open the tidbit's extended content. Required for the "Learn more" link to show. */
  onLearnMore?: () => void;
  /** Offer the post-reward reflection. Omitted → no reflect action. */
  onReflect?: () => void;
  /**
   * Render the card already settled — no ring sweep, flash, or haptic. Used when
   * reopening after "Learn more" so the user lands back on the same card they
   * left, rather than sitting through the celebration a second time.
   */
  skipIntro?: boolean;
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
const BurstDot: React.FC<{ angle: number; color: string; size: number; skipIntro?: boolean }> = ({
  angle,
  color,
  size,
  skipIntro,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Left at 0 when the intro is skipped — the spark never fires, and the dot
    // stays fully transparent.
    if (skipIntro) return;
    progress.value = withDelay(CLOSE_AT, withTiming(1, { duration: 600 }));
  }, [skipIntro]);

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
  tidbit,
  onLearnMore,
  onReflect,
  skipIntro = false,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const flash = useSharedValue(0);
  const rootOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  // Drives the points card in (opacity + slide). A shared value rather than a
  // delayed `entering` animation: inside a native Modal, delayed entering
  // animations paint the subtree at full opacity for the first frame before
  // initializing, so the card flashed at open. A shared value starting at 0
  // is hidden from the very first frame.
  const cardProgress = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // The subtree remounts each open (we render null when hidden), which
    // replays all entering animations — but shared values and state persist
    // on this component, so reset them here.
    setDismissed(false);
    rootOpacity.value = 1;
    buttonScale.value = 1;
    flash.value = 0;

    // Reopening after "Learn more" — jump straight to the settled state.
    if (skipIntro) {
      cardProgress.value = 1;
      return;
    }

    flash.value = withDelay(CLOSE_AT, withTiming(1, { duration: 350 }));
    cardProgress.value = 0;
    cardProgress.value = withDelay(
      CARD_AT,
      withSpring(1, { damping: 13, stiffness: 100 })
    );
    const haptic = setTimeout(() => triggerRewardHaptic(), CLOSE_AT);
    return () => clearTimeout(haptic);
  }, [visible, skipIntro]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value === 0 ? 0 : 0.55 * (1 - flash.value),
    transform: [{ scale: 1 + 0.22 * flash.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Mirrors the old FadeInDown: fade + rise, with the spring's slight
  // overshoot giving a small upward bounce. Opacity is clamped so the
  // overshoot never brightens past fully opaque.
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(cardProgress.value, 1),
    transform: [{ translateY: 25 * (1 - cardProgress.value) }],
  }));

  // Shared exit: pulse the button, fade the overlay, then hand off. The 450ms
  // wait lets the fade finish before the host swaps in whatever comes next —
  // actions dispatched mid-dismissal are silently dropped on iOS.
  const handleExit = (next: () => void) => {
    if (dismissed) return;
    setDismissed(true);
    triggerRewardHaptic();
    buttonScale.value = withSequence(
      withSpring(1.12, { damping: 6, stiffness: 300 }),
      withTiming(1, { duration: 120 })
    );
    rootOpacity.value = withDelay(150, withTiming(0, { duration: 280 }));
    setTimeout(next, 450);
  };

  const handleDone = () => handleExit(onDismiss);

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
                  entering={
                    skipIntro
                      ? undefined
                      : ZoomIn.springify()
                          .damping(14)
                          .stiffness(220)
                          .delay((SWEEP_MS / TICKS) * i)
                  }
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
              skipIntro={skipIntro}
            />
          ))}
          <Animated.View
            entering={
              skipIntro
                ? undefined
                : ZoomIn.springify().damping(9).stiffness(180).delay(CLOSE_AT)
            }
            style={styles.checkWrap}
          >
            <Ionicons name="checkmark-sharp" size={72} color={Colors.white} />
          </Animated.View>
        </View>

        {/* Points card — also carries the tidbit and the reflect offer, so the
            whole reward is one surface instead of a chain of modals. */}
        <Animated.View style={[styles.card, cardStyle]}>
          <ScrollView
            contentContainerStyle={styles.cardScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
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
                          entering={
                            skipIntro
                              ? undefined
                              : ZoomIn.springify()
                                  .damping(12)
                                  .stiffness(260)
                                  .delay(DOTS_AT + i * 110)
                          }
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

            {!!tidbit && (
              <View style={styles.tidbitBlock}>
                <View style={styles.tidbitHeader}>
                  <Ionicons name="flash" size={15} color={Colors.primary} />
                  <Text style={styles.tidbitLabel}>Your brain right now</Text>
                </View>
                <Text style={styles.tidbitText}>{tidbit.text}</Text>
                {!!tidbit.extended_text && !!onLearnMore && (
                  <TouchableOpacity
                    style={styles.learnMoreRow}
                    onPress={() => handleExit(onLearnMore)}
                    activeOpacity={0.7}
                    disabled={dismissed}
                  >
                    <Text style={styles.learnMoreText}>Learn more</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Animated.View style={buttonStyle}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
                activeOpacity={0.8}
                disabled={dismissed}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>

            {!!onReflect && (
              <TouchableOpacity
                style={styles.reflectButton}
                onPress={() => handleExit(onReflect)}
                activeOpacity={0.7}
                disabled={dismissed}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={Colors.primary} />
                <Text style={styles.reflectText}>Reflect on what it took</Text>
              </TouchableOpacity>
            )}
          </View>
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
    // The card shrinks to fit; the ring must keep its size instead of squashing.
    flexShrink: 0,
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
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 320,
    // With a tidbit inside, the card can outgrow a short screen — shrink and
    // scroll its body rather than pushing the actions out of reach.
    flexShrink: 1,
  },
  cardScroll: {
    alignItems: 'center',
    flexGrow: 1,
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
  },
  streakText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },

  tidbitBlock: {
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  tidbitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tidbitLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 21,
  },
  learnMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  learnMoreText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },

  actions: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  reflectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  reflectText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  doneText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});

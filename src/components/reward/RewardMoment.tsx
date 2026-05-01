import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { triggerRewardHaptic } from '../../utils/haptics';
import { NeuroscienceTidbit } from '../../types';

interface RewardMomentProps {
  visible: boolean;
  message: string;
  narrativeLine: string;
  pointsEarned: number;
  streakMultiplier: number;
  buddyBonusPoints?: number;
  challengeResult: 'completed' | 'failed';
  repeatMilestone?: number | null;
  tidbit?: NeuroscienceTidbit | null;
  onLearnMore?: (tidbit: NeuroscienceTidbit) => void;
  onDismiss: () => void;
}

const PARTICLE_COLORS = ['#FFD700', '#FF8C00', '#FF5B02', '#FFA500', '#FFCC33'];
const PARTICLE_COUNT = 24;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Reward Particle — radial burst from center
// ============================================================================

const RewardParticle: React.FC<{
  angle: number;
  delay: number;
  color: string;
  distance: number;
  size: number;
}> = ({ angle, delay, color, distance, size }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.delay(900),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.15, 0.5, 1],
    outputRange: [0, 1.5, 1, 0.2],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
};

// Central flash that fires at the origin of the burst
const CenterFlash: React.FC = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.5, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.centerFlash,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
};

// ============================================================================
// RewardMoment — Main Component
// ============================================================================

export const RewardMoment: React.FC<RewardMomentProps> = ({
  visible,
  message,
  narrativeLine,
  pointsEarned,
  streakMultiplier,
  buddyBonusPoints,
  challengeResult,
  repeatMilestone,
  tidbit,
  onLearnMore,
  onDismiss,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const colorWashOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0.85)).current;
  const narrativeOpacity = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const showParticles = useRef(new Animated.Value(0)).current;

  const celebrationOpacity = useRef(new Animated.Value(1)).current;

  const [phase, setPhase] = useState<'celebration' | 'tidbit'>('celebration');
  const isCompleted = challengeResult === 'completed';
  const hasTidbit = isCompleted && tidbit != null;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const transitioning = useRef(false);

  useEffect(() => {
    if (!visible) return;

    // Reset all values
    overlayOpacity.setValue(0);
    colorWashOpacity.setValue(0);
    messageOpacity.setValue(0);
    messageScale.setValue(0.85);
    narrativeOpacity.setValue(0);
    pointsOpacity.setValue(0);
    buttonOpacity.setValue(0);
    showParticles.setValue(0);
    celebrationOpacity.setValue(1);
    setPhase('celebration');
    transitioning.current = false;

    // Randomized anticipation delay
    const anticipationDelay = isCompleted
      ? Math.floor(Math.random() * 1200) + 600  // 600-1800ms
      : 400; // Shorter for failed

    const animation = Animated.sequence([
      // 1. Overlay fades in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),

      // 2. Anticipation delay — screen is dark, building tension
      Animated.delay(anticipationDelay),

      // 3. Burst + wash + message cascade
      Animated.parallel([
        // Particles appear (triggers rendering)
        Animated.timing(showParticles, {
          toValue: 1,
          duration: 1,
          useNativeDriver: true,
        }),

        // Color wash fades in
        ...(isCompleted ? [
          Animated.timing(colorWashOpacity, {
            toValue: 0.25,
            duration: 800,
            useNativeDriver: true,
          }),
        ] : []),

        // Message fades in (delayed slightly after burst)
        Animated.sequence([
          Animated.delay(isCompleted ? 500 : 200),
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(messageScale, {
              toValue: 1,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }),
          ]),
        ]),

        // Narrative line fades in
        Animated.sequence([
          Animated.delay(isCompleted ? 700 : 400),
          Animated.timing(narrativeOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),

        // Points line fades in
        Animated.sequence([
          Animated.delay(isCompleted ? 900 : 600),
          Animated.timing(pointsOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),

        // Continue button fades in
        Animated.sequence([
          Animated.delay(isCompleted ? 2500 : 1500),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animationRef.current = animation;
    animation.start();

    // Fire haptic after anticipation delay
    const hapticTimeout = setTimeout(() => {
      triggerRewardHaptic();
    }, 200 + anticipationDelay); // 200ms overlay fade + delay

    return () => {
      clearTimeout(hapticTimeout);
      animationRef.current?.stop();
    };
  }, [visible]);

  if (!visible) return null;

  // Build points text
  let pointsText = `+${pointsEarned} pts`;
  if (streakMultiplier > 1) {
    pointsText += ` (${streakMultiplier}x streak)`;
  }
  if (buddyBonusPoints && buddyBonusPoints > 0) {
    pointsText += ` +${buddyBonusPoints} buddy bonus`;
  }

  // Generate particles — varied sizes and distances for visual depth
  const particles = isCompleted
    ? Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        angle: (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4,
        delay: Math.random() * 150,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        distance: 140 + Math.random() * 160,
        size: 10 + Math.random() * 10,
      }))
    : [];

  // Handle continue/done button press
  const handleContinuePress = () => {
    if (transitioning.current) return; // guard against double-tap

    if (phase === 'celebration' && hasTidbit) {
      // Transition to tidbit phase
      transitioning.current = true;

      // Stop the celebration animation chain to prevent conflicts
      animationRef.current?.stop();
      animationRef.current = null;

      overlayOpacity.setValue(1);
      celebrationOpacity.setValue(1);

      setPhase('tidbit');
      Animated.parallel([
        Animated.timing(celebrationOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(colorWashOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        transitioning.current = false;
      });
    } else {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlayContainer}>
        {/* Animated dark background (celebration fade-in) */}
        <Animated.View
          style={[styles.overlayBg, { opacity: overlayOpacity }]}
        />
        {/* Non-animated dark background for tidbit phase (native driver safe) */}
        {phase === 'tidbit' && <View style={styles.overlayBg} />}

        {/* Color wash */}
        {isCompleted && (
          <Animated.View
            style={[styles.colorWash, { opacity: colorWashOpacity }]}
          />
        )}

        {/* Particle burst */}
        {isCompleted && phase === 'celebration' && (
          <Animated.View style={[styles.particleContainer, { opacity: showParticles }]}>
            <CenterFlash />
            {particles.map((p) => (
              <RewardParticle
                key={p.id}
                angle={p.angle}
                delay={p.delay}
                color={p.color}
                distance={p.distance}
                size={p.size}
              />
            ))}
          </Animated.View>
        )}

        {/* Celebration Content (Beat 1 & 2) */}
        {phase === 'celebration' && (
          <Animated.View style={[styles.contentContainer, { opacity: celebrationOpacity }]}>
            {/* Main message */}
            <Animated.Text
              style={[
                styles.messageText,
                {
                  opacity: messageOpacity,
                  transform: [{ scale: messageScale }],
                },
              ]}
            >
              {message}
            </Animated.Text>

            {/* Narrative line */}
            {narrativeLine ? (
              <Animated.Text
                style={[styles.narrativeText, { opacity: narrativeOpacity }]}
              >
                {narrativeLine}
              </Animated.Text>
            ) : null}

            {/* Repeat milestone */}
            {repeatMilestone ? (
              <Animated.Text
                style={[styles.milestoneText, { opacity: narrativeOpacity }]}
              >
                {repeatMilestone}th time completing this challenge
              </Animated.Text>
            ) : null}

            {/* Points */}
            <Animated.Text
              style={[styles.pointsText, { opacity: pointsOpacity }]}
            >
              {pointsText}
            </Animated.Text>
          </Animated.View>
        )}

        {/* Tidbit Content (Beat 3 — The Exhale) */}
        {phase === 'tidbit' && tidbit && (
          <View style={styles.tidbitContainer}>
            {/* Label */}
            <View style={styles.tidbitLabelRow}>
              <Ionicons name="flash" size={16} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.tidbitLabel}>Your brain right now</Text>
            </View>

            {/* Tidbit text */}
            <Text style={styles.tidbitText}>{tidbit.text}</Text>

            {/* Learn more link */}
            {tidbit.extended_text && onLearnMore && (
              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => onLearnMore(tidbit)}
                activeOpacity={0.7}
              >
                <Text style={styles.learnMoreText}>Learn more</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Continue / Done button */}
        <Animated.View style={[styles.buttonContainer, { opacity: phase === 'tidbit' ? 1 : buttonOpacity }]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinuePress}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>
              {phase === 'tidbit' ? 'Done' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  colorWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#B8860B',
  },
  particleContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2,
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
  },
  centerFlash: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    marginLeft: -30,
    marginTop: -30,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  messageText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: Spacing.lg,
  },
  narrativeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  milestoneText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pointsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  // Tidbit phase styles
  tidbitContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 340,
  },
  tidbitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  tidbitLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  learnMoreText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});

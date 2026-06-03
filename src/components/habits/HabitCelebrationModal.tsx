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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { triggerRewardHaptic } from '../../utils/haptics';

interface HabitCelebrationModalProps {
  visible: boolean;
  pointsEarned: number;
  streakDays: number;
  onDismiss: () => void;
}

const PARTICLE_COLORS = ['#217180', '#2A8F9F', '#33ADBF', '#FF5B02', '#FFA500'];
const PARTICLE_COUNT = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CelebrationParticle: React.FC<{
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
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.delay(500),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 600,
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

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

export const HabitCelebrationModal: React.FC<HabitCelebrationModalProps> = ({
  visible,
  pointsEarned,
  streakDays,
  onDismiss,
}) => {
  const [showParticles, setShowParticles] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const particleBurstOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowParticles(false);
      setDismissed(false);
      contentScale.setValue(0.8);
      contentOpacity.setValue(0);
      overlayOpacity.setValue(0);

      // Entrance animation
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      triggerRewardHaptic();
    }
  }, [visible]);

  const handleWorthIt = () => {
    if (dismissed) return;
    setDismissed(true);
    setShowParticles(true);

    triggerRewardHaptic();

    // Button press animation + particle burst
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 1.15,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Dismiss after particles play
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }, 1000);
  };

  if (!visible) return null;

  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const distance = 80 + Math.random() * 60;
    const size = 6 + Math.random() * 6;
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    const delay = Math.random() * 100;
    return (
      <CelebrationParticle
        key={i}
        angle={angle}
        delay={delay}
        color={color}
        distance={distance}
        size={size}
      />
    );
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: contentScale }],
              opacity: contentOpacity,
            },
          ]}
        >
          {/* Points */}
          <Text style={styles.pointsText}>+{pointsEarned}</Text>
          <Text style={styles.pointsLabel}>pts</Text>

          {/* Streak */}
          {streakDays > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakText}>
                {streakDays} day streak
              </Text>
            </View>
          )}

          {/* Worth it? button + particle burst container */}
          <View style={styles.worthItContainer}>
            {showParticles && (
              <View style={styles.particleContainer}>
                {particles}
              </View>
            )}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.worthItButton}
                onPress={handleWorthIt}
                activeOpacity={0.8}
                disabled={dismissed}
              >
                <Text style={styles.worthItText}>Worth it?</Text>
              </TouchableOpacity>
            </Animated.View>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.xxl,
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
  worthItContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  particleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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

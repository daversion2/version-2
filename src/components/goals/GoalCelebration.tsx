import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../constants/theme';
import { triggerRewardHaptic } from '../../utils/haptics';

interface GoalCelebrationProps {
  visible: boolean;
  onComplete: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 12;
const PARTICLE_COLORS = [Colors.primary, Colors.secondary, '#7B61FF', '#FFD700'];

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({ visible, onComplete }) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      progress: new Animated.Value(0),
      angle: Math.random() * Math.PI * 2,
      distance: 80 + Math.random() * 120,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    triggerRewardHaptic();

    // Fade in overlay
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Scale in text
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(textScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Burst particles
    Animated.stagger(
      30,
      particles.map((p) =>
        Animated.timing(p.progress, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      )
    ).start();

    // Auto-dismiss after 1.5s
    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      {/* Particles */}
      {particles.map((p, i) => {
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(p.angle) * p.distance],
        });
        const translateY = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(p.angle) * p.distance],
        });
        const scale = p.progress.interpolate({
          inputRange: [0, 0.2, 0.5, 1],
          outputRange: [0, 1.5, 1, 0],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                transform: [{ translateX }, { translateY }, { scale }],
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Text */}
      <Animated.View style={{ transform: [{ scale: textScale }], opacity: textOpacity }}>
        <Text style={styles.title}>Goal set!</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.white,
    textAlign: 'center',
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CompletionStepProps {
  templateName: string;
  pointsAwarded: number;
  moodBefore?: number;
  moodAfter?: number;
}

// Particle positions for celebration burst
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    x: Math.cos(angle) * (80 + Math.random() * 40),
    y: Math.sin(angle) * (80 + Math.random() * 40),
    size: 4 + Math.random() * 4,
    delay: i * 30,
  };
});

export const CompletionStep: React.FC<CompletionStepProps> = ({
  templateName,
  pointsAwarded,
  moodBefore,
  moodAfter,
}) => {
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(15)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(15)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;
  const moodFade = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    PARTICLES.map(() => ({
      progress: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const moodDelta =
    moodBefore !== undefined && moodAfter !== undefined
      ? moodAfter - moodBefore
      : null;

  useEffect(() => {
    // Stage 1: Checkmark bursts in with ring
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Expanding ring
        Animated.timing(ringScale, {
          toValue: 1.8,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stage 2: Particles burst
    const particleAnimations = particleAnims.map((anim, idx) =>
      Animated.sequence([
        Animated.delay(200 + PARTICLES[idx].delay),
        Animated.parallel([
          Animated.timing(anim.progress, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    Animated.parallel(particleAnimations).start();

    // Stage 3: Title fades in
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          friction: 12,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stage 4: Subtitle
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleSlide, {
          toValue: 0,
          friction: 12,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stage 5: Points badge pops
    if (pointsAwarded > 0) {
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(badgeFade, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(badgeScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    // Stage 6: Mood delta
    if (moodDelta !== null && moodDelta !== 0) {
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(moodFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const particleColors = [Colors.primary, Colors.secondary, '#FFD700', '#4CAF50', '#9C27B0'];

  return (
    <View style={styles.container}>
      {/* Celebration area */}
      <View style={styles.celebrationArea}>
        {/* Expanding ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        {/* Particles */}
        {PARTICLES.map((particle, idx) => {
          const translateX = particleAnims[idx].progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, particle.x],
          });
          const translateY = particleAnims[idx].progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, particle.y],
          });
          return (
            <Animated.View
              key={idx}
              style={[
                styles.particle,
                {
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.size / 2,
                  backgroundColor: particleColors[idx % particleColors.length],
                  opacity: particleAnims[idx].opacity,
                  transform: [{ translateX }, { translateY }],
                },
              ]}
            />
          );
        })}

        {/* Checkmark icon */}
        <Animated.View
          style={[
            styles.checkContainer,
            {
              opacity: checkOpacity,
              transform: [{ scale: checkScale }],
            },
          ]}
        >
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.Text
        style={[
          styles.title,
          { opacity: titleFade, transform: [{ translateY: titleSlide }] },
        ]}
      >
        Nice work.
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          { opacity: subtitleFade, transform: [{ translateY: subtitleSlide }] },
        ]}
      >
        You just completed <Text style={styles.bold}>{templateName}</Text>.
        {'\n'}That takes real effort — and it compounds.
      </Animated.Text>

      {/* Points badge */}
      {pointsAwarded > 0 && (
        <Animated.View
          style={[
            styles.pointsBadge,
            {
              opacity: badgeFade,
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <Ionicons name="flash" size={16} color={Colors.secondary} />
          <Text style={styles.pointsText}>+{pointsAwarded} XP</Text>
        </Animated.View>
      )}

      {/* Mood delta */}
      {moodDelta !== null && moodDelta !== 0 && (
        <Animated.View style={[styles.moodDeltaRow, { opacity: moodFade }]}>
          <View
            style={[
              styles.moodPill,
              { backgroundColor: (moodDelta > 0 ? '#2E7D32' : '#D32F2F') + '12' },
            ]}
          >
            <Ionicons
              name={moodDelta > 0 ? 'trending-up' : 'trending-down'}
              size={18}
              color={moodDelta > 0 ? '#2E7D32' : '#D32F2F'}
            />
            <Text
              style={[
                styles.moodDeltaText,
                { color: moodDelta > 0 ? '#2E7D32' : '#D32F2F' },
              ]}
            >
              Mood {moodDelta > 0 ? '+' : ''}{moodDelta}
            </Text>
            <Text style={styles.moodRange}>
              {moodBefore} → {moodAfter}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  celebrationArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary + '40',
  },
  particle: {
    position: 'absolute',
  },
  checkContainer: {},
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  bold: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.dark,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary + '12',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pointsText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
  moodDeltaRow: {
    alignItems: 'center',
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  moodDeltaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  moodRange: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
});

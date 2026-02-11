import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface LevelUpPopupProps {
  visible: boolean;
  level: number;
  title: string;
  onContinue: () => void;
}

const CONFETTI_COLORS = ['#FF5B02', '#217180', '#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6'];

const ConfettiPiece: React.FC<{ delay: number; startX: number; color: string }> = ({
  delay,
  startX,
  color,
}) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(-50);
      translateX.setValue(0);
      rotate.setValue(0);
      opacity.setValue(1);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 400,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: Math.random() * 4 - 2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1500),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    };

    animate();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [-2, 2],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: startX,
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
};

export const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
  visible,
  level,
  title,
  onContinue,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      badgeScale.setValue(0);
      starRotate.setValue(0);
      glowOpacity.setValue(0);

      Animated.sequence([
        // Card appears
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        // Badge bounces in
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 4,
          tension: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Continuous star rotation
      Animated.loop(
        Animated.timing(starRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [visible]);

  const spin = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * 100 - 50 + 50,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Confetti */}
        <View style={styles.confettiContainer}>
          {confettiPieces.map((piece) => (
            <ConfettiPiece
              key={piece.id}
              delay={piece.delay}
              startX={piece.startX}
              color={piece.color}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated glow behind badge */}
          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity },
            ]}
          />

          {/* Rotating star decoration */}
          <Animated.View
            style={[
              styles.starContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Text style={styles.starText}>✦</Text>
          </Animated.View>

          <Text style={styles.congratsText}>LEVEL UP!</Text>

          <Animated.View
            style={[
              styles.levelBadge,
              { transform: [{ scale: badgeScale }] },
            ]}
          >
            <Text style={styles.levelNumber}>{level}</Text>
          </Animated.View>

          <Text style={styles.titleText}>{title}</Text>

          <View style={styles.divider} />

          <Text style={styles.messageText}>
            Your dedication is paying off!{'\n'}Keep pushing your limits.
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    top: 40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.secondary,
    opacity: 0.3,
  },
  starContainer: {
    position: 'absolute',
    top: -15,
    right: 20,
  },
  starText: {
    fontSize: 40,
    color: Colors.secondary,
  },
  congratsText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.secondary,
    letterSpacing: 3,
    marginBottom: Spacing.md,
  },
  levelBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  levelNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
    color: Colors.white,
  },
  titleText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    marginVertical: Spacing.md,
  },
  messageText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  continueButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.secondary,
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
});

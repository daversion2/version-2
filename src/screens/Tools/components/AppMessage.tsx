import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';

interface AppMessageProps {
  message: string;
  color?: string;
  delay?: number; // ms before message appears (typing indicator shows first)
  subtitle?: string;
}

export const AppMessage: React.FC<AppMessageProps> = ({
  message,
  color = Colors.primary,
  delay = 600,
  subtitle,
}) => {
  const [showMessage, setShowMessage] = useState(delay === 0);
  const fadeAnim = useRef(new Animated.Value(delay === 0 ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(delay === 0 ? 1 : 0.95)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (delay === 0) return;

    // Animate typing dots
    const dotSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dotAnim1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      ])
    );
    dotSequence.start();

    const timer = setTimeout(() => {
      dotSequence.stop();
      setShowMessage(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => {
      clearTimeout(timer);
      dotSequence.stop();
    };
  }, [delay]);

  return (
    <View style={styles.container}>
      {!showMessage && (
        <View style={[styles.typingBubble, { backgroundColor: color + '12' }]}>
          <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dotAnim1 }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dotAnim2 }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dotAnim3 }]} />
        </View>
      )}
      {showMessage && (
        <Animated.View
          style={[
            styles.messageBubble,
            { backgroundColor: color + '10', borderLeftColor: color },
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.messageText}>{message}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messageBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
  },
  messageText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

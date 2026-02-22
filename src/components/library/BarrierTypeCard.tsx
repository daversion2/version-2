import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { BarrierTypeConfig, LIBRARY_UI_TEXT } from '../../constants/challengeLibrary';

interface BarrierTypeCardProps {
  barrier: BarrierTypeConfig;
  count: number;
  onPress: () => void;
}

export const BarrierTypeCard: React.FC<BarrierTypeCardProps> = ({
  barrier,
  count,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: barrier.color, transform: [{ scale }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{barrier.icon}</Text>
          <Text style={[styles.name, { color: barrier.accentColor }]}>
            {barrier.name}
          </Text>
        </View>

        <Text style={styles.description}>{barrier.shortDescription}</Text>

        <View style={styles.footer}>
          <Text style={[styles.count, { color: barrier.accentColor }]}>
            {count} {LIBRARY_UI_TEXT.barrierCardChallengesLabel}
          </Text>
          <Text style={[styles.arrow, { color: barrier.accentColor }]}>→</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  icon: {
    fontSize: 20,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    flex: 1,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  count: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
  },
  arrow: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
  },
});

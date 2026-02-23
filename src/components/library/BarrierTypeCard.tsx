import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ActionCategoryConfig, LIBRARY_UI_TEXT } from '../../constants/challengeLibrary';

interface ActionCategoryCardProps {
  category: ActionCategoryConfig;
  count: number;
  onPress: () => void;
}

export const ActionCategoryCard: React.FC<ActionCategoryCardProps> = ({
  category,
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
          { backgroundColor: category.color, transform: [{ scale }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{category.icon}</Text>
          <Text style={[styles.name, { color: category.accentColor }]}>
            {category.name}
          </Text>
        </View>

        <Text style={styles.description}>{category.shortDescription}</Text>

        <View style={styles.footer}>
          <Text style={[styles.count, { color: category.accentColor }]}>
            {count} {LIBRARY_UI_TEXT.actionCardChallengesLabel}
          </Text>
          <Text style={[styles.arrow, { color: category.accentColor }]}>→</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Keep BarrierTypeCard as an alias for backward compatibility
export const BarrierTypeCard = ActionCategoryCard;

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

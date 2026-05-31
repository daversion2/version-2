import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../common/InputField';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { GOAL_CONSTANTS } from '../../constants/goals';
import { GoalObstacle } from '../../types';

interface ObstaclePlanPairProps {
  obstacle: GoalObstacle;
  onChange: (updated: GoalObstacle) => void;
  onRemove?: () => void;
  isFirst: boolean;
}

export const ObstaclePlanPair: React.FC<ObstaclePlanPairProps> = ({
  obstacle,
  onChange,
  onRemove,
  isFirst,
}) => {
  const showPlan = obstacle.obstacle.trim().length > 0;
  const planFade = useRef(new Animated.Value(showPlan ? 1 : 0)).current;
  const planSlide = useRef(new Animated.Value(showPlan ? 0 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(planFade, { toValue: showPlan ? 1 : 0, duration: 250, useNativeDriver: true }),
      Animated.timing(planSlide, { toValue: showPlan ? 0 : 20, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [showPlan]);

  return (
    <View style={styles.container}>
      <View style={styles.obstacleRow}>
        <View style={styles.obstacleField}>
          <InputField
            label={isFirst ? 'What\'s the ONE thing most likely to derail you?' : 'Another obstacle'}
            value={obstacle.obstacle}
            onChangeText={(v) => onChange({ ...obstacle, obstacle: v })}
            placeholder="e.g., Feeling too tired after work"
            multiline
            maxLength={GOAL_CONSTANTS.OBSTACLE_MAX_LENGTH}
          />
        </View>
        {!isFirst && onRemove && (
          <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
            <Ionicons name="close-circle" size={22} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {showPlan && (
        <Animated.View style={{ opacity: planFade, transform: [{ translateY: planSlide }] }}>
          <View style={styles.planCard}>
            <Text style={styles.whenLabel}>
              When <Text style={styles.whenHighlight}>{obstacle.obstacle.trim()}</Text>, I will...
            </Text>
            <InputField
              label=""
              value={obstacle.when_then_plan}
              onChangeText={(v) => onChange({ ...obstacle, when_then_plan: v })}
              placeholder="What will you do instead?"
              multiline
              maxLength={GOAL_CONSTANTS.PLAN_MAX_LENGTH}
            />
          </View>

          <InputField
            label="And if that's not possible, my minimum action is... (optional)"
            value={obstacle.minimum_action || ''}
            onChangeText={(v) => onChange({ ...obstacle, minimum_action: v })}
            placeholder="The smallest thing you can do"
            maxLength={GOAL_CONSTANTS.PLAN_MAX_LENGTH}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  obstacleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  obstacleField: {
    flex: 1,
  },
  removeButton: {
    padding: Spacing.sm,
    marginTop: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  whenLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  whenHighlight: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
});

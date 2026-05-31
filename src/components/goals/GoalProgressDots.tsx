import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface GoalProgressDotsProps {
  totalSteps: number;
  currentStep: number;
  skippedSteps: Set<number>;
}

export const GoalProgressDots: React.FC<GoalProgressDotsProps> = ({
  totalSteps,
  currentStep,
  skippedSteps,
}) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }, (_, idx) => {
        const step = idx + 1;
        const isSkipped = skippedSteps.has(step);
        const isActive = step <= currentStep;
        const isCurrent = step === currentStep;

        return (
          <View
            key={step}
            style={[
              styles.dot,
              isSkipped && styles.dotSkipped,
              isActive && styles.dotActive,
              isCurrent && styles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  dotSkipped: {
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotCurrent: {
    backgroundColor: Colors.secondary,
  },
});

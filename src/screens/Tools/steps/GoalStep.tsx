import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { GoalTagPicker } from '../../../components/goals/GoalTagPicker';

interface GoalStepProps {
  selectedGoalIds: string[];
  onChange: (ids: string[]) => void;
}

export const GoalStep: React.FC<GoalStepProps> = ({ selectedGoalIds, onChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Link to a goal?</Text>
      <Text style={styles.subtitle}>
        Connecting this work to a goal helps you see patterns over time.
      </Text>
      <GoalTagPicker selectedGoalIds={selectedGoalIds} onChange={onChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getActiveGoals } from '../../services/goals';
import { Goal } from '../../types';

interface GoalTagPickerProps {
  selectedGoalIds: string[];
  onChange: (ids: string[]) => void;
}

export const GoalTagPicker: React.FC<GoalTagPickerProps> = ({
  selectedGoalIds,
  onChange,
}) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getActiveGoals(user.uid)
      .then(setGoals)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Link to Goals</Text>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (goals.length === 0) return null;

  const toggleGoal = (goalId: string) => {
    if (selectedGoalIds.includes(goalId)) {
      onChange(selectedGoalIds.filter(id => id !== goalId));
    } else {
      onChange([...selectedGoalIds, goalId]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Link to Goals</Text>
      <View style={styles.chipRow}>
        {goals.map(goal => {
          const selected = selectedGoalIds.includes(goal.id);
          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleGoal(goal.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selected ? 'flag' : 'flag-outline'}
                size={14}
                color={selected ? Colors.white : Colors.primary}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {goal.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  chipTextSelected: {
    color: Colors.white,
  },
});

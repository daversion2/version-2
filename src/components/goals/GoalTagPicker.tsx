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
  required?: boolean;
  onCreateGoal?: () => void;
}

export const GoalTagPicker: React.FC<GoalTagPickerProps> = ({
  selectedGoalIds,
  onChange,
  required = false,
  onCreateGoal,
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

  const label = required ? 'Which goal is this for?' : 'Link to Goals';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredIndicator}>Required</Text>}
        </View>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (goals.length === 0) {
    if (!required) return null;
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.requiredIndicator}>Required</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={20} color={Colors.gray} />
          <Text style={styles.emptyText}>
            You need at least one goal — create one to get started
          </Text>
          {onCreateGoal && (
            <TouchableOpacity style={styles.createGoalButton} onPress={onCreateGoal}>
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.createGoalText}>Create Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const toggleGoal = (goalId: string) => {
    if (selectedGoalIds.includes(goalId)) {
      onChange(selectedGoalIds.filter(id => id !== goalId));
    } else {
      onChange([...selectedGoalIds, goalId]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredIndicator}>Required</Text>}
      </View>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  requiredIndicator: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
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
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
  createGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
    marginTop: Spacing.xs,
  },
  createGoalText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});

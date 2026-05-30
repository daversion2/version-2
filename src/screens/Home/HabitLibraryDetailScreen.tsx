import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { GoalTagPicker } from '../../components/goals/GoalTagPicker';
import { HABIT_LIBRARY } from '../../data/habitLibrary';
import { useAuth } from '../../context/AuthContext';
import { createHabit } from '../../services/habits';
import { HabitActionPlan } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = HomeScreenProps<'HabitLibraryDetail'>;


const ACTION_PLAN_LABELS: { key: keyof HabitActionPlan; label: string }[] = [
  { key: 'cue', label: 'When & where' },
  { key: 'environment_change', label: 'Environment tweak' },
  { key: 'obstacle_plan', label: 'Obstacle plan' },
  { key: 'minimum_version', label: 'Minimum version' },
  { key: 'accountability_person', label: 'Accountability' },
];

export const HabitLibraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId } = route.params;
  const { user } = useAuth();

  const habit = HABIT_LIBRARY.find((h) => h.id === habitId);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  if (!habit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Habit not found.</Text>
      </View>
    );
  }

  const color = Colors.primary;

  const handleAdd = async () => {
    if (selectedGoalIds.length === 0) {
      showAlert('Required', 'Please select at least one goal for this habit.');
      return;
    }
    if (!user) return;
    setAdding(true);
    try {
      const newHabitId = await createHabit(user.uid, {
        name: habit.name,
        target_count_per_week: habit.suggested_target_per_week,
        goal_ids: selectedGoalIds,
        action_plan: habit.action_plan,
        created_by_user: false,
      });
      navigation.navigate('HabitActionPlan', {
        habitId: newHabitId,
        prefilled: habit.action_plan,
        afterSaveRoute: 'ManageHabits',
      });
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.habitName}>{habit.name}</Text>
      <Text style={styles.description}>{habit.description}</Text>

      {/* Suggested frequency */}
      <View style={styles.freqRow}>
        <Ionicons name="repeat-outline" size={16} color={Colors.gray} />
        <Text style={styles.freqText}>
          Suggested: {habit.suggested_target_per_week}× per week
        </Text>
      </View>

      {/* Action Plan Preview */}
      <Text style={styles.sectionTitle}>Action Plan Preview</Text>
      <Text style={styles.sectionSubtitle}>
        These answers come pre-filled. You'll be able to review and personalise each one after adding.
      </Text>
      {ACTION_PLAN_LABELS.map(({ key, label }) => {
        const value = habit.action_plan[key];
        if (!value) return null;
        return (
          <Card key={key} style={styles.planCard}>
            <Text style={styles.planLabel}>{label}</Text>
            <Text style={styles.planValue}>{value}</Text>
          </Card>
        );
      })}

      {/* Goal picker */}
      <Text style={styles.sectionTitle}>Link to a Goal</Text>
      <GoalTagPicker
        selectedGoalIds={selectedGoalIds}
        onChange={setSelectedGoalIds}
        required
        onCreateGoal={() => navigation.navigate('GoalOnboardingFlow')}
      />

      {/* Add button */}
      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: color },
          (adding || selectedGoalIds.length === 0) && styles.addBtnDisabled,
        ]}
        onPress={handleAdd}
        disabled={adding || selectedGoalIds.length === 0}
      >
        {adding ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>Add to My Habits</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  freqText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sectionSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  planCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  planLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

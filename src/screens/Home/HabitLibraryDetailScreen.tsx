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
import { HABIT_LIBRARY, getHabitCategory } from '../../data/habitLibrary';
import { useAuth } from '../../context/AuthContext';
import { createHabit } from '../../services/habits';
import { HabitActionPlan } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = HomeScreenProps<'HabitLibraryDetail'>;


const ACTION_PLAN_LABELS: {
  key: keyof HabitActionPlan;
  label: string;
  fallbackKey?: keyof HabitActionPlan;
}[] = [
  { key: 'anchor', label: 'After I…', fallbackKey: 'cue' },
  { key: 'pairing', label: 'Pair it with' },
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

  const category = getHabitCategory(habit.category_id);
  const color = category?.color ?? Colors.primary;

  const handleAdd = async () => {
    if (!user) return;
    setAdding(true);
    try {
      const supportsPairing = !!habit.action_plan.pairing;
      const newHabitId = await createHabit(user.uid, {
        name: habit.name,
        target_count_per_week: habit.suggested_target_per_week,
        ...(selectedGoalIds.length > 0 ? { goal_ids: selectedGoalIds } : {}),
        action_plan: habit.action_plan,
        created_by_user: false,
        supports_pairing: supportsPairing,
      });
      navigation.navigate('HabitActionPlan', {
        habitId: newHabitId,
        prefilled: habit.action_plan,
        afterSaveRoute: 'ManageHabits',
        supportsPairing,
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
      {category && (
        <View style={[styles.categoryChip, { backgroundColor: color + '1A' }]}>
          <Ionicons name={category.icon as any} size={13} color={color} />
          <Text style={[styles.categoryText, { color }]}>{category.name}</Text>
        </View>
      )}
      <Text style={styles.habitName}>{habit.name}</Text>
      <Text style={styles.description}>{habit.description}</Text>

      {/* Identity framing */}
      {!!habit.identity && (
        <View style={[styles.identityCard, { borderLeftColor: color }]}>
          <Text style={styles.identityText}>{habit.identity}</Text>
        </View>
      )}

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
      {ACTION_PLAN_LABELS.map(({ key, label, fallbackKey }) => {
        const value =
          habit.action_plan[key] || (fallbackKey ? habit.action_plan[fallbackKey] : undefined);
        if (!value) return null;
        return (
          <Card key={key} style={styles.planCard}>
            <Text style={styles.planLabel}>{label}</Text>
            <Text style={styles.planValue}>{value}</Text>
          </Card>
        );
      })}

      {/* Goal picker */}
      <Text style={styles.sectionTitle}>Link to a Goal (optional)</Text>
      <GoalTagPicker
        selectedGoalIds={selectedGoalIds}
        onChange={setSelectedGoalIds}
        onCreateGoal={() => navigation.navigate('GoalCreationFlow')}
      />

      {/* Add button */}
      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: color },
          adding && styles.addBtnDisabled,
        ]}
        onPress={handleAdd}
        disabled={adding}
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
  identityCard: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  identityText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    fontStyle: 'italic',
    color: Colors.dark,
    lineHeight: 22,
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

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';
import { PracticeInstance } from '../../../types';
import { PracticeCard } from '../../../components/practices/PracticeCard';
import { WeeklyGoalSheet } from '../../../components/practices/WeeklyGoalSheet';
import {
  getPractice,
  getPracticeColor,
  getPracticeIntensity,
  getIntensityTier,
  compareByIntensity,
} from '../../../data/practices';

/**
 * "Your Practices" — the home redesign's centerpiece. Every adopted practice is
 * shown as a card, ordered gentle → extreme (by intensity tier). Each card shows
 * the why-it-works hook, weekly progress, a tappable weekly-goal chip, and a
 * Start / Done-today action. Practices are owned by default (no "add" step here).
 */
export const PracticesSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const { habits, weeklyCounts, completedTodayIds } = data;

  const [editingHabit, setEditingHabit] = useState<PracticeInstance | null>(null);

  // Gentle → extreme.
  const ordered = useMemo(() => [...habits].sort(compareByIntensity), [habits]);

  const doneTodaySet = useMemo(() => new Set(completedTodayIds), [completedTodayIds]);
  const doneTodayCount = ordered.reduce((n, h) => (doneTodaySet.has(h.id) ? n + 1 : n), 0);

  if (ordered.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="flame-outline" size={40} color={Colors.primary} />
        <Text style={styles.emptyTitle}>Your practices live here</Text>
        <Text style={styles.emptyText}>
          Add your daily training from the Practices tab — then start and track each rep right here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your practices</Text>
        <Text style={styles.count}>
          {doneTodayCount} of {ordered.length} done
        </Text>
      </View>

      {ordered.map((habit) => {
        const practice = getPractice(habit.practice_id);
        const tier = getIntensityTier(getPracticeIntensity(habit))!;
        return (
          <PracticeCard
            key={habit.id}
            habit={habit}
            color={getPracticeColor(habit)}
            tier={tier}
            icon={practice?.icon || 'ellipse-outline'}
            why={practice?.whyItWorks || ''}
            weeklyDone={weeklyCounts[habit.id] || 0}
            doneToday={doneTodaySet.has(habit.id)}
            onPress={() => callbacks.onHabitTap(habit)}
            onEditGoal={() => setEditingHabit(habit)}
          />
        );
      })}

      <WeeklyGoalSheet
        visible={!!editingHabit}
        practiceName={editingHabit?.name || ''}
        initialTarget={editingHabit?.target_count_per_week || 3}
        onSave={(target) => {
          if (editingHabit) callbacks.onSetWeeklyGoal?.(editingHabit.id, target);
        }}
        onClose={() => setEditingHabit(null)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  count: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },

  empty: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

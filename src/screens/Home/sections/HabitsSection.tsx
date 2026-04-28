import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { HomeSectionProps } from './types';

export const HabitsSection: React.FC<HomeSectionProps> = ({ data, callbacks, refs }) => {
  const { habits, weeklyCounts, habitStreaks } = data;

  return (
    <>
      <View style={styles.habitsHeader}>
        <Text style={styles.sectionTitle}>Habits</Text>
        <View ref={refs?.habitsAddRef} collapsable={false}>
          <TouchableOpacity onPress={() => callbacks.onNavigate('ManageHabits')}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {habits.length === 0 ? (
        <View ref={refs?.habitAreaRef} collapsable={false}>
          <Card>
            <Text style={styles.noChallenge}>No habits yet</Text>
            <Button
              title="Add a Habit"
              onPress={() => callbacks.onNavigate('ManageHabits')}
              variant="outline"
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>
      ) : (
        habits.map((habit, index) => {
          const done = weeklyCounts[habit.id] || 0;
          const target = habit.target_count_per_week;
          const isComplete = done >= target;
          const streak = habitStreaks[habit.id]?.currentStreak || 0;
          return (
            <View
              key={habit.id}
              ref={index === 0 ? refs?.habitAreaRef : undefined}
              collapsable={false}
            >
              <Card style={styles.habitCard} onPress={() => callbacks.onHabitTap(habit)}>
                <View style={styles.habitRow}>
                  <Ionicons
                    name={isComplete ? 'checkmark-circle' : 'radio-button-off'}
                    size={24}
                    color={isComplete ? Colors.secondary : Colors.primary}
                  />
                  <View style={styles.habitInfo}>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      {streak > 1 && (
                        <View style={styles.streakBadge}>
                          <Ionicons name="flame" size={14} color={Colors.secondary} />
                          <Text style={styles.streakText}>{streak}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.habitMeta}>
                      <View style={[styles.catBadge, { backgroundColor: callbacks.getCatColor(habit.category_id) + '20' }]}>
                        <Text style={[styles.catBadgeText, { color: callbacks.getCatColor(habit.category_id) }]}>
                          {habit.category_id}
                        </Text>
                      </View>
                      <Text style={styles.progressText}>
                        {done} / {target} this week
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => callbacks.onNavigate('HabitDetail', { habitId: habit.id })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="stats-chart" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          );
        })
      )}
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  habitCard: { marginBottom: Spacing.sm },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  habitInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  streakText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  reportBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  progressText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  catBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  catBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  noChallenge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
});

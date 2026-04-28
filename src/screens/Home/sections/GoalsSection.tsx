import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/challenge/ProgressBar';
import { HomeSectionProps } from './types';

const getDaysRemaining = (endDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const GoalsSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const { goals } = data;
  const expiredGoals = goals.filter(g => getDaysRemaining(g.end_date) < 0);
  const activeGoals = goals.filter(g => getDaysRemaining(g.end_date) >= 0);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <TouchableOpacity onPress={() => callbacks.onNavigate('CreateGoal')}>
          <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Expired goals banner */}
      {expiredGoals.length > 0 && (
        <Card style={styles.expiredBanner}>
          <View style={styles.expiredHeader}>
            <Ionicons name="alert-circle" size={20} color={Colors.secondary} />
            <Text style={styles.expiredTitle}>
              {expiredGoals.length === 1 ? '1 goal has' : `${expiredGoals.length} goals have`} passed {expiredGoals.length === 1 ? 'its' : 'their'} deadline
            </Text>
          </View>
          <Text style={styles.expiredHint}>
            Tap to mark as completed or not completed
          </Text>
          {expiredGoals.map(goal => (
            <TouchableOpacity
              key={goal.id}
              style={styles.expiredGoalRow}
              onPress={() => callbacks.onNavigate('GoalDashboard', { goalId: goal.id })}
            >
              <Ionicons name="flag" size={16} color={Colors.secondary} />
              <Text style={styles.expiredGoalName} numberOfLines={1}>{goal.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {goals.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No active goals</Text>
          <Button
            title="Create a Goal"
            onPress={() => callbacks.onNavigate('CreateGoal')}
            variant="outline"
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      ) : (
        [...activeGoals, ...expiredGoals].map(goal => {
          const daysRemaining = getDaysRemaining(goal.end_date);
          const expired = daysRemaining < 0;

          return (
            <Card
              key={goal.id}
              style={expired ? { ...styles.goalCard, ...styles.goalCardExpired } : styles.goalCard}
              onPress={() => callbacks.onNavigate('GoalDashboard', { goalId: goal.id })}
            >
              <View style={styles.goalHeader}>
                <Ionicons name="flag" size={20} color={expired ? Colors.secondary : Colors.primary} />
                <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
              </View>
              <ProgressBar
                progress={goal.manual_progress / 100}
                showPercentage
                label={expired ? 'Overdue' : `${daysRemaining} days left`}
                color={expired ? Colors.secondary : Colors.primary}
              />
            </Card>
          );
        })
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  goalCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  goalCardExpired: {
    borderLeftColor: Colors.secondary,
  },
  expiredBanner: {
    backgroundColor: Colors.secondary + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.md,
  },
  expiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expiredTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    flex: 1,
  },
  expiredHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  expiredGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary + '20',
  },
  expiredGoalName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  goalName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
});

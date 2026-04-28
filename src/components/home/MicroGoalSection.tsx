import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { MicroGoal } from '../../types';
import { isExpired } from '../../services/microGoals';
import { MICRO_GOAL_CONSTANTS } from '../../constants/microGoals';
import { MicroGoalCard } from './MicroGoalCard';
import { MicroGoalQuickAdd } from './MicroGoalQuickAdd';

interface MicroGoalSectionProps {
  microGoals: MicroGoal[];
  onComplete: (microGoalId: string) => void;
  onDelete: (microGoalId: string) => void;
  onAdd: (description: string, deadline: string) => Promise<void>;
  onPressMore: () => void;
}

export const MicroGoalSection: React.FC<MicroGoalSectionProps> = ({
  microGoals,
  onComplete,
  onDelete,
  onAdd,
  onPressMore,
}) => {
  const hasActiveGoals = microGoals.some(g => g.status === 'active');
  const [collapsed, setCollapsed] = useState(!hasActiveGoals && microGoals.length > 0);

  const completedCount = microGoals.filter(g => g.status === 'completed').length;
  const totalCount = microGoals.length;
  const atCap = totalCount >= MICRO_GOAL_CONSTANTS.MAX_PER_DAY;

  return (
    <View style={styles.wrapper}>
      {/* Section Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setCollapsed(!collapsed)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Today's Sprints</Text>
          {totalCount > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{completedCount}/{totalCount}</Text>
            </View>
          )}
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={Colors.gray}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressMore}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Collapsible Content */}
      {!collapsed && (
        <Card style={styles.card}>
          {microGoals.length > 0 ? (
            microGoals.map(goal => (
              <MicroGoalCard
                key={goal.id}
                microGoal={goal}
                isExpired={isExpired(goal)}
                onComplete={onComplete}
                onDelete={onDelete}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              Set a quick goal with a deadline to build momentum
            </Text>
          )}

          <MicroGoalQuickAdd
            onAdd={onAdd}
            disabled={atCap}
            currentCount={totalCount}
            maxCount={MICRO_GOAL_CONSTANTS.MAX_PER_DAY}
          />
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  countPill: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  card: {
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});

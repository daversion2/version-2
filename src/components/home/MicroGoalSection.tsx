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
      {/* Section Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="flash-outline" size={28} color={Colors.white} />
          </View>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setCollapsed(!collapsed)}
            activeOpacity={0.7}
          >
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Quick Wins</Text>
              {totalCount > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{completedCount}/{totalCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              Set a quick goal with a deadline to get moving
            </Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onPressMore}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.white + '80'} />
            </TouchableOpacity>
            <Ionicons
              name={collapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={Colors.white + '80'}
            />
          </View>
        </View>
      </Card>

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
  headerCard: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countPill: {
    backgroundColor: Colors.white + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
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

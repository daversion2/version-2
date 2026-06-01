import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getActiveGoals, getAllGoals, computeGoalFollowThrough, getItemsForGoal, getDraftGoals } from '../../services/goals';
import { getWillpowerStats } from '../../services/willpower';
import { Goal, GoalFollowThrough, MeasurementProgress } from '../../types';
import { getMeasurementProgress } from '../../services/measurements';
import { GOAL_CONSTANTS } from '../../constants/goals';
import { GoalsNavigation } from '../../types/navigation';

interface GoalCardData {
  goal: Goal;
  followThrough: GoalFollowThrough | null;
  linkedCounts: { challenges: number; habits: number; programs: number };
  measurementProgress: MeasurementProgress | null;
}

const getDaysRemaining = (endDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getHealthColor = (rate: number): string => {
  if (rate >= 0.7) return Colors.success;
  if (rate >= 0.5) return '#F5A623';
  return Colors.secondary;
};

export const GoalsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<GoalsNavigation>();
  const [loading, setLoading] = useState(true);
  const [goalCards, setGoalCards] = useState<GoalCardData[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [draftGoals, setDraftGoals] = useState<Goal[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [activeGoals, allGoals, drafts] = await Promise.all([
        getActiveGoals(user.uid),
        getAllGoals(user.uid),
        getDraftGoals(user.uid),
      ]);
      setDraftGoals(drafts);

      const cards = await Promise.all(
        activeGoals.map(async (goal) => {
          const [ft, items] = await Promise.all([
            computeGoalFollowThrough(user.uid, goal.id),
            getItemsForGoal(user.uid, goal.id),
          ]);
          let mp: MeasurementProgress | null = null;
          if (goal.measurement_type) {
            try {
              mp = await getMeasurementProgress(user.uid, goal);
            } catch { /* ignore */ }
          }
          return {
            goal,
            followThrough: ft,
            linkedCounts: {
              challenges: items.challenges.length,
              habits: items.habits.length,
              programs: items.programEnrollments.length,
            },
            measurementProgress: mp,
          };
        })
      );

      setGoalCards(cards);
      setCompletedGoals(allGoals.filter(g => g.status !== 'active'));
    } catch (e) {
      console.error('Failed to load goals:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const canAddGoal = goalCards.length < GOAL_CONSTANTS.MAX_ACTIVE;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Draft Banner */}
      {draftGoals.length > 0 && (
        <TouchableOpacity
          style={styles.draftBanner}
          onPress={() => navigation.navigate('GoalCreationFlow', { draftId: draftGoals[0].id })}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.draftBannerTitle}>
              {draftGoals[0].name ? `Continue: ${draftGoals[0].name}` : 'You have a draft goal'}
            </Text>
            <Text style={styles.draftBannerSubtitle}>Tap to continue where you left off</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
      )}

      {/* Active Goals */}
      {goalCards.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="flag-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyTitle}>No Active Goals</Text>
          <Text style={styles.emptyText}>
            Set a goal to start tracking your progress and building momentum.
          </Text>
          <Button
            title="Create Your First Goal"
            onPress={() => navigation.navigate('GoalCreationFlow')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      ) : (
        goalCards.map(({ goal, followThrough, linkedCounts, measurementProgress: mp }) => {
          const ftRate = followThrough?.followThroughRate ?? 0;
          const ftPct = Math.round(ftRate * 100);
          const daysLeft = getDaysRemaining(goal.end_date);
          const healthColor = getHealthColor(ftRate);

          const parts: string[] = [];
          if (linkedCounts.challenges > 0) parts.push(`${linkedCounts.challenges} challenge${linkedCounts.challenges !== 1 ? 's' : ''}`);
          if (linkedCounts.habits > 0) parts.push(`${linkedCounts.habits} habit${linkedCounts.habits !== 1 ? 's' : ''}`);
          if (linkedCounts.programs > 0) parts.push(`${linkedCounts.programs} program${linkedCounts.programs !== 1 ? 's' : ''}`);
          const linkedSummary = parts.length > 0 ? parts.join(', ') : 'No actions yet';

          return (
            <TouchableOpacity
              key={goal.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GoalDashboard', { goalId: goal.id })}
            >
              <Card style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalNameRow}>
                    <Text style={styles.goalName} numberOfLines={2}>{goal.name}</Text>
                  </View>
                  <View style={[styles.ftBadge, { backgroundColor: healthColor + '15' }]}>
                    <Text style={[styles.ftPct, { color: healthColor }]}>{ftPct}%</Text>
                  </View>
                </View>

                {goal.identity_statement && (
                  <Text style={styles.identityPreview} numberOfLines={1}>
                    {`"${goal.identity_statement}"`}
                  </Text>
                )}

                <View style={styles.goalMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="layers-outline" size={14} color={Colors.gray} />
                    <Text style={styles.metaText}>{linkedSummary}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name={daysLeft < 0 ? 'alert-circle-outline' : 'time-outline'}
                      size={14}
                      color={daysLeft < 0 ? Colors.secondary : Colors.gray}
                    />
                    <Text style={[styles.metaText, daysLeft < 0 && { color: Colors.secondary }]}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                    </Text>
                  </View>
                </View>

                {/* Follow-through bar */}
                <View style={styles.ftBarContainer}>
                  <View style={styles.ftBar}>
                    <View style={[styles.ftBarFill, { width: `${ftPct}%`, backgroundColor: healthColor }]} />
                  </View>
                </View>

                {followThrough && followThrough.currentWeekCommitments > 0 && (
                  <Text style={styles.weeklyText}>
                    This week: {followThrough.currentWeekKept}/{followThrough.currentWeekCommitments} kept
                  </Text>
                )}

                {mp && goal.measurement_type && goal.measurement_type !== 'done_by_date' && (
                  <Text style={styles.measurementIndicator}>
                    {goal.measurement_type === 'reach_number' && mp.metric_name
                      ? `${mp.current_value}/${mp.target_value ?? 0} ${mp.metric_name}`
                      : goal.measurement_type === 'reach_number'
                      ? `${mp.current_value}/${mp.target_value ?? 0}`
                      : goal.measurement_type === 'hit_total'
                      ? `${mp.current_value}/${mp.target_value ?? 0}`
                      : goal.measurement_type === 'rate_yourself' && mp.total_entries > 0
                      ? `Last: ${mp.current_value}/${mp.target_value ?? 10}`
                      : null}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      {/* Add Goal */}
      {canAddGoal && goalCards.length > 0 && (
        <Button
          title="Add Goal"
          variant="outline"
          onPress={() => navigation.navigate('GoalCreationFlow')}
          style={{ marginTop: Spacing.sm }}
        />
      )}
      {!canAddGoal && (
        <Text style={styles.capText}>
          {GOAL_CONSTANTS.MAX_ACTIVE} active goals max — complete or archive one to add another
        </Text>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.completedToggle}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Text style={styles.completedToggleText}>
              Past Goals ({completedGoals.length})
            </Text>
            <Ionicons
              name={showCompleted ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.gray}
            />
          </TouchableOpacity>

          {showCompleted && completedGoals.map(goal => (
            <TouchableOpacity
              key={goal.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GoalDashboard', { goalId: goal.id })}
            >
              <Card style={styles.completedCard}>
                <View style={styles.completedRow}>
                  <Ionicons
                    name={goal.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={goal.status === 'completed' ? Colors.success : Colors.gray}
                  />
                  <View style={styles.completedInfo}>
                    <Text style={styles.completedName} numberOfLines={1}>{goal.name}</Text>
                    <Text style={styles.completedStatus}>
                      {goal.status === 'completed' ? 'Completed' : goal.status === 'not_completed' ? 'Not Completed' : 'Archived'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.border} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  goalCard: {
    marginBottom: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  goalNameRow: {
    flex: 1,
  },
  goalName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    lineHeight: 24,
  },
  ftBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  ftPct: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
  },
  identityPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  goalMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  ftBarContainer: {
    marginTop: Spacing.sm,
  },
  ftBar: {
    height: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ftBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  weeklyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  measurementIndicator: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  capText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completedToggleText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  completedCard: {
    marginBottom: Spacing.sm,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  completedInfo: {
    flex: 1,
    gap: 2,
  },
  completedName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  completedStatus: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  draftBannerTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  draftBannerSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
});

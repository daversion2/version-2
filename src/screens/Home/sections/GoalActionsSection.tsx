import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { CountdownTimer } from '../../../components/challenge/CountdownTimer';
import { ProgressBar } from '../../../components/challenge/ProgressBar';
import { HomeSectionProps } from './types';
import { Goal, Challenge, Nudge, HabitActionPlan } from '../../../types';
import { ACTION_TYPES } from '../../../constants/challengeLibrary';
import { GOAL_CONSTANTS } from '../../../constants/goals';
import { formatShortDay } from '../../../utils/date';

export const GoalActionsSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const {
    goals,
    activeChallenges,
    extendedChallenges,
    habits,
    weeklyCounts,
    habitStreaks,
    activeProgram,
    todaysProgramDay,
    programDayNumber,
    programCheckedIn,
    goalFollowThrough,
  } = data;
  const challengesUnlocked = data.totalHabitsCompleted >= 3;

  // Planner context lookups
  const plannedTodaySet = useMemo(() => new Set(data.plannedHabitIds), [data.plannedHabitIds]);

  const futureHabitPlanMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!data.weeklyPlans) return map;
    const sortedDates = Object.keys(data.weeklyPlans).sort();
    for (const date of sortedDates) {
      const plan = data.weeklyPlans[date];
      for (const habitId of plan.planned_habit_ids) {
        if (!map.has(habitId)) {
          map.set(habitId, date);
        }
      }
    }
    return map;
  }, [data.weeklyPlans]);

  // Group items by goal
  const allChallenges = [...activeChallenges, ...extendedChallenges];

  // Find habits not linked to any goal
  const linkedHabitIds = new Set(
    goals.flatMap((goal) => habits.filter((h) => h.goal_ids?.includes(goal.id)).map((h) => h.id))
  );
  const unlinkedHabits = habits.filter((h) => !linkedHabitIds.has(h.id));

  // Find challenges not linked to any goal
  const linkedChallengeIds = new Set(
    goals.flatMap((goal) => allChallenges.filter((c) => c.goal_ids?.includes(goal.id)).map((c) => c.id))
  );
  const unlinkedChallenges = challengesUnlocked
    ? allChallenges.filter((c) => !linkedChallengeIds.has(c.id))
    : [];

  const hasUnlinkedItems = unlinkedHabits.length > 0 || unlinkedChallenges.length > 0;

  // Empty state — no goals at all
  if (goals.length === 0) {
    return (
      <>
        {/* Planner access */}
        <PlannerBar callbacks={callbacks} />

        {/* Show existing habits/challenges even without goals */}
        {(habits.length > 0 || (challengesUnlocked && allChallenges.length > 0)) && (
          <View style={styles.goalGroup}>
            <View style={styles.goalHeader}>
              <View style={styles.goalHeaderLeft}>
                <Ionicons name="list" size={20} color={Colors.primary} />
                <Text style={styles.goalName}>Your Activities</Text>
              </View>
              <TouchableOpacity onPress={() => callbacks.onNavigate('ManageHabits')}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {challengesUnlocked && allChallenges.map((challenge) => (
              <ChallengeRow key={challenge.id} challenge={challenge} callbacks={callbacks} />
            ))}
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={weeklyCounts[habit.id] || 0}
                streak={habitStreaks[habit.id]?.currentStreak || 0}
                callbacks={callbacks}
                isDueToday={plannedTodaySet.has(habit.id)}
                plannedForDate={futureHabitPlanMap.get(habit.id)}
              />
            ))}
          </View>
        )}
        <Card style={styles.emptyCard}>
          <Ionicons name="flag-outline" size={40} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Create Your First Goal</Text>
          <Text style={styles.emptyText}>
            Goals organize your challenges, habits, and programs into one clear picture.
          </Text>
          <Button
            title="Get Started"
            onPress={() => callbacks.onNavigate('GoalOnboardingFlow')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Planner access */}
      <PlannerBar callbacks={callbacks} />

      {goals.map((goal) => {
        const goalChallenges = allChallenges.filter(
          (c) => c.goal_ids?.includes(goal.id)
        );
        const goalHabits = habits.filter(
          (h) => h.goal_ids?.includes(goal.id)
        );
        const goalProgram =
          activeProgram?.goal_ids?.includes(goal.id) ? activeProgram : null;

        const ft = goalFollowThrough?.[goal.id];
        const ftLabel = ft
          ? `${ft.currentWeekKept}/${ft.currentWeekCommitments} this week`
          : null;

        return (
          <View key={goal.id} style={styles.goalGroup}>
            {/* Goal Header */}
            <TouchableOpacity
              style={styles.goalHeader}
              onPress={() => callbacks.onGoalTap?.(goal.id)}
              activeOpacity={0.7}
            >
              <View style={styles.goalHeaderLeft}>
                <Ionicons name="flag" size={20} color={Colors.primary} />
                <Text style={styles.goalName} numberOfLines={1}>
                  {goal.name}
                </Text>
              </View>
              <View style={styles.goalHeaderRight}>
                {ftLabel && (
                  <View style={styles.ftBadge}>
                    <Text style={styles.ftText}>{ftLabel}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
              </View>
            </TouchableOpacity>

            {/* Challenges */}
            {challengesUnlocked && goalChallenges.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                callbacks={callbacks}
              />
            ))}

            {/* Habits */}
            {goalHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={weeklyCounts[habit.id] || 0}
                streak={habitStreaks[habit.id]?.currentStreak || 0}
                callbacks={callbacks}
                isDueToday={plannedTodaySet.has(habit.id)}
                plannedForDate={futureHabitPlanMap.get(habit.id)}
              />
            ))}

            {/* Program */}
            {goalProgram && (
              <ProgramRow
                program={goalProgram}
                todaysProgramDay={todaysProgramDay}
                programDayNumber={programDayNumber}
                programCheckedIn={programCheckedIn}
                callbacks={callbacks}
              />
            )}

            {/* No actions yet for this goal */}
            {goalChallenges.length === 0 &&
              goalHabits.length === 0 &&
              !goalProgram && (
                <Card style={styles.noActionsCard}>
                  <Text style={styles.noActionsText}>
                    No actions yet for this goal
                  </Text>
                </Card>
              )}

            {/* Quick add */}
            <View style={styles.addRow}>
              {challengesUnlocked && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => callbacks.onNavigate('StartChallenge')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Challenge</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => callbacks.onNavigate('ManageHabits')}
                activeOpacity={0.7}
              >
                <Ionicons name="repeat-outline" size={16} color={Colors.primary} />
                <Text style={styles.addButtonText}>Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Items not linked to any goal */}
      {hasUnlinkedItems && (
        <View style={styles.goalGroup}>
          <View style={styles.goalHeader}>
            <View style={styles.goalHeaderLeft}>
              <Ionicons name="list" size={20} color={Colors.primary} />
              <Text style={styles.goalName}>Your Activities</Text>
            </View>
          </View>
          {unlinkedChallenges.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              callbacks={callbacks}
            />
          ))}
          {unlinkedHabits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              done={weeklyCounts[habit.id] || 0}
              streak={habitStreaks[habit.id]?.currentStreak || 0}
              callbacks={callbacks}
              isDueToday={plannedTodaySet.has(habit.id)}
              plannedForDate={futureHabitPlanMap.get(habit.id)}
            />
          ))}
          <View style={styles.addRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => callbacks.onNavigate('ManageHabits')}
              activeOpacity={0.7}
            >
              <Ionicons name="add-outline" size={16} color={Colors.primary} />
              <Text style={styles.addButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add another goal (up to max) */}
      {goals.length < GOAL_CONSTANTS.MAX_ACTIVE && (
        <TouchableOpacity
          style={styles.addGoalButton}
          onPress={() => callbacks.onNavigate('GoalOnboardingFlow')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addGoalText}>Add Another Goal</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

// --- Sub-components ---

const PlannerBar: React.FC<{ callbacks: HomeSectionProps['callbacks'] }> = ({ callbacks }) => (
  <TouchableOpacity
    style={styles.plannerBar}
    onPress={() => callbacks.onNavigate('WeeklyPlanner')}
    activeOpacity={0.7}
  >
    <View style={styles.plannerBarLeft}>
      <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
      <Text style={styles.plannerBarText}>Plan Your Week</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
  </TouchableOpacity>
);

const ChallengeRow: React.FC<{
  challenge: Challenge;
  callbacks: HomeSectionProps['callbacks'];
}> = ({ challenge, callbacks }) => {
  const isExtended = challenge.challenge_type === 'extended';
  return (
    <Card
      style={styles.actionCard}
      onPress={() =>
        callbacks.onNavigate(
          isExtended ? 'ExtendedChallengeProgress' : 'CompleteChallenge',
          isExtended ? { challengeId: challenge.id } : { challenge }
        )
      }
    >
      <View style={styles.actionRow}>
        <Ionicons
          name={isExtended ? 'trending-up' : 'flash'}
          size={20}
          color={Colors.secondary}
        />
        <View style={styles.actionInfo}>
          <Text style={styles.actionName} numberOfLines={1}>
            {challenge.name}
          </Text>
          <View style={styles.actionMeta}>
            {challenge.action_type && (
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor:
                      challenge.action_type === 'resist'
                        ? Colors.secondary + '20'
                        : Colors.primary + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    {
                      color:
                        challenge.action_type === 'resist'
                          ? Colors.secondary
                          : Colors.primary,
                    },
                  ]}
                >
                  {ACTION_TYPES[challenge.action_type]?.label}
                </Text>
              </View>
            )}
            {isExtended && (
              <Text style={styles.metaText}>
                {challenge.milestones?.filter((m) => m.completed).length || 0}/
                {challenge.milestones?.length || 0} milestones
              </Text>
            )}
          </View>
        </View>
        {challenge.deadline && !isExtended && (
          <CountdownTimer deadline={challenge.deadline} variant="compact" />
        )}
      </View>
    </Card>
  );
};

const PLAN_LABELS: { key: keyof HabitActionPlan; label: string; icon: string }[] = [
  { key: 'cue', label: 'When & where', icon: 'time-outline' },
  { key: 'environment_change', label: 'Environment tweak', icon: 'home-outline' },
  { key: 'obstacle_plan', label: 'Obstacle plan', icon: 'shield-outline' },
  { key: 'minimum_version', label: 'Minimum version', icon: 'trending-down-outline' },
  { key: 'accountability_person', label: 'Accountability', icon: 'people-outline' },
];

const HabitRow: React.FC<{
  habit: Nudge;
  done: number;
  streak: number;
  callbacks: HomeSectionProps['callbacks'];
  isDueToday?: boolean;
  plannedForDate?: string;
}> = ({ habit, done, streak, callbacks, isDueToday, plannedForDate }) => {
  const [expanded, setExpanded] = useState(false);
  const target = habit.target_count_per_week;
  const isComplete = done >= target;
  const hasPlan = habit.action_plan && PLAN_LABELS.some(({ key }) => !!habit.action_plan![key]);

  return (
    <Card style={styles.actionCard}>
      <TouchableOpacity onPress={() => callbacks.onHabitTap(habit)} activeOpacity={0.7}>
        <View style={styles.actionRow}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : 'radio-button-off'}
            size={20}
            color={isComplete ? Colors.success : Colors.primary}
          />
          <View style={styles.actionInfo}>
            <View style={styles.habitNameRow}>
              <Text style={styles.actionName} numberOfLines={1}>
                {habit.name}
              </Text>
              {streak > 1 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color={Colors.secondary} />
                  <Text style={styles.streakText}>{streak}</Text>
                </View>
              )}
            </View>
            <View style={styles.habitMetaRow}>
              <Text style={styles.metaText}>
                {done}/{target} this week
              </Text>
              {isDueToday && (
                <View style={styles.dueTodayBadge}>
                  <Ionicons name="today" size={11} color={Colors.primary} />
                  <Text style={styles.dueTodayText}>Today</Text>
                </View>
              )}
            </View>
            {!isDueToday && plannedForDate && (
              <Text style={styles.plannedForText}>
                Planned for {formatShortDay(plannedForDate)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => callbacks.onNavigate('HabitDetail', { habitId: habit.id })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="stats-chart" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {hasPlan && (
        <TouchableOpacity
          style={styles.planToggle}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Ionicons name="clipboard-outline" size={14} color={Colors.primary} />
          <Text style={styles.planToggleText}>My Plan</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.primary}
          />
        </TouchableOpacity>
      )}
      {expanded && hasPlan && (
        <View style={styles.planDropdown}>
          {PLAN_LABELS.map(({ key, label, icon }) => {
            const value = habit.action_plan![key];
            if (!value) return null;
            return (
              <View key={key} style={styles.planItem}>
                <Ionicons name={icon as any} size={14} color={Colors.primary} style={{ marginTop: 1 }} />
                <View style={styles.planItemContent}>
                  <Text style={styles.planItemLabel}>{label}</Text>
                  <Text style={styles.planItemValue}>{value}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
};

const ProgramRow: React.FC<{
  program: any;
  todaysProgramDay: any;
  programDayNumber: number;
  programCheckedIn: boolean;
  callbacks: HomeSectionProps['callbacks'];
}> = ({ program, todaysProgramDay, programDayNumber, programCheckedIn, callbacks }) => (
  <Card
    style={styles.actionCard}
    onPress={() => callbacks.onNavigate('ProgramDashboard', { enrollmentId: program.id })}
  >
    <View style={styles.actionRow}>
      <Ionicons name="rocket" size={20} color={Colors.primary} />
      <View style={styles.actionInfo}>
        <Text style={styles.actionName} numberOfLines={1}>
          {program.program_name}
        </Text>
        <Text style={styles.metaText}>
          Day {programDayNumber} of {program.duration_days}
        </Text>
        {todaysProgramDay && (
          <View style={styles.programCheck}>
            <Ionicons
              name={programCheckedIn ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={programCheckedIn ? Colors.success : Colors.gray}
            />
            <Text
              style={[
                styles.programCheckText,
                programCheckedIn && { color: Colors.success },
              ]}
            >
              {programCheckedIn ? 'Checked in' : todaysProgramDay.challenge_name}
            </Text>
          </View>
        )}
      </View>
      <View style={{ width: 60 }}>
        <ProgressBar
          progress={
            program.milestones.filter((m: any) => m.completed).length /
            program.milestones.length
          }
          showPercentage={false}
        />
      </View>
    </View>
  </Card>
);

// --- Styles ---

const styles = StyleSheet.create({
  // Planner bar
  plannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
  },
  plannerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  plannerBarText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.md,
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
    lineHeight: 20,
  },

  // Goal group
  goalGroup: {
    marginTop: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  goalName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  goalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ftBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  ftText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },

  // Action cards
  actionCard: {
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  actionName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },

  // Habit specifics
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  dueTodayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  dueTodayText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: Colors.primary,
  },
  plannedForText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
  },

  // Action plan dropdown
  planToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  planToggleText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    flex: 1,
  },
  planDropdown: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  planItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  planItemContent: {
    flex: 1,
  },
  planItemLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.dark,
    marginBottom: 1,
  },
  planItemValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
  },

  // Program specifics
  programCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  programCheckText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '08',
  },
  addButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },

  // No actions
  noActionsCard: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  noActionsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },

  // Add goal
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  addGoalText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});

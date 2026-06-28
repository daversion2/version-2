import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { HomeSectionProps } from './types';
import { PracticeInstance } from '../../../types';
import { AddActivityMenu } from '../../../components/home/AddActivityMenu';
import { PRACTICE_GROUPS, resolvePracticeGroup, PracticeGroup } from '../../../data/practices';
import {
  PlannerBar,
  ChallengeRow,
  HabitRow,
  ProgramRow,
  AddActivityButton,
} from './GoalActionsSection';

/**
 * Practices-first "Today's Actions" (replaces the goal-grouped GoalActionsSection).
 * Groups the user's practices by group (Activate/Calm/Restrain/Custom), then active
 * challenges, then the active program. Every habit is a practice — curated ones derive
 * their group from the catalog, user-authored ones fall under Custom.
 * Goals are no longer the organizing spine. See docs/home-rework-plan.md
 */
export const TodayActionsSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const {
    activeChallenges,
    extendedChallenges,
    habits,
    weeklyCounts,
    habitStreaks,
    activeProgram,
    todaysProgramDay,
    programDayNumber,
    programCheckedIn,
  } = data;

  // Challenges stay gated behind 3 completions (practice check-offs count, since
  // practices are habits). Kept per product decision.
  const challengesUnlocked = data.totalHabitsCompleted >= 3;
  const remaining = 3 - (data.totalHabitsCompleted ?? 0);

  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const handleAddHabit = () => {
    setAddMenuVisible(false);
    callbacks.onNavigate('ManageHabits');
  };
  const handleAddChallenge = () => {
    setAddMenuVisible(false);
    callbacks.onNavigate('StartChallenge');
  };
  const handleAddProgram = () => {
    setAddMenuVisible(false);
    callbacks.onNavigate('ProgramDiscovery');
  };

  const plannedTodaySet = useMemo(() => new Set(data.plannedHabitIds), [data.plannedHabitIds]);
  const futureHabitPlanMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!data.weeklyPlans) return map;
    for (const date of Object.keys(data.weeklyPlans).sort()) {
      for (const habitId of data.weeklyPlans[date].planned_habit_ids) {
        if (!map.has(habitId)) map.set(habitId, date);
      }
    }
    return map;
  }, [data.weeklyPlans]);

  const allChallenges = [...activeChallenges, ...extendedChallenges];

  // Bucket every practice by its group. Curated practices derive their group from
  // the catalog; user-authored ones resolve to 'custom'.
  const habitsByGroup: Record<PracticeGroup, PracticeInstance[]> = {
    activate: [],
    calm: [],
    restrain: [],
    custom: [],
  };
  habits.forEach((h) => {
    habitsByGroup[resolvePracticeGroup(h)].push(h);
  });

  const renderHabit = (habit: PracticeInstance) => (
    <HabitRow
      key={habit.id}
      habit={habit}
      done={weeklyCounts[habit.id] || 0}
      streak={habitStreaks[habit.id]?.currentStreak || 0}
      callbacks={callbacks}
      isDueToday={plannedTodaySet.has(habit.id)}
      plannedForDate={futureHabitPlanMap.get(habit.id)}
    />
  );

  const isEmpty = habits.length === 0 && allChallenges.length === 0 && !activeProgram;

  return (
    <>
      <PlannerBar callbacks={callbacks} />

      {!challengesUnlocked && remaining > 0 && (
        <View style={styles.unlockTeaser}>
          <Ionicons name="lock-closed" size={14} color={Colors.secondary} />
          <Text style={styles.unlockTeaserText}>
            {remaining} more check-in{remaining !== 1 ? 's' : ''} to unlock Challenges
          </Text>
        </View>
      )}

      {/* Practices, grouped Activate / Calm / Restrain / Custom */}
      {PRACTICE_GROUPS.map((group) => {
        const groupHabits = habitsByGroup[group.id];
        if (groupHabits.length === 0) return null;
        return (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            {groupHabits.map(renderHabit)}
          </View>
        );
      })}

      {/* Active challenges */}
      {challengesUnlocked && allChallenges.length > 0 && (
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupDot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.groupName}>Challenges</Text>
          </View>
          {allChallenges.map((challenge) => (
            <ChallengeRow key={challenge.id} challenge={challenge} callbacks={callbacks} />
          ))}
        </View>
      )}

      {/* Active program */}
      {activeProgram && (
        <ProgramRow
          program={activeProgram}
          todaysProgramDay={todaysProgramDay}
          programDayNumber={programDayNumber}
          programCheckedIn={programCheckedIn}
          callbacks={callbacks}
        />
      )}

      {/* Empty state */}
      {isEmpty && (
        <Card style={styles.emptyCard}>
          <Ionicons name="flame-outline" size={40} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Start your protocol</Text>
          <Text style={styles.emptyText}>
            Head to the Practices tab to add your daily training — then check it off right here.
          </Text>
        </Card>
      )}

      <View style={styles.addRow}>
        <AddActivityButton onPress={() => setAddMenuVisible(true)} />
      </View>

      <AddActivityMenu
        visible={addMenuVisible}
        challengesUnlocked={challengesUnlocked}
        habitsRemaining={remaining}
        onSelectHabit={handleAddHabit}
        onSelectChallenge={handleAddChallenge}
        onSelectProgram={handleAddProgram}
        onClose={() => setAddMenuVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  unlockTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary + '12',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  unlockTeaserText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.secondary },
  emptyCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm },
  emptyTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
  addRow: { marginTop: Spacing.sm },
});

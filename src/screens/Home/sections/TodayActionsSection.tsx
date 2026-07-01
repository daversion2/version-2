import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';
import { AddActivityMenu } from '../../../components/home/AddActivityMenu';
import {
  PlannerBar,
  ChallengeRow,
  ProgramRow,
  AddActivityButton,
} from './GoalActionsSection';

/**
 * "Today's Actions" — challenges, the active program, and the plan-tomorrow bar.
 * Practices now live in their own PracticesSection (the home centerpiece), so
 * they are no longer rendered here. Challenges stay gated behind 3 completions.
 * See the home redesign.
 */
export const TodayActionsSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const {
    activeChallenges,
    extendedChallenges,
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

  const allChallenges = [...activeChallenges, ...extendedChallenges];

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
  addRow: { marginTop: Spacing.sm },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { GroupVolume, PracticeVolume, ChallengeSummary } from '../../services/practiceProgress';

interface TrainingVolumeSectionProps {
  groups: GroupVolume[];
  challenges: ChallengeSummary;
  onPracticePress: (habitId: string) => void;
}

/**
 * The Discipline Map replacement: per-practice training volume for the selected
 * period, as a 2-up card grid grouped Activate / Calm / Restrain. Reps + points
 * lead; logged metric aggregates are secondary. Adopted practices with zero reps
 * render muted ("Untrained") so avoidance stays visible.
 */
export const TrainingVolumeSection: React.FC<TrainingVolumeSectionProps> = ({
  groups,
  challenges,
  onPracticePress,
}) => (
  <View style={styles.section}>
    <Text style={styles.title}>Training Volume</Text>
    <Text style={styles.note}>
      Reps and points always count. Time & temp reflect only the reps where you logged them.
    </Text>

    {groups.length === 0 ? (
      <Text style={styles.empty}>
        Adopt practices from Home to see your training volume here.
      </Text>
    ) : (
      groups.map((group) => (
        <View key={group.group}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupBar, { backgroundColor: group.color }]} />
            <Text style={styles.groupName}>{group.name.toUpperCase()}</Text>
            <Text style={styles.groupSum}>
              {group.reps} reps · {group.points} pts
            </Text>
          </View>
          <View style={styles.grid}>
            {group.practices.map((p) => (
              <PracticeCard key={p.habitId} practice={p} onPress={onPracticePress} />
            ))}
          </View>
        </View>
      ))
    )}

    <View style={styles.challengeStrip}>
      <Ionicons name="trophy" size={20} color={Colors.secondary} />
      <View style={styles.challengeBody}>
        <Text style={styles.challengeTitle}>Challenges</Text>
        <Text style={styles.challengeStats}>
          {challenges.completions} completed · {challenges.points} pts
          {challenges.avgDifficulty != null
            ? ` · avg difficulty ${challenges.avgDifficulty} / 5`
            : ''}
        </Text>
      </View>
    </View>
  </View>
);

const PracticeCard: React.FC<{
  practice: PracticeVolume;
  onPress: (habitId: string) => void;
}> = ({ practice, onPress }) => {
  const untrained = practice.reps === 0;
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderTopColor: practice.color },
        untrained && styles.cardUntrained,
      ]}
      activeOpacity={0.7}
      onPress={() => onPress(practice.habitId)}
    >
      <Ionicons
        name={practice.icon as any}
        size={18}
        color={untrained ? Colors.gray : practice.color}
        style={untrained && styles.mutedIcon}
      />
      <Text style={[styles.cardName, untrained && styles.mutedText]} numberOfLines={2}>
        {practice.name}
      </Text>
      {untrained ? (
        <>
          <Text style={styles.cardRepsUntrained}>0 reps</Text>
          <View style={styles.untrainedBadge}>
            <Text style={styles.untrainedBadgeText}>UNTRAINED</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.cardReps}>
            {practice.reps} {practice.reps === 1 ? 'rep' : 'reps'}
            <Text style={styles.cardPts}> · {practice.points} pts</Text>
          </Text>
          {practice.metricLines.map((line) => (
            <Text key={line} style={styles.cardMetric}>
              {line}
            </Text>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  note: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 16,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  groupBar: {
    width: 4,
    height: 15,
    borderRadius: 2,
  },
  groupName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.2,
    color: Colors.dark,
  },
  groupSum: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: 'auto',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm + 2,
  },
  card: {
    width: '48%',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    borderTopWidth: 4,
    padding: Spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUntrained: {
    backgroundColor: '#EBEBEB',
    borderTopColor: '#C9C9C9',
  },
  mutedIcon: {
    opacity: 0.45,
  },
  mutedText: {
    opacity: 0.45,
  },
  cardName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  cardReps: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginTop: Spacing.sm - 1,
  },
  cardRepsUntrained: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: '#9A9A9A',
    marginTop: Spacing.sm - 1,
  },
  cardPts: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  cardMetric: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 3,
  },
  untrainedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCDCDC',
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: Spacing.sm - 2,
  },
  untrainedBadgeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#8A8F98',
  },
  challengeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 4,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    padding: Spacing.sm + 5,
    marginTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  challengeBody: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  challengeStats: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { HomeSectionProps } from './types';

export const IdentitySummarySection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const { goals, goalFollowThrough, willpowerStats } = data;

  if (goals.length === 0) return null;

  // Pick a rotating identity statement from the user's goals
  const identityStatement = useMemo(() => {
    const statements = goals
      .map((g) => g.identity_statement)
      .filter(Boolean) as string[];
    if (statements.length === 0) return null;
    // Rotate daily
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return statements[dayOfYear % statements.length];
  }, [goals]);

  const streak = willpowerStats?.currentStreak ?? 0;

  return (
    <>
      {/* Identity statement */}
      {identityStatement && (
        <Card style={styles.identityCard}>
          <Text style={styles.identityQuote}>
            {`"${identityStatement}"`}
          </Text>
          <Text style={styles.identityLabel}>You're becoming this person</Text>
        </Card>
      )}

      {/* Per-goal follow-through */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={20} color={Colors.primary} />
          <Text style={styles.title}>Your Follow-Through</Text>
        </View>
        {goals.map((goal) => {
          const ft = goalFollowThrough?.[goal.id];
          if (!ft || ft.totalCommitments === 0) return null;
          const pct = Math.round(ft.followThroughRate * 100);
          return (
            <View key={goal.id} style={styles.goalRow}>
              <Text style={styles.goalName} numberOfLines={1}>
                {goal.name}
              </Text>
              <View style={styles.rateContainer}>
                <Text
                  style={[
                    styles.rateText,
                    pct >= 70 ? styles.rateGood : styles.rateNeutral,
                  ]}
                >
                  {ft.currentWeekKept}/{ft.currentWeekCommitments} this week
                </Text>
                <Text
                  style={[
                    styles.ratePct,
                    pct >= 70 ? styles.rateGood : styles.rateNeutral,
                  ]}
                >
                  {pct}%
                </Text>
              </View>
            </View>
          );
        })}

        {/* Streak reframed */}
        {streak > 0 && (
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={16} color={Colors.secondary} />
            <Text style={styles.streakText}>
              {streak} consecutive day{streak !== 1 ? 's' : ''} of action
            </Text>
          </View>
        )}
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  identityCard: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  identityQuote: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  identityLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  card: {
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  goalName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
    marginRight: Spacing.md,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  ratePct: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
  },
  rateGood: {
    color: Colors.primary,
  },
  rateNeutral: {
    color: Colors.gray,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  streakText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

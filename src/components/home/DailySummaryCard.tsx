import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { DailySummary } from '../../types';

interface DailySummaryCardProps {
  summary: DailySummary;
}

interface ComparisonMessage {
  text: string;
}

function buildComparisonMessages(summary: DailySummary): ComparisonMessage[] {
  const c = summary.comparisons;
  if (!c) return [];
  const messages: ComparisonMessage[] = [];

  if (c.habits_more_vs_last_week) {
    messages.push({ text: `You did ${c.habits_more_vs_last_week} more habit${c.habits_more_vs_last_week === 1 ? '' : 's'} this week than last week` });
  }
  if (c.challenges_more_vs_last_week) {
    messages.push({ text: `You completed ${c.challenges_more_vs_last_week} more challenge${c.challenges_more_vs_last_week === 1 ? '' : 's'} this week than last week` });
  }
  if (c.habits_more_vs_last_month) {
    messages.push({ text: `You've done ${c.habits_more_vs_last_month} more habit${c.habits_more_vs_last_month === 1 ? '' : 's'} this month than last month` });
  }
  if (c.challenges_more_vs_last_month) {
    messages.push({ text: `You've done ${c.challenges_more_vs_last_month} more challenge${c.challenges_more_vs_last_month === 1 ? '' : 's'} this month than last month` });
  }
  if (c.habits_more_vs_yesterday) {
    messages.push({ text: `You did ${c.habits_more_vs_yesterday} more habit${c.habits_more_vs_yesterday === 1 ? '' : 's'} today than yesterday` });
  }
  if (c.challenges_more_vs_yesterday) {
    messages.push({ text: `You completed ${c.challenges_more_vs_yesterday} more challenge${c.challenges_more_vs_yesterday === 1 ? '' : 's'} today than yesterday` });
  }

  return messages;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ summary }) => {
  const isNewFormat = summary.habits_this_week !== undefined;

  if (!isNewFormat) {
    // Graceful fallback for old saved reflections
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Your Day at a Glance</Text>
        <Text style={styles.emptyText}>Summary not available for this reflection.</Text>
      </Card>
    );
  }

  const habitsThisWeek = summary.habits_this_week ?? 0;
  const challengesThisWeek = summary.challenges_this_week ?? 0;
  const totalXp = summary.total_xp ?? 0;
  const totalHabits = summary.total_habits_all_time ?? 0;
  const totalChallenges = summary.total_challenges_all_time ?? 0;
  const comparisons = buildComparisonMessages(summary);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Your Week at a Glance</Text>

      {/* Habits stat row */}
      <View style={styles.statRow}>
        <View style={styles.statIcon}>
          <Ionicons name="repeat" size={20} color={Colors.primary} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statMain}>
            <Text style={styles.statNumber}>{habitsThisWeek}</Text>
            <Text style={styles.statLabel}> habit{habitsThisWeek === 1 ? '' : 's'} this week</Text>
          </Text>
          {totalHabits > 0 && (
            <Text style={styles.statSubtitle}>{totalHabits.toLocaleString()} all time</Text>
          )}
        </View>
      </View>

      {/* Challenges stat row — only show if they've done at least one ever or this week */}
      {(totalChallenges > 0 || challengesThisWeek > 0) && (
        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Ionicons name="flash" size={20} color={Colors.secondary} />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statMain}>
              <Text style={styles.statNumber}>{challengesThisWeek}</Text>
              <Text style={styles.statLabel}> challenge{challengesThisWeek === 1 ? '' : 's'} this week</Text>
            </Text>
            <Text style={styles.statSubtitle}>{totalChallenges.toLocaleString()} all time</Text>
          </View>
        </View>
      )}

      {/* XP row */}
      <View style={styles.statRow}>
        <View style={styles.statIcon}>
          <Ionicons name="star" size={20} color="#F59E0B" />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statMain}>
            <Text style={styles.statNumber}>{totalXp.toLocaleString()}</Text>
            <Text style={styles.statLabel}> XP earned</Text>
          </Text>
        </View>
      </View>

      {/* Positive comparison messages */}
      {comparisons.length > 0 && (
        <View style={styles.comparisonsContainer}>
          {comparisons.map((msg, i) => (
            <View key={i} style={styles.comparisonRow}>
              <Ionicons name="trending-up" size={14} color={Colors.primary} style={styles.comparisonIcon} />
              <Text style={styles.comparisonText}>{msg.text}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: {
    width: 32,
    alignItems: 'center',
  },
  statText: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  statMain: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  statNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  statSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
  comparisonsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.lightGray,
    gap: Spacing.xs,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  comparisonIcon: {
    marginTop: 2,
  },
  comparisonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});

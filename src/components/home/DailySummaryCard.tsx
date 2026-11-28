import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { DailySummary } from '../../types';
import { getTactic } from '../../data/overrideTactics';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import { copyText } from '../../services/appCopy';

/** Picks the `.one` or `.other` wording for a count, as the old inline ternaries did. */
const plural = (key: string, one: string, other: string, n: number): string =>
  copyText(`${key}.${n === 1 ? 'one' : 'other'}`, n === 1 ? one : other, { n });

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
    messages.push({ text: plural('today.summary.habitsWeek', 'You did {n} more habit this week than last week', 'You did {n} more habits this week than last week', c.habits_more_vs_last_week) });
  }
  if (c.challenges_more_vs_last_week) {
    messages.push({ text: plural('today.summary.challengesWeek', 'You completed {n} more challenge this week than last week', 'You completed {n} more challenges this week than last week', c.challenges_more_vs_last_week) });
  }
  if (c.habits_more_vs_last_month) {
    messages.push({ text: plural('today.summary.habitsMonth', "You've done {n} more habit this month than last month", "You've done {n} more habits this month than last month", c.habits_more_vs_last_month) });
  }
  if (c.challenges_more_vs_last_month) {
    messages.push({ text: plural('today.summary.challengesMonth', "You've done {n} more challenge this month than last month", "You've done {n} more challenges this month than last month", c.challenges_more_vs_last_month) });
  }
  if (c.habits_more_vs_yesterday) {
    messages.push({ text: plural('today.summary.habitsDay', 'You did {n} more habit today than yesterday', 'You did {n} more habits today than yesterday', c.habits_more_vs_yesterday) });
  }
  if (c.challenges_more_vs_yesterday) {
    messages.push({ text: plural('today.summary.challengesDay', 'You completed {n} more challenge today than yesterday', 'You completed {n} more challenges today than yesterday', c.challenges_more_vs_yesterday) });
  }

  return messages;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ summary }) => {
  const t = useCopy();
  const isNewFormat = summary.habits_this_week !== undefined;

  if (!isNewFormat) {
    // Graceful fallback for old saved reflections
    return (
      <Card style={styles.card}>
        <Copy id="today.summary.glance" style={styles.title}>{'Your Day at a Glance'}</Copy>
        <Copy id="today.summary.unavailable" style={styles.emptyText}>{'Summary not available for this reflection.'}</Copy>
      </Card>
    );
  }

  const habitsThisWeek = summary.habits_this_week ?? 0;
  const challengesThisWeek = summary.challenges_this_week ?? 0;
  const totalXp = summary.total_xp ?? 0;
  const totalHabits = summary.total_habits_all_time ?? 0;
  const totalChallenges = summary.total_challenges_all_time ?? 0;
  const comparisons = buildComparisonMessages(summary);

  const practicesToday = summary.practices_today ?? 0;
  const overridesToday = summary.overrides_today ?? 0;
  const tacticsToday = (summary.tactics_today ?? [])
    .map((t) => ({ ...t, tactic: getTactic(t.id) }))
    .filter((t) => !!t.tactic);

  const overrideLine =
    overridesToday > 0
      ? plural('today.summary.pushed', 'You pushed through the hard moment {n} time today.', 'You pushed through the hard moment {n} times today.', overridesToday)
      : practicesToday > 0
      ? t('today.summary.showedUp', 'You showed up today — no hard moments logged.')
      : t('today.summary.none', 'No habits logged yet today.');

  return (
    <Card style={styles.card}>
      {/* Today's override recap — the headline */}
      <Copy id="today.summary.today" style={styles.title}>{'Today'}</Copy>
      <Text style={styles.overrideLine}>{overrideLine}</Text>

      <View style={styles.statRow}>
        <View style={styles.statIcon}>
          <Ionicons name="flame" size={20} color={Colors.secondary} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statMain}>
            <Text style={styles.statNumber}>{practicesToday}</Text>
            <Text style={styles.statLabel}> {plural('today.summary.loggedToday', 'habit logged today', 'habits logged today', practicesToday)}</Text>
          </Text>
        </View>
      </View>

      {tacticsToday.length > 0 && (
        <View style={styles.tacticsBlock}>
          <Copy id="today.summary.moves" style={styles.tacticsHeading}>{'Your moves today'}</Copy>
          <View style={styles.tacticsRow}>
            {tacticsToday.map(({ id, count, tactic }) => (
              <View key={id} style={styles.tacticChip}>
                <Ionicons name={tactic!.icon as any} size={13} color={Colors.primary} />
                <Text style={styles.tacticChipText}>
                  {tactic!.label}
                  {count > 1 ? ` ×${count}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.weekDivider} />

      <Copy id="today.summary.thisWeek" style={styles.weekTitle}>{'This week'}</Copy>

      {/* Habits stat row */}
      <View style={styles.statRow}>
        <View style={styles.statIcon}>
          <Ionicons name="repeat" size={20} color={Colors.primary} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statMain}>
            <Text style={styles.statNumber}>{habitsThisWeek}</Text>
            <Text style={styles.statLabel}> {plural('today.summary.habitsThisWeek', 'habit this week', 'habits this week', habitsThisWeek)}</Text>
          </Text>
          {totalHabits > 0 && (
            <Copy id="today.summary.allTime" style={styles.statSubtitle} vars={{ n: totalHabits.toLocaleString() }}>{'{n} all time'}</Copy>
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
              <Text style={styles.statLabel}> {plural('today.summary.challengesThisWeek', 'challenge this week', 'challenges this week', challengesThisWeek)}</Text>
            </Text>
            <Copy id="today.summary.allTimeChallenges" style={styles.statSubtitle} vars={{ n: totalChallenges.toLocaleString() }}>{'{n} all time'}</Copy>
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
            <Text style={styles.statLabel}> {t('today.summary.xpEarned', 'XP earned')}</Text>
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
    marginBottom: Spacing.xs,
  },
  overrideLine: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  tacticsBlock: {
    marginTop: Spacing.xs,
  },
  tacticsHeading: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  tacticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tacticChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tacticChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  weekDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  weekTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

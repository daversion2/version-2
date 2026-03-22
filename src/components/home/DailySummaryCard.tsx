import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { DailySummary } from '../../types';

interface DailySummaryCardProps {
  summary: DailySummary;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ summary }) => {
  const hasCompleted =
    summary.completed_challenges.length > 0 ||
    summary.completed_habits.length > 0 ||
    summary.program_status?.checked_in;

  const hasMissed =
    summary.missed_challenges.length > 0 ||
    summary.missed_habits.length > 0 ||
    (summary.program_status && !summary.program_status.checked_in);

  const hasOptional = summary.optional_habits.length > 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Your Day at a Glance</Text>

      {/* Completed */}
      {hasCompleted && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
            <Text style={styles.sectionTitle}>What you accomplished</Text>
          </View>
          {summary.completed_challenges.map((c, i) => (
            <Text key={`cc-${i}`} style={styles.item}>
              {c.name}{c.difficulty ? ` (difficulty ${c.difficulty})` : ''}
            </Text>
          ))}
          {summary.completed_habits.map((h, i) => (
            <Text key={`ch-${i}`} style={styles.item}>
              {h.name} — {h.done}/{h.target} this week
            </Text>
          ))}
          {summary.program_status?.checked_in && (
            <Text style={styles.item}>
              {summary.program_status.name} — Day {summary.program_status.day_number} checked in
            </Text>
          )}
        </View>
      )}

      {/* Missed */}
      {hasMissed && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle" size={18} color={Colors.secondary} />
            <Text style={[styles.sectionTitle, { color: Colors.secondary }]}>What you missed</Text>
          </View>
          {summary.missed_challenges.map((c, i) => (
            <Text key={`mc-${i}`} style={styles.item}>{c.name}</Text>
          ))}
          {summary.missed_habits.map((h, i) => (
            <Text key={`mh-${i}`} style={styles.item}>
              {h.name} — {h.done}/{h.target} this week (need to catch up)
            </Text>
          ))}
          {summary.program_status && !summary.program_status.checked_in && (
            <Text style={styles.item}>
              {summary.program_status.name} — Day {summary.program_status.day_number} not checked in
            </Text>
          )}
        </View>
      )}

      {/* Optional */}
      {hasOptional && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="ellipsis-horizontal-circle" size={18} color={Colors.gray} />
            <Text style={[styles.sectionTitle, { color: Colors.gray }]}>You could have also...</Text>
          </View>
          {summary.optional_habits.map((h, i) => (
            <Text key={`oh-${i}`} style={[styles.item, { color: Colors.gray }]}>
              {h.name} — {h.remaining} more needed this week
            </Text>
          ))}
        </View>
      )}

      {!hasCompleted && !hasMissed && !hasOptional && (
        <Text style={styles.emptyText}>No activities tracked for today.</Text>
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
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#2E7D32',
  },
  item: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    paddingLeft: Spacing.lg + 2,
    paddingVertical: 2,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});

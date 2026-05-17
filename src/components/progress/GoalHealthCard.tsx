import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Goal, GoalFollowThrough } from '../../types';

interface GoalHealthCardProps {
  goal: Goal;
  followThrough: GoalFollowThrough | null;
  linkedCount: number;
  linkedDoneThisWeek: number;
  onPress: () => void;
}

function daysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate + 'T00:00:00');
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

function followThroughColor(rate: number): string {
  if (rate >= 0.7) return '#34C759';
  if (rate >= 0.4) return '#FF9500';
  return '#FF3B30';
}

export const GoalHealthCard: React.FC<GoalHealthCardProps> = ({
  goal,
  followThrough,
  linkedCount,
  linkedDoneThisWeek,
  onPress,
}) => {
  const rate = followThrough?.followThroughRate ?? 0;
  const days = daysRemaining(goal.end_date);
  const barColor = followThroughColor(rate);
  const pct = Math.round(rate * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
        <View style={[styles.daysPill, days <= 7 && styles.daysPillUrgent]}>
          <Text style={[styles.daysText, days <= 7 && styles.daysTextUrgent]}>
            {days}d left
          </Text>
        </View>
      </View>

      {/* Follow-through bar */}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.pctLabel, { color: barColor }]}>{pct}%</Text>
      </View>
      <Text style={styles.barCaption}>Follow-through rate</Text>

      {/* Linked activity this week */}
      {linkedCount > 0 && (
        <View style={styles.linkedRow}>
          <Ionicons name="link-outline" size={13} color={Colors.gray} />
          <Text style={styles.linkedText}>
            {linkedDoneThisWeek}/{linkedCount} linked activities done this week
          </Text>
        </View>
      )}

      {/* Confidence baseline */}
      {goal.confidence_baseline != null && (
        <View style={styles.linkedRow}>
          <Ionicons name="sparkles-outline" size={13} color={Colors.gray} />
          <Text style={styles.linkedText}>
            Started at {goal.confidence_baseline}/10 confidence
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={Colors.border} style={styles.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  daysPill: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  daysPillUrgent: {
    backgroundColor: '#FFF3E0',
  },
  daysText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  daysTextUrgent: {
    color: '#FF9500',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  pctLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    width: 36,
    textAlign: 'right',
  },
  barCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkedText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
  },
});

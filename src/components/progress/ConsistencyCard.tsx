import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';

interface ConsistencyCardProps {
  activeDays: number;
  totalDays: 7;
  avgDaysToRecover: number;
  totalGaps: number;
  thisWeek: number;
  lastWeek: number;
}

export const ConsistencyCard: React.FC<ConsistencyCardProps> = ({
  activeDays,
  totalDays,
  avgDaysToRecover,
  totalGaps,
  thisWeek,
  lastWeek,
}) => {
  const pct = Math.round((activeDays / totalDays) * 100);
  const weekDelta = thisWeek - lastWeek;

  const recoveryLabel =
    totalGaps === 0
      ? 'None — clean!'
      : `${avgDaysToRecover}d avg`;

  const weekDeltaLabel =
    weekDelta === 0
      ? 'Same as last'
      : weekDelta > 0
      ? `+${weekDelta} vs last`
      : `${weekDelta} vs last`;

  const weekDeltaColor =
    weekDelta > 0 ? '#34C759' : weekDelta < 0 ? '#FF3B30' : Colors.gray;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Consistency</Text>
      <View style={styles.row}>
        {/* 7-day active rate */}
        <View style={styles.stat}>
          <Text style={styles.bigNumber}>{pct}%</Text>
          <Text style={styles.label}>{activeDays}/7 days active</Text>
        </View>

        <View style={styles.divider} />

        {/* Recovery speed */}
        <View style={styles.stat}>
          <Text style={[styles.bigNumber, styles.smallNumber]}>{recoveryLabel}</Text>
          <Text style={styles.label}>Recovery speed</Text>
        </View>

        <View style={styles.divider} />

        {/* Week comparison */}
        <View style={styles.stat}>
          <Text style={[styles.bigNumber, styles.smallNumber, { color: weekDeltaColor }]}>
            {weekDeltaLabel}
          </Text>
          <Text style={styles.label}>{thisWeek} this week</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  bigNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    marginBottom: 2,
  },
  smallNumber: {
    fontSize: FontSizes.md,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
});

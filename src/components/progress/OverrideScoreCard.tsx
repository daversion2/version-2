import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface OverrideScoreCardProps {
  score: number;
  lastWeekScore: number;
}

/**
 * The headline proof metric: how many times the user overrode the stop signal
 * this week. Every practice rep and completed challenge counts as one override.
 * Always weekly (independent of the time filter).
 */
export const OverrideScoreCard: React.FC<OverrideScoreCardProps> = ({
  score,
  lastWeekScore,
}) => {
  const delta = score - lastWeekScore;
  const deltaIcon = delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'remove';
  const deltaText =
    delta > 0
      ? `${delta} more than last week`
      : delta < 0
        ? `${-delta} fewer than last week`
        : 'Even with last week';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>OVERRIDE SCORE</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.value}>{score}</Text>
        <Text style={styles.unit}>overrides this week</Text>
      </View>
      <View style={styles.deltaPill}>
        <Ionicons name={deltaIcon} size={13} color="#FFD9C2" />
        <Text style={styles.deltaText}>{deltaText}</Text>
      </View>
      <Text style={styles.sub}>
        Every practice rep and challenge completed counts as one override.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md + 4,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs - 1,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.75)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm + 2,
    marginTop: Spacing.xs,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: 44,
    lineHeight: 48,
    color: Colors.white,
  },
  unit: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: Spacing.sm,
  },
  deltaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: '#FFD9C2',
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
});

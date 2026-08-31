import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ResistanceOverview } from '../../services/practicePerformance';
import { RESISTANCE_MAX } from '../../constants/resistance';

interface Props {
  overview: ResistanceOverview;
}

const BAR_MAX_HEIGHT = 72;

/**
 * The Progress screen's headline: how hard your habits have been to START,
 * week over week.
 *
 * Deliberately the top card. Streaks measure attendance; this measures change —
 * "cold showers were an 8, they're a 3 now" is the claim the whole product is
 * built to make. A FALLING line is the win, which is why the framing and the
 * colour both invert relative to a normal "up and to the right" chart.
 */
export const ResistanceCurveCard: React.FC<Props> = ({ overview }) => {
  const { weekly, recentAvg, firstAvg, change, rated } = overview;

  // Not enough rated check-ins to say anything honest yet.
  if (recentAvg === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Your resistance</Text>
        <Text style={styles.empty}>
          Log a few more check-ins and this will show whether your habits are
          getting easier to start.
        </Text>
      </View>
    );
  }

  const falling = change !== null && change < 0;
  const meaningful = change !== null && Math.abs(change) >= 1;
  const accent = falling ? Colors.primary : Colors.secondary;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Your resistance</Text>

      <View style={styles.headlineRow}>
        <Text style={styles.big}>{recentAvg}</Text>
        <Text style={styles.outOf}>/ {RESISTANCE_MAX}</Text>
        {meaningful && (
          <View style={[styles.pill, { backgroundColor: accent + '1A' }]}>
            <Ionicons
              name={falling ? 'arrow-down' : 'arrow-up'}
              size={12}
              color={accent}
            />
            <Text style={[styles.pillText, { color: accent }]}>
              {Math.abs(change!)} from {firstAvg}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.caption}>
        {meaningful
          ? falling
            ? 'Your habits are getting easier to start.'
            : 'Starting has been getting harder lately.'
          : 'How hard your habits have been to start.'}
      </Text>

      {/* Bars, oldest → newest. A week with no rated check-in renders as a
          hollow track rather than a zero, so a gap never reads as progress. */}
      <View style={styles.chart}>
        {weekly.map((value, i) => (
          <View key={i} style={styles.barSlot}>
            <View style={styles.barTrack}>
              {value !== null && (
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(4, (value / RESISTANCE_MAX) * BAR_MAX_HEIGHT),
                      backgroundColor: accent,
                    },
                  ]}
                />
              )}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>8 weeks ago</Text>
        <Text style={styles.axisText}>This week</Text>
      </View>

      <Text style={styles.footnote}>
        Based on {rated} rated check-in{rated === 1 ? '' : 's'}.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  headlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  big: {
    fontFamily: Fonts.primaryBold,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.dark,
  },
  outOf: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
    marginLeft: Spacing.xs,
  },
  pillText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs },
  caption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    height: BAR_MAX_HEIGHT,
    marginTop: Spacing.lg,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: {
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: Colors.border + '55',
    borderRadius: BorderRadius.sm,
  },
  bar: { width: '100%', borderRadius: BorderRadius.sm },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  axisText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  footnote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});

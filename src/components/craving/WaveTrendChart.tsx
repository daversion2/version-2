import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  /** Starting intensities (1–10) of this craving type's sessions, oldest first, including the one just logged. */
  intensities: number[];
  /** e.g. "junk food" — lowercased type label for the summary line. */
  typeLabel: string;
}

/**
 * The personal extinction curve: how tall this craving type's waves have been
 * at the start of each ride. Watching the peaks shrink IS the feature working,
 * and progress feedback is itself a reward signal — so it gets shown at the
 * moment of a win.
 */
export const WaveTrendChart: React.FC<Props> = ({ intensities, typeLabel }) => {
  // Cap the display at the last 10 rides so bars stay readable.
  const shown = intensities.slice(-10);
  const recent = shown.slice(-3);
  const earlier = shown.slice(0, -3);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recentAvg = Math.round(avg(recent) * 10) / 10;

  let summary: string;
  if (earlier.length > 0 && avg(earlier) > avg(recent)) {
    const earlierAvg = Math.round(avg(earlier) * 10) / 10;
    summary = `These waves used to peak around ${earlierAvg}/10 — your last three averaged ${recentAvg}/10. That's extinction learning, visibly working.`;
  } else {
    summary = `Averaging ${recentAvg}/10 over your last three. Every ridden wave teaches your brain the cue leads nowhere — this chart is where that shows up.`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your {typeLabel} waves</Text>
      <View style={styles.barsRow}>
        {shown.map((intensity, i) => (
          <View key={i} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                { height: 8 + (intensity / 10) * 52 },
                i === shown.length - 1 && styles.barCurrent,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>earlier</Text>
        <Text style={styles.axisLabel}>this ride</Text>
      </View>
      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 60,
  },
  barSlot: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  bar: {
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  barCurrent: { backgroundColor: Colors.primary },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  axisLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
  },
  summary: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});

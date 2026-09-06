import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { Adherence, describeAdherence } from '../../services/habitAdherence';

interface Props {
  recent: Adherence;
  lifetime: Adherence;
  /** How the habit is scheduled, e.g. "Mon, Wed & Fri" — what "days asked for" means here. */
  scheduleLabel: string;
  accentColor?: string;
  /** Days the recent window covers, for the caption. */
  windowDays: number;
}

/**
 * "Of the days this habit asked for, how many did I keep?"
 *
 * Every other number on this screen answers HOW MUCH — total reps, records,
 * trends. None answered how RELIABLY, which is the only thing a weekly target
 * is a promise about. Two windows, because they answer different questions: the
 * recent rate says whether it's working now, the lifetime rate says whether it
 * ever did.
 */
export const AdherenceCard: React.FC<Props> = ({
  recent,
  lifetime,
  scheduleLabel,
  accentColor = Colors.primary,
  windowDays,
}) => {
  // A brand-new habit has nothing due yet. A card reading "0%" would be a
  // verdict on a habit that hasn't been asked for anything.
  if (recent.rate === null) {
    return (
      <Card style={styles.card}>
        <Text style={styles.label}>Adherence</Text>
        <Text style={styles.empty}>
          {scheduleLabel} — check back once this has had a few days to be due.
        </Text>
      </Card>
    );
  }

  const weeks = Math.round(windowDays / 7);

  return (
    <Card style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.label}>Adherence</Text>
        <Text style={styles.schedule}>{scheduleLabel}</Text>
      </View>

      <View style={styles.rateRow}>
        <Text style={[styles.rate, { color: accentColor }]}>{recent.rate}%</Text>
        <View style={styles.rateMeta}>
          <Text style={styles.window}>Last {weeks} weeks</Text>
          <Text style={styles.detail}>
            {recent.kept} of {recent.due} {recent.due === 1 ? 'day' : 'days'} kept
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${recent.rate}%`, backgroundColor: accentColor }]}
        />
      </View>

      <Text style={styles.verdict}>{describeAdherence(recent.rate)}</Text>

      {/* Only worth showing once the two windows can actually disagree. */}
      {lifetime.rate !== null && lifetime.days > recent.days && (
        <Text style={styles.lifetime}>
          All time: {lifetime.rate}% · {lifetime.kept} of {lifetime.due} days
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schedule: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  rateRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  rate: { fontFamily: Fonts.primaryBold, fontSize: 40, lineHeight: 44 },
  rateMeta: { flex: 1 },
  window: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  detail: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  track: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: BorderRadius.full },
  verdict: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  lifetime: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { SkipPatterns } from '../../services/skipLogic';
import { getSkipReason } from '../../data/skipReasons';

interface Props {
  patterns: SkipPatterns;
  /** Narrows the copy when shown on a single habit's page. */
  habitName?: string;
}

/**
 * Why you skip — the reason mix and the internal/external split.
 *
 * The split is the headline because it's the actionable part: misses you
 * generated need a different response than misses the week imposed on you.
 * Deliberately non-judgemental in tone — this card is shown to someone looking
 * at their own failures, and a scolding card is one people stop opening.
 */
export const SkipPatternsCard: React.FC<Props> = ({ patterns, habitName }) => {
  const { totalMissed, reasons, internalPct, externalPct } = patterns;

  if (totalMissed === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Why you skip</Text>
        <Text style={styles.empty}>
          {habitName
            ? `Nothing logged yet for ${habitName}. When a week falls short, you’ll be asked what got in the way.`
            : 'When a week falls short, you’ll be asked what got in the way. Your patterns will show up here.'}
        </Text>
      </View>
    );
  }

  const top = reasons[0];
  const topReason = getSkipReason(top.reasonId);
  const hasSplit = internalPct !== null && externalPct !== null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Why you skip</Text>

      <Text style={styles.headline}>
        {topReason ? `Most often: ${topReason.label.toLowerCase()}` : 'Your reasons'}
      </Text>
      <Text style={styles.sub}>
        {totalMissed} missed {totalMissed === 1 ? 'rep' : 'reps'}
        {habitName ? ` on ${habitName}` : ' across your habits'}.
      </Text>

      {/* Internal vs external — the distinction the whole taxonomy exists for. */}
      {hasSplit && (
        <View style={styles.splitBlock}>
          <View style={styles.splitBar}>
            <View style={[styles.splitFill, { flex: Math.max(internalPct!, 1) }]} />
            <View style={[styles.splitRest, { flex: Math.max(externalPct!, 1) }]} />
          </View>
          <View style={styles.splitLegend}>
            <Text style={styles.splitText}>
              <Text style={styles.splitStrong}>{internalPct}%</Text> was you
            </Text>
            <Text style={styles.splitText}>
              <Text style={styles.splitStrong}>{externalPct}%</Text> was the day
            </Text>
          </View>
        </View>
      )}

      <View style={styles.reasonList}>
        {reasons.map((r) => {
          const reason = getSkipReason(r.reasonId);
          return (
            <View key={r.reasonId} style={styles.reasonRow}>
              <Ionicons
                name={(reason?.icon ?? 'ellipse-outline') as any}
                size={15}
                color={r.kind === 'internal' ? Colors.primary : Colors.gray}
              />
              <Text style={styles.reasonLabel}>{r.label}</Text>
              <Text style={styles.reasonCount}>{r.pct}%</Text>
            </View>
          );
        })}
      </View>
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
  headline: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  splitBlock: { marginTop: Spacing.lg },
  splitBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  splitFill: { backgroundColor: Colors.primary },
  splitRest: { backgroundColor: Colors.border },
  splitLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  splitText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  splitStrong: { fontFamily: Fonts.primaryBold, color: Colors.dark },
  reasonList: { marginTop: Spacing.lg, gap: Spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reasonLabel: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  reasonCount: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});

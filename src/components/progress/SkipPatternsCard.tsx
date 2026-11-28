import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { SkipPatterns } from '../../services/skipLogic';
import { getSkipReason } from '../../data/skipReasons';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';

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
  const t = useCopy();

  if (totalMissed === 0) {
    return (
      <View style={styles.card}>
        <Copy id="progress.skip.label" style={styles.label}>
          Why you skip
        </Copy>
        <Text style={styles.empty}>
          {habitName
            ? t(
                'progress.skip.emptyHabit',
                'Nothing logged yet for {habit}. When a week falls short, you’ll be asked what got in the way.',
                { habit: habitName }
              )
            : t(
                'progress.skip.empty',
                'When a week falls short, you’ll be asked what got in the way. Your patterns will show up here.'
              )}
        </Text>
      </View>
    );
  }

  const top = reasons[0];
  const topReason = getSkipReason(top.reasonId);
  const hasSplit = internalPct !== null && externalPct !== null;

  return (
    <View style={styles.card}>
      <Copy id="progress.skip.label" style={styles.label}>
        Why you skip
      </Copy>

      <Text style={styles.headline}>
        {topReason
          ? t('progress.skip.mostOften', 'Most often: {reason}', { reason: topReason.label.toLowerCase() })
          : t('progress.skip.yourReasons', 'Your reasons')}
      </Text>
      <Copy
        id={totalMissed === 1 ? 'progress.skip.sub.one' : 'progress.skip.sub.other'}
        style={styles.sub}
        vars={{
          n: totalMissed,
          where: habitName
            ? t('progress.skip.onHabit', ' on {habit}', { habit: habitName })
            : t('progress.skip.acrossHabits', ' across your habits'),
        }}
      >
        {totalMissed === 1 ? '{n} missed check-in{where}.' : '{n} missed check-ins{where}.'}
      </Copy>

      {/* Internal vs external — the distinction the whole taxonomy exists for. */}
      {hasSplit && (
        <View style={styles.splitBlock}>
          <View style={styles.splitBar}>
            <View style={[styles.splitFill, { flex: Math.max(internalPct!, 1) }]} />
            <View style={[styles.splitRest, { flex: Math.max(externalPct!, 1) }]} />
          </View>
          <View style={styles.splitLegend}>
            <Copy
              id="progress.skip.split.internal"
              style={styles.splitText}
              boldStyle={styles.splitStrong}
              vars={{ pct: internalPct! }}
            >
              {'**{pct}%** was you'}
            </Copy>
            <Copy
              id="progress.skip.split.external"
              style={styles.splitText}
              boldStyle={styles.splitStrong}
              vars={{ pct: externalPct! }}
            >
              {'**{pct}%** was the day'}
            </Copy>
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

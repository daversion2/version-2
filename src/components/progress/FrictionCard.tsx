import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  FrictionOverview,
  MIN_RATED_FOR_FRICTION,
  growthLabel,
  frictionSentence,
} from '../../services/frictionCapacity';
import { Copy } from '../common/Copy';

interface Props {
  overview: FrictionOverview;
}

const CHART_HEIGHT = 80;
const DOT = 9;

/**
 * The Progress headline: how much friction the user is handling.
 *
 * Teal bars are friction faced (each check-in at its habit's starting
 * difficulty) and climb as they carry more or harder habits. Orange dots are
 * friction felt (the ratings they tapped). The gap between them is the
 * strength gained. Logic in services/frictionCapacity.ts.
 */
export const FrictionCard: React.FC<Props> = ({ overview }) => {
  const { windows, faced, rated } = overview;

  if (rated < MIN_RATED_FOR_FRICTION) {
    return (
      <View style={styles.card}>
        <Copy id="progress.friction.label" style={styles.label}>
          Friction you can handle
        </Copy>
        <Copy id="progress.friction.empty" style={styles.empty}>
          {"Log a few habits and this will show how much friction you're handling, and how much easier it's getting."}
        </Copy>
      </View>
    );
  }

  const growth = growthLabel(overview);
  const max = Math.max(1, ...windows.map((w) => Math.max(w.faced, w.felt)));
  const toHeight = (v: number) => (v / max) * CHART_HEIGHT;

  return (
    <View style={styles.card}>
      <Copy id="progress.friction.label" style={styles.label}>
        Friction you can handle
      </Copy>

      <View style={styles.headlineRow}>
        <Text style={styles.big}>{faced}</Text>
        <Copy id="progress.friction.caption" style={styles.bigCaption}>
          friction faced in the last 7 days
        </Copy>
      </View>

      {growth && (
        <View style={styles.pill}>
          <Ionicons name="arrow-up" size={12} color={Colors.primary} />
          <Text style={styles.pillText}>{growth}</Text>
        </View>
      )}

      {/* One column per 7-day window, oldest → newest. A window with nothing
          logged keeps its empty track, so a gap never reads as a zero. */}
      <View style={styles.chart}>
        {windows.map((w) => (
          <View key={w.end} style={styles.slot}>
            <View style={styles.track}>
              {w.faced > 0 && <View style={[styles.bar, { height: Math.max(4, toHeight(w.faced)) }]} />}
              {w.felt > 0 && (
                <View
                  style={[styles.dot, { bottom: Math.max(0, toHeight(w.felt) - DOT / 2) }]}
                />
              )}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        <Copy id="progress.friction.axis.start" style={styles.axisText}>
          8 weeks ago
        </Copy>
        <Copy id="progress.friction.axis.end" style={styles.axisText}>
          Last 7 days
        </Copy>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.swatchBar} />
          <Copy id="progress.friction.legend.faced" style={styles.legendText}>
            Friction faced
          </Copy>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.swatchDot} />
          <Copy id="progress.friction.legend.felt" style={styles.legendText}>
            Friction felt
          </Copy>
        </View>
      </View>

      <Text style={styles.sentence}>{frictionSentence(overview)}</Text>

      {rated === 1 ? (
        <Copy id="progress.friction.footnote.one" style={styles.footnote} vars={{ count: rated }}>
          {'Based on {count} rated check-in. Not affected by the time filter.'}
        </Copy>
      ) : (
        <Copy id="progress.friction.footnote.other" style={styles.footnote} vars={{ count: rated }}>
          {'Based on {count} rated check-ins. Not affected by the time filter.'}
        </Copy>
      )}
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
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  headlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, flexWrap: 'wrap' },
  big: {
    fontFamily: Fonts.primaryBold,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.dark,
  },
  bigCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: 7,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '1A',
    marginTop: Spacing.xs,
  },
  pillText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.primary },
  chart: {
    flexDirection: 'row',
    gap: Spacing.xs,
    height: CHART_HEIGHT,
    marginTop: Spacing.lg,
  },
  slot: { flex: 1, height: '100%' },
  track: {
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: Colors.border + '55',
    borderRadius: BorderRadius.sm,
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.primary,
    opacity: 0.85,
    borderRadius: BorderRadius.sm,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  axisText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatchBar: { width: 12, height: 12, borderRadius: 3, backgroundColor: Colors.primary },
  swatchDot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: Colors.secondary },
  legendText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  sentence: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginTop: Spacing.md,
  },
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

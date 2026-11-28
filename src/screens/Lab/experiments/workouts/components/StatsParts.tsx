import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { ExerciseKind, WeightUnit } from '../../../../../types/workouts';
import {
  describeTrend,
  formatTrendPoint,
  lowerIsBetter,
  StatsRange,
  StatTotals,
  TrendPoint,
  VolumeBar,
} from '../../../../../services/workoutStats';
import {
  formatCount,
  formatSeconds,
  formatVolume,
  formatWeight,
} from '../../../../../services/workoutMath';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { copyText } from '../../../../../services/appCopy';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

const RANGES: { value: StatsRange; label: string; key: string }[] = [
  { value: 'week', label: 'Week', key: 'workouts.statsParts.week' },
  { value: 'month', label: 'Month', key: 'workouts.statsParts.month' },
  { value: 'year', label: 'Year', key: 'workouts.statsParts.year' },
  { value: 'all', label: 'All', key: 'workouts.statsParts.all' },
];

export const RANGE_PHRASE: Record<StatsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'all time',
};

const RANGE_PHRASE_KEYS: Record<StatsRange, string> = {
  week: 'workouts.statsParts.phraseWeek',
  month: 'workouts.statsParts.phraseMonth',
  year: 'workouts.statsParts.phraseYear',
  all: 'workouts.statsParts.phraseAll',
};

/** RANGE_PHRASE, with the admin's wording if there is any. Call at render time. */
export const rangePhrase = (r: StatsRange): string => copyText(RANGE_PHRASE_KEYS[r], RANGE_PHRASE[r]);

export const RangePicker: React.FC<{ value: StatsRange; onChange: (r: StatsRange) => void }> = ({
  value,
  onChange,
}) => {
  const t = useCopy();
  return (
  <View style={styles.segment}>
    {RANGES.map((r) => (
      <TouchableOpacity
        key={r.value}
        style={[styles.segmentItem, value === r.value && styles.segmentOn]}
        onPress={() => onChange(r.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === r.value }}
      >
        <Text style={[styles.segmentText, value === r.value && styles.segmentTextOn]}>
          {t(r.key, r.label)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
  );
};

/** Volume, sets, reps, heaviest — and time held when there were holds. */
export const StatTiles: React.FC<{ totals: StatTotals; unit: WeightUnit }> = ({ totals, unit }) => {
  const t = useCopy();
  const tiles = [
    { label: t('workouts.statsParts.volume', 'Volume'), value: totals.volumeKg > 0 ? formatVolume(totals.volumeKg, unit) : '—' },
    { label: t('workouts.statsParts.sets', 'Sets'), value: formatCount(totals.sets) },
    { label: t('workouts.statsParts.reps', 'Reps'), value: formatCount(totals.reps) },
    {
      label: t('workouts.statsParts.heaviest', 'Heaviest'),
      value: totals.heaviestKg > 0 ? formatWeight(totals.heaviestKg, unit) : '—',
    },
  ];
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile}>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {tile.value}
            </Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>
      {(totals.secondsHeld > 0 || totals.sessions > 0) && (
        <Text style={ws.muted}>
          {totals.sessions === 1
            ? t('workouts.statsParts.oneWorkout', '{n} workout', { n: totals.sessions })
            : t('workouts.statsParts.nWorkouts', '{n} workouts', { n: totals.sessions })}
          {totals.secondsHeld > 0
            ? t('workouts.statsParts.held', ' · {time} held', { time: formatSeconds(totals.secondsHeld) })
            : ''}
        </Text>
      )}
    </View>
  );
};

const CHART_HEIGHT = 132;

/**
 * One series, so one colour and no legend — the title names it. The bar for
 * the period you're in is the full accent; the rest are a lighter step of the
 * same hue. Tap a bar to read it; the peak is labelled without tapping.
 */
export const VolumeChart: React.FC<{
  bars: VolumeBar[];
  unit: WeightUnit;
  /** Volume normally; sets for exercises with no weight to add up. */
  metric: 'volume' | 'sets';
}> = ({ bars, unit, metric }) => {
  const t = useCopy();
  const valueOf = (b: VolumeBar) => (metric === 'volume' ? b.volumeKg : b.sets);
  const fmt = (n: number) =>
    metric === 'volume' ? formatVolume(n, unit) : t('workouts.statsParts.nSets', '{n} sets', { n: formatCount(n) });
  const currentIndex = Math.max(0, bars.findIndex((b) => b.current));
  const [selected, setSelected] = useState(currentIndex);
  useEffect(() => setSelected(currentIndex), [currentIndex, bars.length]);

  const max = Math.max(0, ...bars.map(valueOf));
  const every = bars.length > 12 ? 4 : bars.length > 8 ? 3 : 1;
  const sel = bars[selected];

  return (
    <View style={[ws.card, styles.chartCard]}>
      <View style={styles.chartHead}>
        <Text style={ws.title}>
          {metric === 'volume' ? t('workouts.statsParts.volume', 'Volume') : t('workouts.statsParts.sets', 'Sets')}
        </Text>
        {sel && (
          <Text style={styles.readout}>
            {sel.label} · {fmt(valueOf(sel))}
            {metric === 'volume' && sel.sets > 0
              ? t('workouts.statsParts.andSets', ' · {n} sets', { n: sel.sets })
              : ''}
          </Text>
        )}
      </View>

      {max === 0 ? (
        <View style={[styles.plot, styles.emptyPlot]}>
          <Copy id="workouts.statsParts.nothing" style={ws.muted}>
            Nothing logged in this stretch yet.
          </Copy>
        </View>
      ) : (
        <View style={styles.plot}>
          <Text style={styles.peakLabel}>{fmt(max)}</Text>
          <View style={styles.baseline} />
          <View style={styles.bars}>
            {bars.map((b, i) => {
              const v = valueOf(b);
              const h = max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * (CHART_HEIGHT - 18)) : 0;
              const active = i === selected;
              return (
                <TouchableOpacity
                  key={b.key}
                  style={styles.barSlot}
                  onPress={() => setSelected(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${b.label}: ${fmt(v)}`}
                  hitSlop={{ top: 8, bottom: 8 }}
                >
                  <View
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: b.current ? WORKOUTS_ACCENT : WORKOUTS_ACCENT + '66' },
                      active && styles.barActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.axis}>
        {bars.map((b, i) => (
          <Text key={b.key} style={[styles.axisLabel, i === selected && styles.axisLabelOn]} numberOfLines={1}>
            {i % every === 0 || i === bars.length - 1 ? b.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
};

const DOT = 10;
const FLOOR_ROOM = 16;

/**
 * The best set of each recent session, one dot per session, oldest on the
 * left. Higher is always better — a run's time is drawn flipped, so a faster
 * mile sits higher — and the axis says the real numbers. No zero line: what
 * matters is 60 → 70 kg, which bars from zero would flatten.
 */
export const TrendChart: React.FC<{
  points: TrendPoint[];
  kind: ExerciseKind;
  unit: WeightUnit;
  /** Sessions where this exercise was done as a swap for another (2026-11-20): drawn hollow. */
  swappedIds?: ReadonlySet<string>;
}> = ({ points, kind, unit, swappedIds }) => {
  const t = useCopy();
  const last = points.length - 1;
  const [selected, setSelected] = useState(last);
  useEffect(() => setSelected(last), [last]);

  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const flip = lowerIsBetter(kind);
  const best = flip ? lo : hi;
  const worst = flip ? hi : lo;
  const plotH = CHART_HEIGHT - 18;
  const heightOf = (v: number) => {
    const frac = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return (flip ? 1 - frac : frac) * (plotH - DOT);
  };
  const fmt = (v: number) => formatTrendPoint({ sessionId: '', finishedAt: '', value: v }, kind, unit);
  const dateOf = (p: TrendPoint) =>
    new Date(p.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const summary = describeTrend(points, kind, unit);
  const every = points.length > 8 ? 3 : points.length > 5 ? 2 : 1;
  const sel = points[selected];

  return (
    <View style={[ws.card, styles.chartCard]}>
      <View style={styles.chartHead}>
        <Copy id="workouts.statsParts.bestSet" style={ws.title}>
          Best set
        </Copy>
        {sel && (
          <Text style={styles.readout}>
            {dateOf(sel)} · {formatTrendPoint(sel, kind, unit)}
            {swappedIds?.has(sel.sessionId) ? t('workouts.statsParts.asSwap', ' · as a swap') : ''}
          </Text>
        )}
      </View>
      {summary && <Text style={styles.trendSummary}>{summary}</Text>}

      <View style={[styles.plot, styles.trendPlot]}>
        <Text style={styles.peakLabel}>{fmt(best)}</Text>
        {hi !== lo && <Text style={[styles.peakLabel, styles.floorLabel]}>{fmt(worst)}</Text>}
        <View style={[styles.dots, { height: plotH }]}>
          {points.map((p, i) => (
            <TouchableOpacity
              key={p.sessionId}
              style={styles.barSlot}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={`${dateOf(p)}: ${formatTrendPoint(p, kind, unit)}${swappedIds?.has(p.sessionId) ? ', done as a swap' : ''}`}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <View
                style={[
                  styles.dot,
                  { bottom: heightOf(p.value) },
                  i === last && styles.dotLatest,
                  swappedIds?.has(p.sessionId) && styles.dotSwapped,
                  i === selected && styles.dotSelected,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.axis}>
        {points.map((p, i) => (
          <Text key={p.sessionId} style={[styles.axisLabel, i === selected && styles.axisLabelOn]} numberOfLines={1}>
            {(last - i) % every === 0 ? dateOf(p) : ''}
          </Text>
        ))}
      </View>
      {points.some((p) => swappedIds?.has(p.sessionId)) && (
        <View style={styles.swapLegend}>
          <View style={[styles.dot, styles.dotSwapped, styles.legendDot]} />
          <Copy id="workouts.statsParts.swapLegend" style={ws.muted}>
            Done as a swap for another exercise
          </Copy>
        </View>
      )}
    </View>
  );
};

/** A body part or exercise in a ranked list, with its share of the top one's volume. */
export const BreakdownRow: React.FC<{
  title: string;
  totals: StatTotals;
  unit: WeightUnit;
  maxVolumeKg: number;
  onPress: () => void;
}> = ({ title, totals, unit, maxVolumeKg, onPress }) => {
  const t = useCopy();
  const share = maxVolumeKg > 0 ? totals.volumeKg / maxVolumeKg : 0;
  const parts = [
    totals.volumeKg > 0 ? formatVolume(totals.volumeKg, unit) : null,
    totals.sets === 1
      ? t('workouts.statsParts.oneSet', '{n} set', { n: formatCount(totals.sets) })
      : t('workouts.statsParts.nSets', '{n} sets', { n: formatCount(totals.sets) }),
    totals.reps > 0 ? t('workouts.statsParts.nReps', '{n} reps', { n: formatCount(totals.reps) }) : null,
    totals.secondsHeld > 0
      ? t('workouts.statsParts.timeHeld', '{time} held', { time: formatSeconds(totals.secondsHeld) })
      : null,
  ].filter(Boolean);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ws.title}>{title}</Text>
        <Text style={ws.muted}>{parts.join(' · ')}</Text>
        {maxVolumeKg > 0 && (
          <View style={styles.shareTrack}>
            <View style={[styles.shareFill, { width: `${Math.max(share > 0 ? 2 : 0, share * 100)}%` }]} />
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );
};

/** Moved to services/workoutMath.ts so it's tested; re-exported for the screens. */
export { recordLines } from '../../../../../services/workoutMath';

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: BorderRadius.full },
  segmentOn: { backgroundColor: WORKOUTS_TINT },
  segmentText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  segmentTextOn: { color: WORKOUTS_ACCENT },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tileValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, fontVariant: ['tabular-nums'] },
  tileLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2 },

  chartCard: { gap: Spacing.sm },
  chartHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
  readout: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, fontVariant: ['tabular-nums'] },
  plot: { height: CHART_HEIGHT, justifyContent: 'flex-end' },
  emptyPlot: { alignItems: 'center', justifyContent: 'center' },
  peakLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
  },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: Colors.border },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_HEIGHT - 18 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barActive: { borderWidth: 2, borderColor: Colors.dark, borderBottomWidth: 0 },
  axis: { flexDirection: 'row', gap: 2 },
  trendSummary: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  // The plot gets room below the dots for the worst value's label, as it has above for the best.
  trendPlot: { height: CHART_HEIGHT + FLOOR_ROOM },
  floorLabel: { top: undefined, bottom: 0 },
  dots: { flexDirection: 'row', gap: 2, marginBottom: FLOOR_ROOM },
  dot: {
    position: 'absolute',
    left: '50%',
    marginLeft: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: WORKOUTS_ACCENT + '66',
  },
  dotLatest: { backgroundColor: WORKOUTS_ACCENT },
  dotSwapped: { backgroundColor: Colors.white, borderWidth: 2, borderColor: WORKOUTS_ACCENT },
  swapLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  legendDot: { position: 'relative', left: 0, marginLeft: 0 },
  dotSelected: { borderWidth: 2, borderColor: Colors.dark },
  axisLabel: { flex: 1, textAlign: 'center', fontFamily: Fonts.secondary, fontSize: 9, color: Colors.gray },
  axisLabelOn: { fontFamily: Fonts.secondaryBold, color: Colors.dark },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.lightGray, overflow: 'hidden' },
  shareFill: { height: '100%', borderRadius: 2, backgroundColor: WORKOUTS_ACCENT + '99' },
});

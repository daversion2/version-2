import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { ExerciseRecord, WeightUnit } from '../../../../../types/workouts';
import { StatsRange, StatTotals, VolumeBar } from '../../../../../services/workoutStats';
import {
  formatCount,
  formatSeconds,
  formatVolume,
  formatWeight,
} from '../../../../../services/workoutMath';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

const RANGES: { value: StatsRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

export const RANGE_PHRASE: Record<StatsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'all time',
};

export const RangePicker: React.FC<{ value: StatsRange; onChange: (r: StatsRange) => void }> = ({
  value,
  onChange,
}) => (
  <View style={styles.segment}>
    {RANGES.map((r) => (
      <TouchableOpacity
        key={r.value}
        style={[styles.segmentItem, value === r.value && styles.segmentOn]}
        onPress={() => onChange(r.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === r.value }}
      >
        <Text style={[styles.segmentText, value === r.value && styles.segmentTextOn]}>{r.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

/** Volume, sets, reps, heaviest — and time held when there were holds. */
export const StatTiles: React.FC<{ totals: StatTotals; unit: WeightUnit }> = ({ totals, unit }) => {
  const tiles = [
    { label: 'Volume', value: totals.volumeKg > 0 ? formatVolume(totals.volumeKg, unit) : '—' },
    { label: 'Sets', value: formatCount(totals.sets) },
    { label: 'Reps', value: formatCount(totals.reps) },
    { label: 'Heaviest', value: totals.heaviestKg > 0 ? formatWeight(totals.heaviestKg, unit) : '—' },
  ];
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.tiles}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {t.value}
            </Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      {(totals.secondsHeld > 0 || totals.sessions > 0) && (
        <Text style={ws.muted}>
          {totals.sessions} {totals.sessions === 1 ? 'workout' : 'workouts'}
          {totals.secondsHeld > 0 ? ` · ${formatSeconds(totals.secondsHeld)} held` : ''}
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
  const valueOf = (b: VolumeBar) => (metric === 'volume' ? b.volumeKg : b.sets);
  const fmt = (n: number) => (metric === 'volume' ? formatVolume(n, unit) : `${formatCount(n)} sets`);
  const currentIndex = Math.max(0, bars.findIndex((b) => b.current));
  const [selected, setSelected] = useState(currentIndex);
  useEffect(() => setSelected(currentIndex), [currentIndex, bars.length]);

  const max = Math.max(0, ...bars.map(valueOf));
  const every = bars.length > 12 ? 4 : bars.length > 8 ? 3 : 1;
  const sel = bars[selected];

  return (
    <View style={[ws.card, styles.chartCard]}>
      <View style={styles.chartHead}>
        <Text style={ws.title}>{metric === 'volume' ? 'Volume' : 'Sets'}</Text>
        {sel && (
          <Text style={styles.readout}>
            {sel.label} · {fmt(valueOf(sel))}
            {metric === 'volume' && sel.sets > 0 ? ` · ${sel.sets} sets` : ''}
          </Text>
        )}
      </View>

      {max === 0 ? (
        <View style={[styles.plot, styles.emptyPlot]}>
          <Text style={ws.muted}>Nothing logged in this stretch yet.</Text>
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

/** A body part or exercise in a ranked list, with its share of the top one's volume. */
export const BreakdownRow: React.FC<{
  title: string;
  totals: StatTotals;
  unit: WeightUnit;
  maxVolumeKg: number;
  onPress: () => void;
}> = ({ title, totals, unit, maxVolumeKg, onPress }) => {
  const share = maxVolumeKg > 0 ? totals.volumeKg / maxVolumeKg : 0;
  const parts = [
    totals.volumeKg > 0 ? formatVolume(totals.volumeKg, unit) : null,
    `${formatCount(totals.sets)} ${totals.sets === 1 ? 'set' : 'sets'}`,
    totals.reps > 0 ? `${formatCount(totals.reps)} reps` : null,
    totals.secondsHeld > 0 ? `${formatSeconds(totals.secondsHeld)} held` : null,
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

/** "Heaviest 145 lb", "Most reps 25", "Longest hold 1:30". */
export const recordLines = (r: ExerciseRecord | undefined, unit: WeightUnit): string[] => {
  if (!r) return [];
  const lines: string[] = [];
  if (r.heaviestKg) lines.push(`Heaviest ${formatWeight(r.heaviestKg, unit)}`);
  if (r.maxReps) lines.push(`Most reps ${r.maxReps}`);
  if (r.longestSec) lines.push(`Longest hold ${formatSeconds(r.longestSec)}`);
  return lines;
};

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

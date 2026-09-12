import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { CompletionLog } from '../../types';
import {
  RadarDay,
  WeekMetric,
  buildWeekRadar,
  formatRadarValue,
  radiusFactor,
} from '../../services/weeklyRadar';
import {
  getWeekStart,
  getWeekEnd,
  formatWeekRange,
  toLocalDateString,
} from '../../utils/date';

// Geometry. Everything is drawn with plain Views — rings are bordered circles,
// the outline is a set of rotated 1px rectangles — because the app has no SVG
// dependency and adding one (react-native-svg) is a native module, which would
// cost an App Store build to ship. This renders over the air.
const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER = 103;
/** Grid rings as fractions of OUTER. Quarters — a scale, not five named stops. */
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];
const LABEL_RADIUS = 122;
const DOT = 12;
const TODAY_DOT = 16;

const METRICS: { key: WeekMetric; label: string }[] = [
  { key: 'habits', label: 'Habits' },
  { key: 'xp', label: 'XP' },
];

/** Angle for a spoke, starting at the top and running clockwise. */
const angleFor = (i: number, count: number) =>
  -Math.PI / 2 + (i * 2 * Math.PI) / count;

const pointAt = (i: number, count: number, factor: number) => ({
  x: CX + Math.cos(angleFor(i, count)) * OUTER * factor,
  y: CY + Math.sin(angleFor(i, count)) * OUTER * factor,
});

/** A plain grid ring. */
const Ring: React.FC<{ radius: number }> = ({ radius }) => (
  <View
    pointerEvents="none"
    style={[
      styles.ring,
      {
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        left: CX - radius,
        top: CY - radius,
      },
    ]}
  />
);

/**
 * The reference ring — your average day — drawn as individual tangent dashes.
 *
 * `borderStyle: 'dashed'` is silently ignored on iOS as soon as borderRadius is
 * non-zero, so a dashed circle drawn with a border renders solid — and this ring
 * is the one element on the chart that MUST read differently from the others.
 * Placing the dashes by hand is the only way to guarantee it.
 */
const DashedRing: React.FC<{ radius: number }> = ({ radius }) => {
  // Keep dash density roughly constant regardless of radius.
  const count = Math.max(24, Math.round((2 * Math.PI * radius) / 9));
  const DASH = 5;
  const THICK = 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i * 2 * Math.PI) / count;
        return (
          <View
            key={`avg-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: CX + Math.cos(a) * radius - DASH / 2,
              top: CY + Math.sin(a) * radius - THICK / 2,
              width: DASH,
              height: THICK,
              backgroundColor: Colors.gray,
              // Tangent to the circle at this point.
              transform: [{ rotate: `${a + Math.PI / 2}rad` }],
            }}
          />
        );
      })}
    </>
  );
};

/** A straight segment between two points, drawn as a rotated rectangle. */
const Segment: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  thickness?: number;
  opacity?: number;
}> = ({ from, to, color, thickness = 2, opacity = 1 }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return null;
  const angle = Math.atan2(dy, dx);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        opacity,
        borderRadius: thickness / 2,
        // Rotate about the segment's start so the two endpoints stay put.
        transform: [
          { translateX: -length / 2 },
          { rotate: `${angle}rad` },
          { translateX: length / 2 },
        ],
      }}
    />
  );
};

interface Props {
  /**
   * Every completion log in the selected window. The card slices out the
   * current week itself — the smallest window on Progress (7d) always covers
   * the elapsed part of it, so this needs no fetch of its own.
   */
  logs: CompletionLog[];
}

/**
 * Your week as one shape — habits done per day, or the XP they were worth.
 *
 * Each day is a spoke and the radius is that day's value against the week's
 * BEST day, so the outline always fills the chart. That is a relative scale, and
 * it means the shape alone can't tell you whether this was a big week — the
 * footer carries the absolute numbers, and the dashed ring marks your average
 * day, so there is always something real to read the shape against.
 *
 * This used to plot the nightly reflection's comfort-zone grade. That framing
 * (the fixed five stops, the edge ring, "past your comfort zone") went with the
 * data; the reflection grade still has the Grade line and distribution charts
 * further down the screen.
 */
export const WeeklyRadarCard: React.FC<Props> = ({ logs }) => {
  const [metric, setMetric] = useState<WeekMetric>('habits');
  const today = toLocalDateString(new Date());

  const radar = useMemo(
    () => buildWeekRadar(logs, metric, today),
    [logs, metric, today]
  );

  const weekLabel = formatWeekRange(
    toLocalDateString(getWeekStart(new Date())),
    toLocalDateString(getWeekEnd(new Date()))
  );

  const plotted = radar.days
    .map((day, i) => ({ day, i }))
    .filter(({ day }) => !day.isFuture);

  // Outline segments only between CONSECUTIVE elapsed days. A zero day is on the
  // line (at the centre) because zero is a real value; the line stops at today
  // rather than running out through days that have not happened.
  const segments: { from: RadarDay; to: RadarDay; fromI: number; toI: number }[] = [];
  for (let i = 0; i < plotted.length - 1; i++) {
    const a = plotted[i];
    const b = plotted[i + 1];
    if (b.i === a.i + 1) {
      segments.push({ from: a.day, to: b.day, fromI: a.i, toI: b.i });
    }
  }

  const metricToggle = (
    <View style={styles.toggle}>
      {METRICS.map((m) => {
        const on = metric === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            style={[styles.toggleBtn, on && styles.toggleBtnOn]}
            onPress={() => setMetric(m.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{m.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (radar.max === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.title}>Your week</Text>
          <Text style={styles.week}>{weekLabel}</Text>
        </View>
        {metricToggle}
        <Text style={styles.empty}>
          {metric === 'habits'
            ? 'Complete a habit and your week starts taking shape here.'
            : 'Log a habit and the XP it earned shows up here.'}
        </Text>
      </Card>
    );
  }

  const averageFactor = radiusFactor(radar.average, radar.max);

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Your week</Text>
        <Text style={styles.week}>{weekLabel}</Text>
      </View>

      {metricToggle}

      <View style={styles.figureWrap}>
        <View style={styles.figure}>
          {/* Grid rings first, then the average ring on top of them. */}
          {RING_FRACTIONS.map((f) => (
            <Ring key={f} radius={OUTER * f} />
          ))}
          {averageFactor > 0.02 && <DashedRing radius={OUTER * averageFactor} />}

          {/* Spokes */}
          {radar.days.map((d, i) => (
            <Segment
              key={`spoke-${d.date}`}
              from={{ x: CX, y: CY }}
              to={pointAt(i, radar.days.length, 1)}
              color={Colors.border}
              thickness={1}
            />
          ))}

          {/* The week's outline */}
          {segments.map((s) => (
            <Segment
              key={`seg-${s.from.date}`}
              from={pointAt(s.fromI, radar.days.length, radiusFactor(s.from.value, radar.max))}
              to={pointAt(s.toI, radar.days.length, radiusFactor(s.to.value, radar.max))}
              color={Colors.primary}
              thickness={2}
              opacity={0.55}
            />
          ))}

          {/* Day markers */}
          {plotted.map(({ day, i }) => {
            const p = pointAt(i, radar.days.length, radiusFactor(day.value, radar.max));
            const size = day.isToday ? TODAY_DOT : DOT;
            return (
              <View
                key={`dot-${day.date}`}
                pointerEvents="none"
                style={[
                  styles.dot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: p.x - size / 2,
                    top: p.y - size / 2,
                    // The best day of the week is called out; a day with nothing
                    // on it is drawn hollow, so "did nothing" and "did least"
                    // don't look like the same dot at the centre.
                    backgroundColor:
                      day.value === 0
                        ? Colors.white
                        : day.value === radar.max
                        ? Colors.secondary
                        : Colors.primary,
                    borderColor: day.value === 0 ? Colors.border : Colors.white,
                    borderWidth: day.isToday ? 3 : 2,
                  },
                ]}
              />
            );
          })}

          {/* Day labels */}
          {radar.days.map((d, i) => {
            const a = angleFor(i, radar.days.length);
            return (
              <Text
                key={`label-${d.date}`}
                style={[
                  styles.dayLabel,
                  {
                    left: CX + Math.cos(a) * LABEL_RADIUS - 18,
                    top: CY + Math.sin(a) * LABEL_RADIUS - 8,
                  },
                  d.isFuture && styles.dayLabelEmpty,
                  d.isToday && styles.dayLabelToday,
                ]}
              >
                {d.label}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        {/* Hand-drawn to match the ring exactly — see DashedRing. */}
        <View style={styles.legendDashRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.legendDash} />
          ))}
        </View>
        <Text style={styles.legendText}>
          Your average day this week · {formatRadarValue(radar.average, metric)}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {radar.aboveAverage} of {radar.elapsed}
          </Text>
          <Text style={styles.statCap}>days above your average</Text>
        </View>
        {radar.best && (
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.secondary }]}>
              {radar.best.label} · {formatRadarValue(radar.best.value, metric)}
            </Text>
            <Text style={styles.statCap}>best day</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  week: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  toggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  toggleBtnOn: { backgroundColor: Colors.white },
  toggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  toggleTextOn: { color: Colors.primary },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  figureWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  figure: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: {
    position: 'absolute',
  },
  dayLabel: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  dayLabelEmpty: {
    fontFamily: Fonts.secondary,
    color: Colors.border,
  },
  dayLabelToday: {
    color: Colors.dark,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  legendDashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 29,
  },
  legendDash: {
    width: 5,
    height: 2,
    backgroundColor: Colors.gray,
  },
  legendText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  stat: { flex: 1 },
  statNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  statCap: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
});

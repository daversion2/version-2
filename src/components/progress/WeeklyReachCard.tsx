import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { DailyReflection, ReflectionGrade } from '../../types';
import { REACH_STOPS, EDGE_STOP_INDEX, reachIndexOf } from '../../data/comfortZone';
import {
  getWeekDates,
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
const RADII = [22, 40, 60, 81, 103];
const LABEL_RADIUS = 122;
const DOT = 12;
const TODAY_DOT = 16;

// Mon-first, matching getWeekDates() and the rest of the app's week handling.
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayPoint {
  label: string;
  date: string;
  /** Index into REACH_STOPS, or null when nothing was logged that day. */
  reach: number | null;
  isToday: boolean;
  isFuture: boolean;
}

/** Angle for a spoke, starting at the top and running clockwise. */
const angleFor = (i: number, count: number) =>
  -Math.PI / 2 + (i * 2 * Math.PI) / count;

const pointFor = (i: number, count: number, reach: number) => ({
  x: CX + Math.cos(angleFor(i, count)) * RADII[reach],
  y: CY + Math.sin(angleFor(i, count)) * RADII[reach],
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
        borderWidth: 1,
        borderColor: Colors.border,
      },
    ]}
  />
);

/**
 * The comfort zone boundary, drawn as individual tangent dashes.
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
            key={`edge-${i}`}
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
  /** Every reflection available; this card slices out the current week itself. */
  reflections: DailyReflection[];
}

/**
 * "How far you got" — the week plotted as distance from the comfort zone.
 *
 * Each day is a spoke, the radius is how far past the edge that day went, and
 * the dashed ring is the threshold itself. A single night's answer isn't
 * interesting; the shape of a week is — which is why this lives on Progress
 * rather than on the reflection screen, where it would have cost 260pt of
 * height on a form people fill in tired.
 *
 * Days with no reflection are deliberately NOT plotted at the centre. Zero is a
 * real answer here ("stayed comfortable"), so collapsing an unanswered day to
 * the middle would draw the worst possible result and make every user's week
 * look worse than it was. Unlogged days break the outline instead.
 */
export const WeeklyReachCard: React.FC<Props> = ({ reflections }) => {
  const today = toLocalDateString(new Date());

  const days: DayPoint[] = useMemo(() => {
    const weekDates = getWeekDates(new Date());
    const byDate = new Map<string, ReflectionGrade>();
    reflections.forEach((r) => {
      if (r.grade) byDate.set(r.date, r.grade);
    });

    return weekDates.map((date, i) => {
      const grade = byDate.get(date);
      const idx = grade ? reachIndexOf(grade) : -1;
      return {
        label: DAY_LABELS[i],
        date,
        reach: idx >= 0 ? idx : null,
        isToday: date === today,
        isFuture: date > today,
      };
    });
  }, [reflections, today]);

  const answered = days.filter((d) => d.reach !== null);
  const pastEdge = answered.filter((d) => (d.reach as number) > EDGE_STOP_INDEX);
  const furthest = answered.reduce<DayPoint | null>(
    (best, d) => (!best || (d.reach as number) > (best.reach as number) ? d : best),
    null
  );

  const weekLabel = formatWeekRange(
    toLocalDateString(getWeekStart(new Date())),
    toLocalDateString(getWeekEnd(new Date()))
  );

  // Outline segments only between CONSECUTIVE answered days. A gap in the week
  // is a gap in the line, not a shortcut across it — connecting Monday straight
  // to Friday would invent a trend through days that were never logged.
  const segments: { from: DayPoint; to: DayPoint; fromI: number; toI: number }[] = [];
  for (let i = 0; i < days.length - 1; i++) {
    if (days[i].reach !== null && days[i + 1].reach !== null) {
      segments.push({ from: days[i], to: days[i + 1], fromI: i, toI: i + 1 });
    }
  }

  if (answered.length === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.title}>How far you got</Text>
          <Text style={styles.week}>{weekLabel}</Text>
        </View>
        <Text style={styles.empty}>
          Reflect at the end of a day and your week starts taking shape here.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>How far you got</Text>
        <Text style={styles.week}>{weekLabel}</Text>
      </View>

      <View style={styles.figureWrap}>
        <View style={styles.figure}>
          {/* Grid rings first, then the edge ring on top of them. */}
          {RADII.map((r, i) =>
            i === EDGE_STOP_INDEX ? null : <Ring key={r} radius={r} />
          )}
          <DashedRing radius={RADII[EDGE_STOP_INDEX]} />

          {/* Spokes */}
          {days.map((d, i) => (
            <Segment
              key={`spoke-${d.date}`}
              from={{ x: CX, y: CY }}
              to={{
                x: CX + Math.cos(angleFor(i, days.length)) * RADII[RADII.length - 1],
                y: CY + Math.sin(angleFor(i, days.length)) * RADII[RADII.length - 1],
              }}
              color={Colors.border}
              thickness={1}
            />
          ))}

          {/* The week's outline */}
          {segments.map((s) => (
            <Segment
              key={`seg-${s.from.date}`}
              from={pointFor(s.fromI, days.length, s.from.reach as number)}
              to={pointFor(s.toI, days.length, s.to.reach as number)}
              color={Colors.primary}
              thickness={2}
              opacity={0.55}
            />
          ))}

          {/* Day markers */}
          {days.map((d, i) => {
            if (d.reach === null) return null;
            const p = pointFor(i, days.length, d.reach);
            const size = d.isToday ? TODAY_DOT : DOT;
            return (
              <View
                key={`dot-${d.date}`}
                pointerEvents="none"
                style={[
                  styles.dot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: p.x - size / 2,
                    top: p.y - size / 2,
                    backgroundColor: REACH_STOPS[d.reach].color,
                    borderWidth: d.isToday ? 3 : 2,
                  },
                ]}
              />
            );
          })}

          {/* Day labels */}
          {days.map((d, i) => {
            const a = angleFor(i, days.length);
            return (
              <Text
                key={`label-${d.date}`}
                style={[
                  styles.dayLabel,
                  {
                    left: CX + Math.cos(a) * LABEL_RADIUS - 18,
                    top: CY + Math.sin(a) * LABEL_RADIUS - 8,
                  },
                  d.reach === null && styles.dayLabelEmpty,
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
          Outside this line is past your comfort zone
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {pastEdge.length} of {answered.length}
          </Text>
          <Text style={styles.statCap}>days past the edge</Text>
        </View>
        {furthest && (
          <View style={styles.stat}>
            <Text
              style={[
                styles.statNum,
                { color: REACH_STOPS[furthest.reach as number].color },
              ]}
            >
              {furthest.label}
            </Text>
            <Text style={styles.statCap}>furthest out</Text>
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
  },
  dot: {
    position: 'absolute',
    borderColor: Colors.white,
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

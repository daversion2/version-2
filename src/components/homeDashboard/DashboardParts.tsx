import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { formatShortDay } from '../../utils/date';
import type { WeekGrid as WeekGridData, MealsDayState, Serving } from '../../services/homeDashboard';
import type { TodayAppId } from '../../services/appCheckins';
import { groupLabel } from '../../data/mealGroups';

export const TINT = Colors.primary + '1A';

export const APP_ICONS: Record<TodayAppId, string> = {
  meditate: 'flower-outline',
  workouts: 'barbell-outline',
  meals: 'nutrition-outline',
};

// --- Ring ----------------------------------------------------------------------

/**
 * A progress ring from plain Views (no SVG in the binary): two half-ring
 * borders, each clipped to one half of the circle and rotated into view.
 */
export const Ring: React.FC<{ pct: number; size?: number; stroke?: number; label: string }> = ({
  pct,
  size = 62,
  stroke = 7,
  label,
}) => {
  const deg = Math.max(0, Math.min(1, pct)) * 360;
  const half = size / 2;
  const arc = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderColor: 'transparent',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.primary,
  };
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={label}>
      {/* The track: a full grey ring. Its own style, not `arc` — `arc`'s
          top/right colours would override borderColor and paint a teal half. */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: Colors.border,
        }}
      />
      <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
        <View style={[arc, { left: -half, transform: [{ rotate: `${-135 + Math.min(deg, 180)}deg` }] }]} />
      </View>
      <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={[arc, { transform: [{ rotate: `${45 + Math.max(0, deg - 180)}deg` }] }]} />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
      </View>
    </View>
  );
};

// --- Small text pieces ---------------------------------------------------------

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

export const Chip: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

export const StartButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.start} onPress={onPress} accessibilityRole="button">
    <Text style={styles.startText}>{label}</Text>
  </TouchableOpacity>
);

export const ListRow: React.FC<{ cells: string[] }> = ({ cells }) => (
  <View style={styles.listRow}>
    {cells.map((c, i) => (
      <Text key={i} style={[styles.listCell, i > 0 && styles.listCellMuted]} numberOfLines={1}>
        {c}
      </Text>
    ))}
  </View>
);

// --- Dot trend -----------------------------------------------------------------

const TREND_H = 56;
const DOT = 9;

/** One dot per session, oldest left; the newest is filled. */
export const DotTrend: React.FC<{ values: number[]; label: string; empty: string }> = ({ values, label, empty }) => {
  if (values.length === 0) return <Text style={styles.muted}>{empty}</Text>;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const y = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (TREND_H - DOT);
  return (
    <View accessible accessibilityLabel={label}>
      <View style={styles.trend}>
        <View style={styles.trendBase} />
        {values.map((v, i) => (
          <View key={i} style={styles.trendSlot}>
            <View style={[styles.trendDot, { bottom: y(v) }, i === values.length - 1 && styles.trendDotLast]} />
          </View>
        ))}
      </View>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
};

// --- Week at a glance ----------------------------------------------------------

const CELL = 32;

export const WeekGrid: React.FC<{ grid: WeekGridData }> = ({ grid }) => {
  const last = grid.dates.length - 1;
  return (
    <View>
      <View style={styles.gridRow}>
        <View style={styles.gridIcon} />
        {grid.dates.map((d, i) => (
          <Text key={d} style={[styles.gridDay, i === last && styles.gridDayToday]}>
            {formatShortDay(d).slice(0, 1)}
          </Text>
        ))}
      </View>
      {(Object.keys(APP_ICONS) as TodayAppId[]).map((appId) => (
        <View key={appId} style={styles.gridRow}>
          <View style={styles.gridIcon}>
            <Ionicons name={APP_ICONS[appId] as never} size={16} color={Colors.primary} />
          </View>
          {grid.rows[appId].map((on, i) => (
            <View
              key={grid.dates[i]}
              style={[styles.cell, on ? styles.cellOn : styles.cellOff, i === last && styles.cellToday]}
              accessible
              accessibilityLabel={`${appId} ${formatShortDay(grid.dates[i])}: ${on ? 'done' : 'not done'}`}
            />
          ))}
        </View>
      ))}
      <Text style={styles.caption}>Filled = you showed up that day · ringed = today</Text>
    </View>
  );
};

// --- Meals ---------------------------------------------------------------------

/** One cell per whole-food group, darker with more servings. */
export const ServingsHeatmap: React.FC<{ servings: Serving[] }> = ({ servings }) => {
  const max = Math.max(1, ...servings.map((s) => s.count));
  return (
    <View>
      <View style={styles.heat}>
        {servings.map((s) => (
          <View key={s.group} style={styles.heatItem}>
            <View
              style={[
                styles.heatCell,
                { backgroundColor: Colors.primary, opacity: s.count === 0 ? 1 : 0.15 + 0.85 * (s.count / max) },
                s.count === 0 && styles.heatEmpty,
              ]}
            />
            <Text style={styles.heatLabel} numberOfLines={1}>
              {groupLabel(s.group)}
            </Text>
            <Text style={styles.heatCount}>{s.count}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Servings in the last 7 days · one plate with the chip = one serving</Text>
    </View>
  );
};

const DAY_STYLE: Record<MealsDayState, object> = {
  on: { backgroundColor: Colors.primary },
  off: { backgroundColor: Colors.secondary },
  pending: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  empty: { borderWidth: 1.5, borderColor: Colors.border },
};

const DAY_WORD: Record<MealsDayState, string> = {
  on: 'on target',
  off: 'missed',
  pending: 'still open',
  empty: 'nothing logged',
};

/** One dot per day, its average score under it. */
export const DayDots: React.FC<{
  days: { date: string; state: MealsDayState; score: number | null }[];
  threshold: number;
}> = ({ days, threshold }) => (
  <View>
    <View style={styles.dayRow}>
      {days.map((d) => (
        <View
          key={d.date}
          style={styles.dayItem}
          accessible
          accessibilityLabel={`${formatShortDay(d.date)}: ${DAY_WORD[d.state]}${d.score === null ? '' : `, score ${d.score}`}`}
        >
          <View style={[styles.dayDot, DAY_STYLE[d.state]]} />
          <Text style={styles.dayScore}>{d.score ?? '–'}</Text>
          <Text style={styles.gridDay}>{formatShortDay(d.date).slice(0, 1)}</Text>
        </View>
      ))}
    </View>
    <View style={styles.legend}>
      {(['on', 'off', 'empty'] as MealsDayState[]).map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={[styles.legendDot, DAY_STYLE[s]]} />
          <Text style={styles.caption}>
            {DAY_WORD[s][0].toUpperCase() + DAY_WORD[s].slice(1)}
            {s === 'on' ? ` (${threshold}+)` : ''}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.dark },

  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chip: {
    backgroundColor: TINT,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary },
  start: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  listCell: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  listCellMuted: { color: Colors.gray, textAlign: 'right' },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  caption: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 6 },

  trend: { height: TREND_H, flexDirection: 'row' },
  trendBase: { position: 'absolute', left: 0, right: 0, bottom: DOT / 2, height: 1, backgroundColor: Colors.border },
  trendSlot: { flex: 1, alignItems: 'center' },
  trendDot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  trendDotLast: { backgroundColor: Colors.primary },

  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  gridIcon: { width: 24, alignItems: 'center' },
  gridDay: { width: CELL, textAlign: 'center', fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray },
  gridDayToday: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  cell: { width: CELL, height: CELL, borderRadius: 8 },
  cellOn: { backgroundColor: Colors.primary },
  cellOff: { borderWidth: 1.5, borderColor: Colors.border },
  cellToday: { borderWidth: 2, borderColor: Colors.secondary },

  heat: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm },
  heatItem: { width: '20%', alignItems: 'center', gap: 2 },
  heatCell: { width: 40, height: 40, borderRadius: 8 },
  heatEmpty: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  heatLabel: { fontFamily: Fonts.secondary, fontSize: 10, color: Colors.gray },
  heatCount: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.dark },

  dayRow: { flexDirection: 'row', gap: 6 },
  dayItem: { alignItems: 'center', gap: 3 },
  dayScore: { width: CELL, textAlign: 'center', fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.dark },
  dayDot: { width: CELL - 10, height: CELL - 10, borderRadius: (CELL - 10) / 2, marginHorizontal: 5 },
  legend: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwipeViews } from '../common/SwipeViews';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { ProgressRing } from '../common/ProgressRing';
import { WEEK_VIEWS, WeekApp, weekTotal } from '../../services/weekViews';
import { Copy } from '../common/Copy';

// =============================================================================
// THE WEEK CARD at the top of Today (2026-11-22): three ways to show the week
// (a ring per app, bars, a week grid), swiped between, with dots below. The
// last one seen is remembered on this phone (components/common/SwipeViews).
// Logic: services/weekViews.ts.
// =============================================================================

const STORE_KEY = 'nn.todayWeekView';
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const WeekCard: React.FC<{
  apps: WeekApp[];
  /** Today's column in the week grid, 0 = Monday (weekDayIndex). */
  todayIndex: number;
  /** Under the views: the streak and XP line. */
  footer?: React.ReactNode;
  onOpenApp?: (id: string) => void;
}> = ({ apps, todayIndex, footer, onOpenApp }) => {
  const total = weekTotal(apps);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Copy id="today.week.title" style={styles.title} accessibilityRole="header">
          {'This week'}
        </Copy>
        <Copy id="today.week.total" style={styles.total} vars={{ done: total.done, goal: total.goal }}>
          {'{done} of {goal}'}
        </Copy>
      </View>
      <SwipeViews
        name="This week"
        storageKey={STORE_KEY}
        views={WEEK_VIEWS.map((v) => ({
          id: v.id,
          label: v.label,
          render: () =>
            v.id === 'rings' ? (
              <RingsView apps={apps} onOpenApp={onOpenApp} />
            ) : v.id === 'bars' ? (
              <BarsView apps={apps} onOpenApp={onOpenApp} />
            ) : (
              <GridView apps={apps} todayIndex={todayIndex} />
            ),
        }))}
      />
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

const label = (a: WeekApp) => `${a.title}: ${a.done} of ${a.goal} this week`;

/** A — a small ring per app, three to a row. */
const RingsView: React.FC<{ apps: WeekApp[]; onOpenApp?: (id: string) => void }> = ({ apps, onOpenApp }) => (
  <View style={styles.ringGrid}>
    {apps.map((a) => (
      <TouchableOpacity
        key={a.id}
        style={styles.ringCell}
        onPress={onOpenApp ? () => onOpenApp(a.id) : undefined}
        disabled={!onOpenApp}
        accessibilityRole={onOpenApp ? 'button' : undefined}
        accessibilityLabel={label(a)}
      >
        <View style={styles.ringWrap}>
          <ProgressRing pct={a.pct} color={a.color} size={64} stroke={8} trackColor={a.color + '26'} />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={styles.ringCount}>
              {a.done}
              <Text style={styles.ringGoal}>/{a.goal}</Text>
            </Text>
          </View>
        </View>
        <Text style={styles.ringName} numberOfLines={1}>
          {a.title}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/** B — a progress bar per app. */
const BarsView: React.FC<{ apps: WeekApp[]; onOpenApp?: (id: string) => void }> = ({ apps, onOpenApp }) => (
  <View style={styles.bars}>
    {apps.map((a) => (
      <TouchableOpacity
        key={a.id}
        style={styles.barRow}
        onPress={onOpenApp ? () => onOpenApp(a.id) : undefined}
        disabled={!onOpenApp}
        accessibilityRole={onOpenApp ? 'button' : undefined}
        accessibilityLabel={label(a)}
      >
        <View style={styles.barHead}>
          <View style={styles.barName}>
            <View style={[styles.swatch, { backgroundColor: a.color }]} />
            <Text style={styles.name} numberOfLines={1}>
              {a.title}
            </Text>
          </View>
          <Text style={styles.count}>
            {a.done}
            <Text style={styles.goal}> / {a.goal}</Text>
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: a.color + '26' }]}>
          <View style={[styles.barFill, { width: `${Math.round(a.pct * 100)}%`, backgroundColor: a.color }]} />
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

/** D — a row per app, a cell per day, Monday to Sunday. */
const GridView: React.FC<{ apps: WeekApp[]; todayIndex: number }> = ({ apps, todayIndex }) => {
  return (
    <View style={styles.grid}>
      <View style={styles.gridRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.gridName} />
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[styles.dayLetter, i === todayIndex && styles.dayLetterToday]}>
            {l}
          </Text>
        ))}
        <View style={styles.gridCount} />
      </View>
      {apps.map((a) => (
        <View key={a.id} style={styles.gridRow} accessible accessibilityLabel={label(a)}>
          <Text style={[styles.name, styles.gridName]} numberOfLines={1}>
            {a.title}
          </Text>
          {a.days.map((d, i) => (
            <View
              key={i}
              style={[
                styles.cell,
                d === 'done' && { backgroundColor: a.color },
                d === 'open' && { backgroundColor: a.color + '26' },
                d === 'today' && { backgroundColor: a.color + '26', borderWidth: 1.5, borderColor: a.color },
                d === 'future' && styles.cellFuture,
              ]}
            />
          ))}
          <Text style={[styles.count, styles.gridCount]}>
            {a.done}
            <Text style={styles.goal}>/{a.goal}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, paddingTop: Spacing.md, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: 12,
  },
  title: { ...TextStyles.headline, color: Colors.dark },
  total: { ...TextStyles.footnote, color: Colors.gray },

  ringGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, paddingHorizontal: Spacing.sm },
  ringCell: { width: '33.333%', alignItems: 'center', gap: 6 },
  ringWrap: { width: 64, height: 64 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringCount: { ...TextStyles.headline, color: Colors.dark },
  ringGoal: { ...TextStyles.caption, color: Colors.gray },
  ringName: { ...TextStyles.footnote, fontWeight: '600', color: Colors.dark, maxWidth: '92%' },

  bars: { gap: 12, paddingHorizontal: Spacing.md },
  barRow: { gap: 6 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  barName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  name: { ...TextStyles.subhead, fontWeight: '600', color: Colors.dark },
  count: { ...TextStyles.subhead, fontWeight: '800', color: Colors.dark },
  goal: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },

  grid: { gap: 8, paddingHorizontal: Spacing.md },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridName: { width: 84 },
  gridCount: { width: 38, textAlign: 'right' },
  dayLetter: { flex: 1, textAlign: 'center', ...TextStyles.caption, color: Colors.gray },
  dayLetterToday: { color: Colors.dark, fontWeight: '800' },
  cell: { flex: 1, height: 22, borderRadius: 6 },
  cellFuture: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.separator },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
});

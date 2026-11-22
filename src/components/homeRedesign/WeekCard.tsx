import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { ProgressRing } from '../common/ProgressRing';
import { WEEK_VIEWS, WeekApp, WeekViewId, weekTotal, weekViewOf } from '../../services/weekViews';

// =============================================================================
// THE WEEK CARD at the top of Today (2026-11-22): three ways to show the week
// (a ring per app, bars, a week grid), swiped between, with dots below. The
// last one seen is remembered on this phone. Logic: services/weekViews.ts.
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
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const restored = useRef(false);

  // Come back to the view last seen on this phone.
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((v) => {
        const i = WEEK_VIEWS.findIndex((x) => x.id === weekViewOf(v));
        if (i > 0) setPage(i);
      })
      .catch(() => {});
  }, []);

  // Once the card knows its width, show the remembered page without animating.
  useEffect(() => {
    if (width > 0 && !restored.current) {
      restored.current = true;
      scroller.current?.scrollTo({ x: page * width, animated: false });
    }
  }, [width, page]);

  const goTo = (i: number) => {
    setPage(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
    remember(WEEK_VIEWS[i].id);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.max(0, Math.min(WEEK_VIEWS.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (i !== page) {
      setPage(i);
      remember(WEEK_VIEWS[i].id);
    }
  };

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setHeights((hs) => (hs[i] === h ? hs : Object.assign([...hs], { [i]: h })));
  };

  const total = weekTotal(apps);
  const height = heights[page];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          This week
        </Text>
        <Text style={styles.total}>
          {total.done} of {total.goal}
        </Text>
      </View>

      <View onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        {width > 0 && (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={height ? { height } : undefined}
            contentContainerStyle={styles.pages}
            accessibilityLabel={`This week, ${WEEK_VIEWS[page].label} view`}
          >
            {WEEK_VIEWS.map((v, i) => (
              <View key={v.id} style={{ width }} onLayout={measure(i)}>
                {v.id === 'rings' ? (
                  <RingsView apps={apps} onOpenApp={onOpenApp} />
                ) : v.id === 'bars' ? (
                  <BarsView apps={apps} onOpenApp={onOpenApp} />
                ) : (
                  <GridView apps={apps} todayIndex={todayIndex} />
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.dots} accessibilityRole="tablist">
        {WEEK_VIEWS.map((v, i) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => goTo(i)}
            style={styles.dotHit}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === page }}
            accessibilityLabel={`${v.label} view`}
          >
            <View style={[styles.dot, i === page && styles.dotOn]} />
          </TouchableOpacity>
        ))}
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

const remember = (id: WeekViewId) => {
  AsyncStorage.setItem(STORE_KEY, id).catch(() => {});
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
  pages: { alignItems: 'flex-start' },

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

  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dotHit: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.separator },
  dotOn: { backgroundColor: Colors.dark },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
});

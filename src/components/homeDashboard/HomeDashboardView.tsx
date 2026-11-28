import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import type { CompletionLog } from '../../types';
import {
  buildHomeDashboard,
  describeFriction,
  describeVsPrior,
  HomeDashboard,
  recentDayLabel,
} from '../../services/homeDashboard';
import type { TodayAppId } from '../../services/appCheckins';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { MODES } from '../../services/meditateMath';
import { formatVolume } from '../../services/workoutMath';
import { LoadError } from '../homeRedesign/LoadError';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import {
  APP_ICONS,
  Chip,
  DayDots,
  BarTrend,
  DotTrend,
  ListRow,
  Ring,
  SectionLabel,
  ServingsTreemap,
  StartButton,
  TINT,
  WeekGrid,
} from './DashboardParts';

// =============================================================================
// HOME — the main screen (docs/no-generic-habits-micro-apps.md): rings across
// the top, then Overview / Meditate / Workouts / Meals as pages you swipe
// between or pick from the tabs. The rings shrink to one line once you scroll
// into a page. Numbers come from services/homeDashboard.ts.
//
// The check-in machinery (the rating sheet, XP, celebrations, rule modals) is
// HomeScreen's; this is only what you see. Friction reads the logs HomeScreen
// holds, so a rating shows here the moment it's made.
// =============================================================================

type PageId = 'overview' | TodayAppId;
const PAGES: { id: PageId; title: string; icon: string }[] = [
  { id: 'overview', title: 'Overview', icon: 'grid-outline' },
  { id: 'meditate', title: 'Meditate', icon: APP_ICONS.meditate },
  { id: 'workouts', title: 'Workouts', icon: APP_ICONS.workouts },
  { id: 'meals', title: 'Meals', icon: APP_ICONS.meals },
];

const NO_APPS: TodayAppId[] = [];

const COLLAPSE_AT = 40;
const EXPAND_AT = 8;

interface Props {
  userId: string;
  /** The account's nudge logs (at least the last 14 days) — friction comes from these. */
  logs: CompletionLog[];
  /** False until those logs have loaded: drawing before would show "No ratings yet" and short counts. */
  logsReady?: boolean;
  onOpenApp: (appId: TodayAppId) => void;
  /** Pull to refresh on Overview also reloads the parent screen. */
  onRefresh?: () => Promise<void> | void;
  /** On Overview, above the week grid. */
  overviewTop?: React.ReactNode;
  /** On Overview, under the app rows. */
  overviewBottom?: React.ReactNode;
  /** Every time the numbers change — the streak line and the user doc follow them. */
  onDashboard?: (d: HomeDashboard) => void;
  /** The apps' data couldn't be read: Today has no dashboard to hand on. */
  onLoadFailed?: () => void;
  /** Apps switched off (services/appSetup.ts): no page, ring, row or grid line. */
  hiddenApps?: TodayAppId[];
}

export const HomeDashboardView: React.FC<Props> = ({
  userId,
  logs,
  logsReady = true,
  onOpenApp,
  onRefresh,
  overviewTop,
  overviewBottom,
  onDashboard,
  onLoadFailed,
  hiddenApps = NO_APPS,
}) => {
  const t = useCopy();
  const pages = useMemo(() => PAGES.filter((p) => p.id === 'overview' || !hiddenApps.includes(p.id)), [hiddenApps]);
  const shows = (id: TodayAppId) => !hiddenApps.includes(id);
  const { width } = useWindowDimensions();
  // The tab bar sits over the bottom of the pages, so each page ends above it.
  const tabBarHeight = useBottomTabBarHeight();
  const pager = useRef<ScrollView>(null);
  const offsets = useRef<Record<PageId, number>>({ overview: 0, meditate: 0, workouts: 0, meals: 0 });

  const [appData, setAppData] = useState<HomeAppData | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState<PageId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    () =>
      loadHomeAppData(userId).then(
        (data) => (setAppData(data), setError(false)),
        (e) => {
          console.warn('Today: loading the apps failed:', e);
          setError(true);
          onLoadFailed?.();
        }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  // Reload on every return, so a session finished in an app shows up.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), onRefresh?.()]);
    setRefreshing(false);
  };

  const d = useMemo(
    () => (appData && logsReady ? buildHomeDashboard({ ...appData, logs, hiddenApps }) : null),
    [appData, logs, logsReady, hiddenApps]
  );
  useEffect(() => {
    if (d) onDashboard?.(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const collapsedRef = useRef(false);
  const setCollapsedSmooth = (next: boolean) => {
    if (collapsedRef.current === next) return;
    collapsedRef.current = next;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(next);
  };

  // A gap between the two thresholds: shrinking the header grows the page, and
  // a page only just taller than the screen would otherwise bounce open and shut.
  const shouldCollapse = (y: number): boolean =>
    y > COLLAPSE_AT ? true : y < EXPAND_AT ? false : collapsedRef.current;

  const goTo = (id: PageId) => {
    const i = pages.findIndex((p) => p.id === id);
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(id);
    setCollapsedSmooth(offsets.current[id] > COLLAPSE_AT);
  };

  const onPageScroll = (id: PageId) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    offsets.current[id] = y;
    if (id === page) setCollapsedSmooth(shouldCollapse(y));
  };

  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const id = pages[Math.max(0, Math.min(pages.length - 1, i))].id;
    if (id !== page) {
      setPage(id);
      setCollapsedSmooth(offsets.current[id] > COLLAPSE_AT);
    }
  };

  const unit = appData?.unit ?? 'lb';
  const pageTitle = (id: PageId) => t(`today.dash.page.${id}`, PAGES.find((p) => p.id === id)?.title ?? '');
  const streakText = (n: number) =>
    n > 0 ? t('today.dash.streak', '{n}-day streak', { n }) : t('today.dash.noStreak', 'No streak yet');
  const platesScore = (score: number | null) =>
    score === null ? t('today.dash.noPlatesYet', 'no plates yet') : t('today.dash.score', 'score {score}', { score });
  const notRated = t('today.dash.notRated', 'not rated yet');
  const collapsedLine: Record<PageId, string> = {
    overview: t('today.dash.page.overview', 'Overview'),
    meditate: d
      ? t('today.dash.collapsed.meditate', 'Meditate · {minutes} min', { minutes: d.meditate.minutes })
      : t('today.dash.page.meditate', 'Meditate'),
    workouts: d
      ? t('today.dash.collapsed.workouts', 'Workouts · {sessions} of {goal}', {
          sessions: d.workouts.sessions,
          goal: d.workouts.goal,
        })
      : t('today.dash.page.workouts', 'Workouts'),
    meals: d
      ? t('today.dash.collapsed.meals', 'Meals · {plates}', { plates: platesScore(d.meals.averageScore) })
      : t('today.dash.page.meals', 'Meals'),
  };

  const pageProps = (id: PageId) => ({
    style: { width },
    contentContainerStyle: [styles.page, { paddingBottom: tabBarHeight + Spacing.lg }],
    onScroll: onPageScroll(id),
    scrollEventThrottle: 16,
  });

  return (
    <View style={styles.screen}>
      {/* Fixed header: tabs, then the rings (or their one-line summary) */}
      <View style={styles.header}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {pages.map((p) => {
            const on = p.id === page;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.tab}
                onPress={() => goTo(p.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={p.icon as never} size={16} color={on ? Colors.primary : Colors.gray} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{pageTitle(p.id)}</Text>
                <View style={[styles.tabBar, on && styles.tabBarOn]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {d &&
          (collapsed ? (
            <View style={styles.slim}>
              <View style={styles.slimDot} />
              <Text style={styles.slimText}>
                <Text style={styles.strong}>{streakText(d.combinedStreak)}</Text>{' '}
                · {collapsedLine[page]}
              </Text>
            </View>
          ) : (
            <View style={styles.rings}>
              <Copy id="today.dash.window" style={styles.window}>{'This week'}</Copy>
              <View style={styles.ringRow}>
                {d.rings.map((r) => {
                  const title = pageTitle(r.appId);
                  return (
                    <TouchableOpacity key={r.appId} style={styles.ringItem} onPress={() => goTo(r.appId)}>
                      <Ring pct={r.pct} label={`${title}: ${r.done} of ${r.goal}`} />
                      <Text style={styles.ringLabel}>{title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.insight}>
                <Text style={styles.strong}>{streakText(d.combinedStreak)}</Text>
                {d.insight ? ` · ${d.insight}` : ''}
              </Text>
            </View>
          ))}
      </View>

      {!d ? (
        <View style={styles.center}>
          {error ? (
            <LoadError onRetry={() => Promise.all([reload(), onRefresh?.()])} />
          ) : (
            <ActivityIndicator color={Colors.primary} />
          )}
        </View>
      ) : (
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSwipeEnd}
          style={styles.pager}
        >
          {/* Overview */}
          <ScrollView
            {...pageProps('overview')}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          >
            {overviewTop}
            <SectionLabel>{t('today.dash.weekGlance', 'Your week at a glance')}</SectionLabel>
            <WeekGrid grid={d.grid} apps={pages.flatMap((p) => (p.id === 'overview' ? [] : [p.id]))} />

            <SectionLabel>{t('today.dash.openApp', 'Open an app')}</SectionLabel>
            {(
              [
                [
                  'meditate',
                  pageTitle('meditate'),
                  t('today.dash.row.meditate', '{minutes} min · {streak}-day streak', {
                    minutes: d.meditate.minutes,
                    streak: d.meditate.streakDays,
                  }),
                ],
                [
                  'workouts',
                  pageTitle('workouts'),
                  t('today.dash.row.workouts', '{sessions} of {goal} sessions · {streak}-week streak', {
                    sessions: d.workouts.sessions,
                    goal: d.workouts.goal,
                    streak: d.workouts.streakWeeks,
                  }),
                ],
                [
                  'meals',
                  pageTitle('meals'),
                  t('today.dash.row.meals', '{logged} of {goal} days logged · {plates}', {
                    logged: d.meals.loggedThisWeek,
                    goal: d.meals.goal,
                    plates: platesScore(d.meals.averageScore),
                  }),
                ],
              ] as [TodayAppId, string, string][]
            )
              .filter(([id]) => shows(id))
              .map(([id, title, line]) => (
                <TouchableOpacity key={id} style={styles.appRow} onPress={() => goTo(id)} accessibilityRole="button">
                  <View style={styles.appIcon}>
                    <Ionicons name={APP_ICONS[id] as never} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.appTitle}>{title}</Text>
                    <Text style={styles.muted}>{line}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
                </TouchableOpacity>
              ))}
            {overviewBottom}
          </ScrollView>

          {/* Meditate */}
          {shows('meditate') && (
            <ScrollView {...pageProps('meditate')}>
              <Text style={styles.hero}>
                {d.meditate.minutes} <Text style={styles.heroUnit}>{t('today.dash.unit.min', 'min')}</Text>
              </Text>
              <Text style={styles.body}>
                {describeVsPrior(d.meditate.minutes, d.meditate.priorMinutes, 'min') ??
                  t('today.dash.meditate.nothing', 'Nothing yet this week')}
              </Text>
              {d.meditate.lastSessionMinutes !== null && (
                <Copy id="today.dash.meditate.last" style={styles.muted} vars={{ minutes: d.meditate.lastSessionMinutes }}>
                  {'Last session: {minutes} min'}
                </Copy>
              )}
              <SectionLabel>{t('today.dash.meditate.perSession', 'Minutes per session')}</SectionLabel>
              <DotTrend
                values={d.meditate.series}
                label={t('today.dash.last8', 'Your last 8 sessions')}
                empty={t('today.dash.noSessions', 'No sessions yet.')}
              />
              <View style={styles.chips}>
                <Chip text={t('today.dash.streak', '{n}-day streak', { n: d.meditate.streakDays })} />
                <Chip
                  text={t('today.dash.chip.sessions', '{sessions} of {goal} sessions', {
                    sessions: d.meditate.sessions,
                    goal: d.meditate.goal,
                  })}
                />
                <Chip
                  text={t('today.dash.chip.start', 'Getting started: {value}', {
                    value: describeFriction(d.friction.meditate) ?? notRated,
                  })}
                />
                <Chip
                  text={t('today.dash.chip.stay', 'Staying with it: {value}', {
                    value: describeFriction(d.keepGoing.meditate) ?? notRated,
                  })}
                />
              </View>
              {d.meditate.recent.length > 0 && (
                <SectionLabel>{t('today.dash.meditate.recent', 'Recent sessions')}</SectionLabel>
              )}
              {d.meditate.recent.map((s, i) => (
                <ListRow key={i} cells={[recentDayLabel(s.date, appData!.today), MODES[s.mode].label, t('today.dash.row.minutes', '{n} min', { n: s.minutes })]} />
              ))}
              <StartButton label={t('today.dash.meditate.start', 'Start a session')} onPress={() => onOpenApp('meditate')} />
            </ScrollView>
          )}

          {/* Workouts */}
          {shows('workouts') && (
            <ScrollView {...pageProps('workouts')}>
              <Text style={styles.hero}>{formatVolume(d.workouts.volumeKg, unit)}</Text>
              <Text style={styles.body}>
                {d.workouts.volumeChangePct === null
                  ? t('today.dash.workouts.volume', 'Total volume lifted')
                  : t('today.dash.workouts.volumeChange', 'Total volume {dir} {pct}% on the 7 days before', {
                      dir:
                        d.workouts.volumeChangePct >= 0
                          ? t('today.dash.dirUp', 'up')
                          : t('today.dash.dirDown', 'down'),
                      pct: Math.abs(d.workouts.volumeChangePct),
                    })}
              </Text>
              {d.workouts.standout && (
                <Text style={styles.muted}>
                  {d.workouts.standout.name}: {d.workouts.standout.line}
                </Text>
              )}
              <SectionLabel>{t('today.dash.workouts.perSession', 'Volume per session')}</SectionLabel>
              <BarTrend
                values={d.workouts.series}
                label={t('today.dash.last8', 'Your last 8 sessions')}
                empty={t('today.dash.noSessions', 'No sessions yet.')}
                formatValue={(kg) => formatVolume(kg, unit)}
              />
              <View style={styles.chips}>
                <Chip text={t('today.dash.chip.weekStreak', '{n}-week streak', { n: d.workouts.streakWeeks })} />
                <Chip
                  text={t('today.dash.chip.sessions', '{sessions} of {goal} sessions', {
                    sessions: d.workouts.sessions,
                    goal: d.workouts.goal,
                  })}
                />
                <Chip text={t('today.dash.chip.lastWeek', '{n} last week', { n: d.workouts.priorSessions })} />
                <Chip
                  text={t('today.dash.chip.start', 'Getting started: {value}', {
                    value: describeFriction(d.friction.workouts) ?? notRated,
                  })}
                />
                <Chip
                  text={t('today.dash.chip.stay', 'Staying with it: {value}', {
                    value: describeFriction(d.keepGoing.workouts) ?? notRated,
                  })}
                />
              </View>
              {(d.workouts.week.length > 0 || d.workouts.phaseLine) && (
                <SectionLabel>
                  {t('today.dash.thisWeek', 'This week')}
                  {d.workouts.phaseLine ? ` · ${d.workouts.phaseLine}` : ''}
                </SectionLabel>
              )}
              {d.workouts.week.map((w, i) => (
                <ListRow key={i} cells={[recentDayLabel(w.date, appData!.today), w.name, t('today.dash.row.sets', '{n} sets', { n: w.sets })]} />
              ))}
              <StartButton label={t('today.dash.workouts.start', 'Start a workout')} onPress={() => onOpenApp('workouts')} />
            </ScrollView>
          )}

          {/* Meals */}
          {shows('meals') && (
            <ScrollView {...pageProps('meals')}>
              {d.meals.averageScore === null ? (
                <Text style={styles.hero}>
                  – <Text style={styles.heroUnit}>{t('today.dash.meals.none', 'no plates logged yet')}</Text>
                </Text>
              ) : (
                <>
                  <Text style={styles.hero}>
                    {d.meals.averageScore}{' '}
                    <Text style={styles.heroUnit}>{t('today.dash.meals.average', 'average score')}</Text>
                  </Text>
                  <Text style={styles.body}>
                    {d.meals.priorAverageScore === null
                      ? t('today.dash.meals.every', 'Every plate in the last 7 days, out of 100')
                      : describeVsPrior(d.meals.averageScore, d.meals.priorAverageScore, 'pts')}
                  </Text>
                </>
              )}
              <Text style={styles.muted}>
                {t('today.dash.meals.onTarget', '{n} of 7 days on target ({threshold}+) ·', {
                  n: d.meals.onTarget,
                  threshold: d.meals.threshold,
                })}{' '}
                {describeVsPrior(d.meals.onTarget, d.meals.priorOnTarget, 'days')?.toLowerCase() ??
                  t('today.dash.meals.noneBefore', 'none the week before')}
              </Text>
              <SectionLabel>{t('today.dash.meals.ate', 'What you ate')}</SectionLabel>
              <ServingsTreemap servings={d.meals.servings} />
              <SectionLabel>{t('today.dash.meals.dayByDay', 'Day by day')}</SectionLabel>
              <DayDots days={d.meals.days} threshold={d.meals.threshold} />
              <View style={styles.chips}>
                <Chip
                  text={t('today.dash.chip.daysLogged', '{logged} of {goal} days logged', {
                    logged: d.meals.loggedThisWeek,
                    goal: d.meals.goal,
                  })}
                />
                <Chip text={t('today.dash.streak', '{n}-day streak', { n: d.meals.streakDays })} />
                <Chip
                  text={t('today.dash.chip.eatingWell', 'Eating well: {value}', {
                    value: describeFriction(d.mealsDay) ?? notRated,
                  })}
                />
              </View>
              <StartButton label={t('today.dash.meals.start', 'Log a meal')} onPress={() => onOpenApp('meals')} />
            </ScrollView>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, backgroundColor: Colors.lightGray },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 4 },
  tabText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  tabTextOn: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  tabBar: { height: 2, alignSelf: 'stretch', borderRadius: 1, marginTop: 4, backgroundColor: 'transparent' },
  tabBarOn: { backgroundColor: Colors.primary },
  rings: { paddingVertical: Spacing.sm },
  window: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  ringItem: { alignItems: 'center', gap: 4 },
  ringLabel: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.gray },
  insight: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 17,
  },
  strong: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  slim: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  slimDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  slimText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  pager: { flex: 1 },
  page: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  hero: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.hero, color: Colors.dark, marginTop: Spacing.sm },
  heroUnit: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: 2 },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  appIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
});

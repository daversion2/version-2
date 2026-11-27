import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import type { CompletionLog } from '../../types';
import type { TodayAppId } from '../../services/appCheckins';
import { buildHomeDashboard, HomeDashboard } from '../../services/homeDashboard';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { formatDayHeader, getTodayString } from '../../utils/date';
import type { TodayRowId } from '../../data/appCatalog';
import type { RowRing } from '../../services/rowRings';
import { WeekCard } from './WeekCard';
import { AppsCard } from './AppsCard';
import { APP_ACTIONS, TodayAppItem } from '../../services/appsLayout';
import { WeekApp, weekApp, weekDayIndex } from '../../services/weekViews';
import { TopScrim } from '../common/TopScrim';
import { APP_ICONS } from '../homeDashboard/DashboardParts';
import { LoadError } from './LoadError';

// =============================================================================
// TODAY, REDESIGNED (Lab → "Apple-style redesign"; canvas "Today" artboard).
// One scrolling list in place of HomeDashboardView's swipeable pages: the three
// rings nested, today's plan, the apps as rows (each opens its AppPage), then
// Close out the day. Same numbers as the old Today: services/homeDashboard.ts.
// The check-in machinery stays in HomeScreen, as it does for the old view.
// =============================================================================

export const APP_TITLES: Record<TodayAppId, string> = { meditate: 'Meditate', workouts: 'Workouts', meals: 'Meals' };
const APP_ORDER: TodayAppId[] = ['meditate', 'workouts', 'meals'];

interface Props {
  userId: string;
  /** The account's nudge logs (at least the last 14 days) — friction comes from these. */
  logs: CompletionLog[];
  /** False until those logs have loaded: drawing before would show short counts. */
  logsReady: boolean;
  onDashboard?: (d: HomeDashboard) => void;
  /** The apps' data couldn't be read: Today has no dashboard to hand on. */
  onLoadFailed?: () => void;
  onRefresh?: () => Promise<void> | void;
  onOpenAppPage: (appId: TodayAppId) => void;
  /** Opens the screen intro (the ⓘ). */
  onInfo: () => void;
  /** Above the rings: the rule banner. */
  top?: React.ReactNode;
  xp: number;
  /** Last night's plan as one sentence, while it's still to do. */
  plan: string | null;
  /** Close out the day's row under Your apps. Unset: removed from Today (Apps). */
  closeOut?: { title: string; subtitle: string; done: boolean; onPress: () => void };
  /** Craving Crusher's row under Your apps. Unset: removed from Today (Apps). */
  craving?: { title: string; subtitle: string; onPress: () => void };
  /** Starts the app last night's plan names. Unset: the plan card has no button. */
  onStartPlan?: () => void;
  /** Close out the day's and Craving Crusher's rings (services/rowRings.ts), after the apps'. */
  extraRings?: RowRing[];
  /** More app rows under Your apps, after Craving Crusher. */
  extraRows?: ExtraRow[];
  /** The app last night's plan names, while it's still to do: flagged on the apps card. */
  planAppId?: string;
  /** Apps switched off (services/appSetup.ts): no ring and no row. */
  hiddenApps?: TodayAppId[];
  /** Opens the Apps screen (everyone since 2026-11-20). Unset hides the row. */
  onBrowseApps?: () => void;
  /** Under the apps: the Pod card (components/pods/PodCard). Unset: none. */
  pod?: React.ReactNode;
}

const NO_APPS: TodayAppId[] = [];
const NO_RINGS: RowRing[] = [];
const ROW_TITLES: Record<TodayRowId, string> = {
  nightly: 'Close out',
  craving: 'Cravings',
  hotcold: 'Hot & Cold',
  avoidance: 'Avoidance',
};
const NO_ROWS: ExtraRow[] = [];

/** A row under Your apps for an app added from Apps (Hot & Cold, Avoidance Training). */
export interface ExtraRow {
  id: TodayRowId;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export const TodayView: React.FC<Props> = ({
  userId,
  logs,
  logsReady,
  onDashboard,
  onLoadFailed,
  onRefresh,
  onOpenAppPage,
  onInfo,
  top,
  xp,
  plan,
  closeOut,
  craving,
  hiddenApps = NO_APPS,
  onBrowseApps,
  pod,
  onStartPlan,
  extraRings = NO_RINGS,
  extraRows = NO_ROWS,
  planAppId,
}) => {
  const apps = useMemo(() => APP_ORDER.filter((id) => !hiddenApps.includes(id)), [hiddenApps]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [appData, setAppData] = useState<HomeAppData | null>(null);
  const [error, setError] = useState(false);
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

  // Back in the app on a new day (left open overnight): the window moved, so
  // read again. A same-day resume keeps what's on screen.
  const loadedDay = appData?.today;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && loadedDay && loadedDay !== getTodayString()) reload();
    });
    return () => sub.remove();
  }, [loadedDay, reload]);

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

  const ringOf = (id: TodayAppId) => d?.rings.find((r) => r.appId === id);
  // The week card (2026-11-22): every app on Today, apps first, then the rows.
  const appDates = (id: TodayAppId): string[] =>
    !d ? [] : id === 'meditate' ? d.meditate.activeDates : id === 'workouts' ? d.workouts.activeDates : d.meals.loggedDates;
  const weekApps: WeekApp[] =
    d && appData
      ? [
          ...apps.map((id) =>
            weekApp(
              { id, title: APP_TITLES[id], color: AppColors[id], done: ringOf(id)?.done ?? 0, goal: ringOf(id)?.goal ?? 0, dates: appDates(id) },
              appData.today
            )
          ),
          ...extraRings.map((r) =>
            weekApp(
              { id: r.id, title: ROW_TITLES[r.id], color: AppColors[r.id], done: r.done, goal: r.goal, dates: r.dates ?? [] },
              appData.today
            )
          ),
        ]
      : [];
  // "Your apps" (2026-11-22): every app on Today with today's status, for the apps card.
  const todayIdx = appData ? weekDayIndex(appData.today) : -1;
  const doneToday = (id: string) => weekApps.find((w) => w.id === id)?.days[todayIdx] === 'done';
  const weekNote = (id: string) => {
    const w = weekApps.find((x) => x.id === id);
    return w ? `${w.done} of ${w.goal} this week` : '';
  };
  const appItems: TodayAppItem[] = [
    ...apps.map((id) => ({
      id,
      title: APP_TITLES[id],
      short: APP_TITLES[id],
      color: AppColors[id],
      icon: APP_ICONS[id],
      note: id === planAppId && !doneToday(id) ? 'Today’s plan' : weekNote(id),
      done: doneToday(id),
      plan: id === planAppId && !doneToday(id),
      action: APP_ACTIONS[id],
    })),
    ...(closeOut
      ? [{ id: 'nightly', title: 'Close out the day', short: 'Close out', color: AppColors.nightly, icon: 'moon', note: closeOut.done ? 'Closed out' : 'Tonight', done: closeOut.done, plan: false, action: APP_ACTIONS.nightly }]
      : []),
    ...(craving
      ? [{ id: 'craving', title: craving.title, short: 'Cravings', color: AppColors.craving, icon: 'water', note: 'When an urge hits', done: doneToday('craving'), plan: false, action: APP_ACTIONS.craving }]
      : []),
    ...extraRows.map((r) => ({
      id: r.id,
      title: r.title,
      short: ROW_TITLES[r.id],
      color: r.color,
      icon: r.icon,
      note: weekNote(r.id) || r.subtitle || '',
      done: doneToday(r.id),
      plan: false,
      action: APP_ACTIONS[r.id] ?? 'Open',
    })),
  ];

  const openFromWeek = (id: string) => {
    if ((apps as string[]).includes(id)) return onOpenAppPage(id as TodayAppId);
    if (id === 'nightly') return closeOut?.onPress();
    if (id === 'craving') return craving?.onPress();
    extraRows.find((r) => r.id === id)?.onPress();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.date}>{appData ? formatDayHeader(appData.today).toUpperCase() : ' '}</Text>
            <Text style={styles.title} accessibilityRole="header">
              Today
            </Text>
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={onInfo}
            accessibilityRole="button"
            accessibilityLabel="How this screen works"
          >
            <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {top}

        {!d ? (
          <View style={styles.loading}>
            {error ? <LoadError onRetry={() => Promise.all([reload(), onRefresh?.()])} /> : <ActivityIndicator color={Colors.primary} />}
          </View>
        ) : (
          <>
            <WeekCard
              apps={weekApps}
              todayIndex={weekDayIndex(appData?.today ?? '')}
              onOpenApp={openFromWeek}
              footer={
                <Text style={styles.footerText}>
                  <Text style={styles.strong}>
                    {d.combinedStreak > 0 ? `${d.combinedStreak}-day streak` : 'No streak yet'}
                  </Text>
                  {` · ${xp.toLocaleString()} XP in all`}
                </Text>
              }
            />

            {plan ? (
              <View style={styles.card}>
                <Text style={styles.planLabel}>Today’s plan</Text>
                <View style={styles.planRow}>
                  <Text style={[styles.planText, styles.planTextFlex]}>{plan}</Text>
                  {onStartPlan ? (
                    <TouchableOpacity style={styles.planStart} onPress={onStartPlan} accessibilityRole="button">
                      <Text style={styles.planStartText}>Start</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            <AppsCard items={appItems} onOpen={openFromWeek} onBrowse={onBrowseApps} />

            {pod}

          </>
        )}
      </ScrollView>
      <TopScrim />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerText: { gap: 2 },
  date: { ...TextStyles.footnote, fontWeight: '600', letterSpacing: 0.3, color: Colors.gray },
  title: { ...TextStyles.largeTitle, color: Colors.dark },
  infoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 20, gap: Spacing.md },
  footerText: { ...TextStyles.subhead, color: Colors.label2 },
  strong: { fontWeight: '600', color: Colors.dark },
  planLabel: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray, marginBottom: -12 },
  planText: { ...TextStyles.headline, color: Colors.dark },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planTextFlex: { flex: 1 },
  planStart: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
  },
  planStartText: { ...TextStyles.subhead, fontWeight: '700', color: Colors.white },
});

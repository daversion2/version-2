import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { AppColors, BorderRadius, Colors, Fonts, Spacing, TextStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { ProgressNavigation } from '../../types/navigation';
import type { CompletionLog } from '../../types';
import type { TodayAppId } from '../../services/appCheckins';
import {
  appSessionsByDay,
  DayAppSessions,
  getCompletionLogs,
  getProgressVersion,
  progressNeedsReload,
  ProgressLoadStamp,
  rememberDaySessions,
  showedUpDays,
} from '../../services/progress';
import { buildFrictionOverview, FrictionOverview } from '../../services/frictionCapacity';
import { appHistory, HistoryRange, historyDays } from '../../services/appHistory';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { getTodayString } from '../../utils/date';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro } from '../../components/common/ScreenIntro';
import { Button } from '../../components/common/Button';
import { LargeTitle } from '../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { TopScrim } from '../../components/common/TopScrim';
import { MiniBars } from '../../components/common/MiniBars';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { FrictionCard } from '../../components/progress/FrictionCard';
import { PhaseHighlightCard } from '../../components/progress/PhaseHighlightCard';
import { APP_TITLES } from '../../components/homeRedesign/TodayView';

// =============================================================================
// PROGRESS, REDESIGNED (Lab → "Apple-style redesign"; canvas "Progress").
// Friction first, then a longer history per app (founder decision D2), then
// the Workouts phase card and the calendar of days you showed up. The old
// screen's totals row and activity trend counted habit check-ins, so they're
// gone here; XP lives on Today.
// =============================================================================

const APP_ORDER: TodayAppId[] = ['meditate', 'workouts', 'meals'];
const RANGES: { value: HistoryRange; label: string }[] = [
  { value: 'week', label: 'W' },
  { value: 'month', label: 'M' },
  { value: 'sixMonths', label: '6M' },
];

export const ProgressRedesignScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProgressNavigation>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const intro = useScreenIntro('progress');
  useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);

  const [range, setRange] = useState<HistoryRange>('month');
  const [apps, setApps] = useState<HomeAppData | null>(null);
  const [friction, setFriction] = useState<FrictionOverview | null>(null);
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  const [sessionDays, setSessionDays] = useState<Map<string, DayAppSessions>>(new Map());
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // When the screen last read, so a quick tab switch doesn't read the whole
  // history again (services/progress.ts, progressNeedsReload). The check-in
  // read stays all-time: the friction card's baselines need a habit's first
  // ratings, and the calendar pages back to any month.
  const stamp = useRef<ProgressLoadStamp | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    const version = getProgressVersion();
    try {
      const [appData, allLogs] = await Promise.all([
        loadHomeAppData(user.uid, { mealsDays: historyDays('sixMonths') }),
        getCompletionLogs(user.uid),
      ]);
      // One read of the check-ins serves the friction card and the calendar.
      const byDay = appSessionsByDay(appData, allLogs);
      rememberDaySessions(user.uid, byDay);
      setApps(appData);
      setLogs(allLogs);
      setSessionDays(byDay);
      setFriction(buildFrictionOverview(allLogs, getTodayString()));
      setError(false);
      stamp.current = { userId: user.uid, at: Date.now(), version };
    } catch (e) {
      console.warn('Progress: could not load:', e);
      setError(true);
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user && progressNeedsReload(stamp.current, user.uid, Date.now())) load();
    }, [user, load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const retry = () => {
    setError(false);
    load();
  };

  // A dot on every day you showed up — the days Today's streak counts (a
  // session, rated or not, or meals logged) plus any day with a check-in.
  // Tapping a day opens it.
  const marked = useMemo(() => {
    const out: Record<string, { marked: boolean; dotColor: string }> = {};
    for (const d of showedUpDays(sessionDays.keys(), logs)) out[d] = { marked: true, dotColor: Colors.secondary };
    return out;
  }, [sessionDays, logs]);
  const onDayPress = (day: DateData) => navigation.navigate('DayDetail', { date: day.dateString });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: tabBarHeight + Spacing.lg,
          },
        ]}
      >
        <LargeTitle title="Progress" onInfo={intro.reopen} />

        {!apps || !friction ? (
          <View style={styles.loading}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.muted}>Couldn’t load your progress. Check your connection and try again.</Text>
                <Button title="Try again" variant="outline" onPress={retry} />
              </View>
            ) : (
              <ActivityIndicator color={Colors.primary} />
            )}
          </View>
        ) : (
          <>
            <FrictionCard overview={friction} bare />

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  History
                </Text>
                <SegmentedControl
                  options={RANGES}
                  value={range}
                  onChange={setRange}
                  accessibilityLabel="Time range"
                  style={styles.ranges}
                />
              </View>
              <ListGroup>
                {APP_ORDER.map((id) => {
                  const h = appHistory(id, apps, range);
                  return (
                    <ListRow
                      key={id}
                      title={APP_TITLES[id]}
                      subtitle={h.line}
                      right={<MiniBars values={h.buckets.map((b) => b.value)} color={AppColors[id]} />}
                      onPress={() =>
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: 'Home',
                            params: {
                              screen: 'AppPage',
                              params: { appId: id },
                            },
                          })
                        )
                      }
                    />
                  );
                })}
              </ListGroup>
            </View>

            <PhaseHighlightCard refreshKey={logs.length} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Days you showed up
              </Text>
              <View style={styles.card}>
                <Calendar
                  markedDates={marked}
                  onDayPress={onDayPress}
                  theme={{
                    calendarBackground: Colors.cardBg,
                    todayTextColor: Colors.secondary,
                    arrowColor: Colors.primary,
                    textDayFontFamily: Fonts.secondary,
                    textMonthFontFamily: Fonts.primaryBold,
                    textDayHeaderFontFamily: Fonts.secondary,
                  }}
                />
              </View>
            </View>
          </>
        )}
        <ScreenIntro intro={intro} />
      </ScrollView>
      <TopScrim />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  muted: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center' },
  errorBox: { alignItems: 'center', gap: Spacing.md },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...TextStyles.title3,
    fontWeight: '700',
    color: Colors.dark,
    paddingHorizontal: 4,
  },
  ranges: { width: 168 },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    overflow: 'hidden',
  },
});

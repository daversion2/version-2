import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { AppColors, BorderRadius, Colors, Fonts, Spacing, TextStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { ProgressNavigation } from '../../types/navigation';
import type { CompletionLog } from '../../types';
import type { TodayAppId } from '../../services/appCheckins';
import { getCompletionLogs } from '../../services/progress';
import { buildFrictionOverview, FrictionOverview } from '../../services/frictionCapacity';
import { appHistory, HistoryRange, historyDays } from '../../services/appHistory';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { getTodayString } from '../../utils/date';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro } from '../../components/common/ScreenIntro';
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
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      Promise.all([
        loadHomeAppData(user.uid, { mealsDays: historyDays('sixMonths') }),
        getCompletionLogs(user.uid),
      ]).then(
        ([appData, allLogs]) => {
          setApps(appData);
          setLogs(allLogs);
          setFriction(buildFrictionOverview(allLogs, getTodayString()));
          setError(null);
        },
        (e) => setError(String(e?.message ?? e))
      );
    }, [user])
  );

  // A dot on every day with a check-in; tapping a day opens it.
  const marked: Record<string, { marked: boolean; dotColor: string }> = {};
  for (const log of logs) marked[log.date] = { marked: true, dotColor: Colors.secondary };
  const onDayPress = (day: DateData) => navigation.navigate('DayDetail', { date: day.dateString });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
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
              <Text style={styles.muted}>Couldn’t load: {error}</Text>
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
  muted: { ...TextStyles.subhead, color: Colors.gray },
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

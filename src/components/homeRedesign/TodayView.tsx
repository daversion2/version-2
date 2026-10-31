import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import type { CompletionLog } from '../../types';
import type { TodayAppId } from '../../services/appCheckins';
import { buildHomeDashboard, HomeDashboard } from '../../services/homeDashboard';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { formatDayHeader } from '../../utils/date';
import { AppRings } from '../common/ProgressRing';
import { ListGroup, ListRow } from '../common/ListGroup';
import { APP_ICONS } from '../homeDashboard/DashboardParts';

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
  onRefresh?: () => Promise<void> | void;
  onOpenAppPage: (appId: TodayAppId) => void;
  /** Opens the screen intro (the ⓘ). */
  onInfo: () => void;
  /** Above the rings: the rule banner. */
  top?: React.ReactNode;
  xp: number;
  /** Last night's plan as one sentence, while it's still to do. */
  plan: string | null;
  closeOut: { title: string; subtitle: string; done: boolean; onPress: () => void };
  craving: { title: string; subtitle: string; onPress: () => void };
}

export const TodayView: React.FC<Props> = ({
  userId,
  logs,
  logsReady,
  onDashboard,
  onRefresh,
  onOpenAppPage,
  onInfo,
  top,
  xp,
  plan,
  closeOut,
  craving,
}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [appData, setAppData] = useState<HomeAppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    () =>
      loadHomeAppData(userId).then(
        (data) => (setAppData(data), setError(null)),
        (e) => setError(String(e?.message ?? e))
      ),
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
    () => (appData && logsReady ? buildHomeDashboard({ ...appData, logs }) : null),
    [appData, logs, logsReady]
  );
  useEffect(() => {
    if (d) onDashboard?.(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const ringOf = (id: TodayAppId) => d?.rings.find((r) => r.appId === id);

  return (
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
          {error ? <Text style={styles.muted}>Couldn’t load: {error}</Text> : <ActivityIndicator color={Colors.primary} />}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.ringsRow}>
              <AppRings
                rings={APP_ORDER.map((id) => ({ pct: ringOf(id)?.pct ?? 0, color: AppColors[id] }))}
                accessibilityLabel={`Last 7 days: ${APP_ORDER.map(
                  (id) => `${APP_TITLES[id]} ${ringOf(id)?.done ?? 0} of ${ringOf(id)?.goal ?? 0}`
                ).join(', ')}`}
              />
              <View style={styles.legend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                {APP_ORDER.map((id) => (
                  <View key={id} style={styles.legendItem}>
                    <View style={styles.legendLabel}>
                      <View style={[styles.legendDot, { backgroundColor: AppColors[id] }]} />
                      <Text style={styles.legendName}>{APP_TITLES[id]}</Text>
                    </View>
                    <Text style={styles.legendValue}>
                      {ringOf(id)?.done ?? 0}
                      <Text style={styles.legendGoal}> / {ringOf(id)?.goal ?? 0}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>
                <Text style={styles.strong}>
                  {d.combinedStreak > 0 ? `${d.combinedStreak}-day streak` : 'No streak yet'}
                </Text>
                {` · ${xp.toLocaleString()} XP · last 7 days`}
              </Text>
            </View>
          </View>

          {plan ? (
            <View style={styles.card}>
              <Text style={styles.planLabel}>Today’s plan</Text>
              <Text style={styles.planText}>{plan}</Text>
            </View>
          ) : null}

          <ListGroup title="Your apps">
            {APP_ORDER.map((id) => (
              <ListRow
                key={id}
                title={APP_TITLES[id]}
                icon={{ name: APP_ICONS[id] as never, color: AppColors[id] }}
                onPress={() => onOpenAppPage(id)}
              />
            ))}
          </ListGroup>

          <ListGroup>
            <ListRow
              title={closeOut.title}
              subtitle={closeOut.subtitle}
              icon={{ name: closeOut.done ? 'checkmark' : 'moon', color: closeOut.done ? Colors.primary : Colors.gray }}
              onPress={closeOut.onPress}
            />
            <ListRow
              title={craving.title}
              subtitle={craving.subtitle}
              icon={{ name: 'flash', color: Colors.secondary }}
              onPress={craving.onPress}
            />
          </ListGroup>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerText: { gap: 2 },
  date: { ...TextStyles.footnote, fontWeight: '600', letterSpacing: 0.3, color: Colors.gray },
  title: { ...TextStyles.largeTitle, color: Colors.dark },
  infoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  muted: { ...TextStyles.subhead, color: Colors.gray },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 20, gap: Spacing.md },
  ringsRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  legend: { flex: 1, gap: 12 },
  legendItem: { gap: 1 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { ...TextStyles.footnote, fontWeight: '500', color: Colors.label2 },
  legendValue: { ...TextStyles.title2, fontWeight: '600', color: Colors.dark },
  legendGoal: { ...TextStyles.subhead, fontWeight: '500', color: Colors.gray },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator, paddingTop: 14 },
  footerText: { ...TextStyles.subhead, color: Colors.label2 },
  strong: { fontWeight: '600', color: Colors.dark },
  planLabel: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray, marginBottom: -12 },
  planText: { ...TextStyles.headline, color: Colors.dark },
});

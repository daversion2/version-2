import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import type { HomeStackParamList } from '../../types/navigation';
import type { CompletionLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TODAY_APPS } from '../../services/appCheckins';
import {
  addDays,
  buildHomeDashboard,
  describeFriction,
  describeVsPrior,
  recentDayLabel,
} from '../../services/homeDashboard';
import { HomeAppData, loadHomeAppData } from '../../services/homeDashboardLoad';
import { fetchAllNudgeLogs } from '../../services/practices';
import { MODES } from '../../services/meditateMath';
import { formatVolume } from '../../services/workoutMath';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { DayDots, DotTrend, ServingsHeatmap } from '../../components/homeDashboard/DashboardParts';
import { APP_TITLES } from '../../components/homeRedesign/TodayView';

// =============================================================================
// AN APP'S PAGE (redesign only; canvas "Meditate" / "Workouts" / "Meals").
// Opened from a row on the redesigned Today. One big number, its chart, the
// week's details, and a button that starts the app. Same numbers the old
// Today's swipe pages showed (services/homeDashboard.ts).
//
// Start goes back to Today before opening the app, so the session's hand-back
// (the rating sheet, services/miniApps.ts) lands on Today as it always has.
// =============================================================================

type Props = NativeStackScreenProps<HomeStackParamList, 'AppPage'>;

const START_LABEL = { meditate: 'Start a session', workouts: 'Start a workout', meals: 'Log a meal' } as const;

export const AppPageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [data, setData] = useState<{ app: HomeAppData; logs: CompletionLog[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      loadHomeAppData(user.uid)
        .then(async (app) => ({ app, logs: await fetchAllNudgeLogs(user.uid, addDays(app.today, -20)) }))
        .then(
          (loaded) => (setData(loaded), setError(null)),
          (e) => setError(String(e?.message ?? e))
        );
    }, [user])
  );

  const d = useMemo(() => (data ? buildHomeDashboard({ ...data.app, logs: data.logs }) : null), [data]);

  const start = () => {
    const target = TODAY_APPS.find((a) => a.id === appId)?.route;
    navigation.goBack();
    if (target) navigation.dispatch(CommonActions.navigate({ name: target }));
  };

  const today = data?.app.today ?? '';
  const friction = d ? describeFriction(d.friction[appId]) ?? 'No ratings yet' : '';

  const body = () => {
    if (!d || !data) return null;
    if (appId === 'meditate') {
      const m = d.meditate;
      return (
        <>
          <Hero
            label="Last 7 days"
            value={`${m.minutes}`}
            unit=" min"
            line={describeVsPrior(m.minutes, m.priorMinutes, 'min') ?? 'Nothing yet this week'}
            note={m.lastSessionMinutes !== null ? `Last session: ${m.lastSessionMinutes} min` : undefined}
          />
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Minutes per session</Text>
            <DotTrend values={m.series} label="Your last 8 sessions" empty="No sessions yet." />
          </View>
          <ListGroup title="This week">
            <ListRow title="Streak" value={`${m.streakDays} ${m.streakDays === 1 ? 'day' : 'days'}`} />
            <ListRow title="Goal" value={`${m.sessions} of ${m.goal} sessions`} />
            <ListRow title="How hard to start" subtitle={friction} />
          </ListGroup>
          {m.recent.length > 0 && (
            <ListGroup title="Recent">
              {m.recent.map((s, i) => (
                <ListRow
                  key={i}
                  title={MODES[s.mode].label}
                  value={`${recentDayLabel(s.date, today)} · ${s.minutes} min`}
                />
              ))}
            </ListGroup>
          )}
        </>
      );
    }
    if (appId === 'workouts') {
      const w = d.workouts;
      return (
        <>
          <Hero
            label="Volume, last 7 days"
            value={formatVolume(w.volumeKg, data.app.unit)}
            line={
              w.volumeChangePct === null
                ? 'Total volume lifted'
                : `${w.volumeChangePct >= 0 ? 'Up' : 'Down'} ${Math.abs(w.volumeChangePct)}% on the 7 days before`
            }
            note={w.standout ? `${w.standout.name}: ${w.standout.line}` : undefined}
          />
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Volume per session</Text>
            <DotTrend values={w.series} label="Your last 8 sessions" empty="No sessions yet." />
          </View>
          <ListGroup title="This week">
            <ListRow title="Streak" value={`${w.streakWeeks} ${w.streakWeeks === 1 ? 'week' : 'weeks'}`} />
            <ListRow title="Goal" value={`${w.sessions} of ${w.goal} sessions`} />
            <ListRow title="The week before" value={`${w.priorSessions} sessions`} />
            <ListRow title="How hard to start" subtitle={friction} />
          </ListGroup>
          {(w.week.length > 0 || w.phaseLine) && (
            <ListGroup title={w.phaseLine ? `Sessions · ${w.phaseLine}` : 'Sessions'}>
              {w.week.map((s, i) => (
                <ListRow key={i} title={s.name} value={`${recentDayLabel(s.date, today)} · ${s.sets} sets`} />
              ))}
            </ListGroup>
          )}
        </>
      );
    }
    const m = d.meals;
    return (
      <>
        <Hero
          label="Average plate score, last 7 days"
          value={m.averageScore === null ? '–' : `${m.averageScore}`}
          unit={m.averageScore === null ? undefined : ' / 100'}
          line={
            m.averageScore === null
              ? 'No plates logged yet'
              : m.priorAverageScore === null
              ? 'Every plate in the last 7 days'
              : describeVsPrior(m.averageScore, m.priorAverageScore, 'pts') ?? ''
          }
          note={`${m.onTarget} of 7 days on target (${m.threshold}+)`}
        />
        <View style={styles.card}>
          <Text style={styles.cardLabel}>What you ate</Text>
          <ServingsHeatmap servings={m.servings} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Day by day</Text>
          <DayDots days={m.days} threshold={m.threshold} />
        </View>
        <ListGroup title="This week">
          <ListRow title="Streak" value={`${m.streakDays} ${m.streakDays === 1 ? 'day' : 'days'}`} />
          <ListRow title="How hard to start" subtitle={friction} />
        </ListGroup>
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: tabBarHeight + 52 + Spacing.xl },
        ]}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          <Text style={styles.backText}>Today</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          {APP_TITLES[appId]}
        </Text>
        {!d ? (
          <View style={styles.loading}>
            {error ? <Text style={styles.muted}>Couldn’t load: {error}</Text> : <ActivityIndicator color={Colors.primary} />}
          </View>
        ) : (
          body()
        )}
      </ScrollView>
      <View style={[styles.startWrap, { bottom: tabBarHeight + Spacing.md }]}>
        <TouchableOpacity style={styles.start} onPress={start} accessibilityRole="button">
          <Text style={styles.startText}>{START_LABEL[appId]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Hero: React.FC<{ label: string; value: string; unit?: string; line: string; note?: string }> = ({
  label,
  value,
  unit,
  line,
  note,
}) => (
  <View style={styles.card}>
    <View style={styles.heroText}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.heroValue}>
        {value}
        {unit ? <Text style={styles.heroUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.heroLine}>{line}</Text>
      {note ? <Text style={styles.muted}>{note}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, marginLeft: -6 },
  backText: { ...TextStyles.body, color: Colors.primary },
  title: { ...TextStyles.largeTitle, color: Colors.dark, paddingHorizontal: 4, marginTop: -14 },
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 20, gap: Spacing.md },
  cardLabel: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray },
  heroText: { gap: 2 },
  heroValue: { fontFamily: TextStyles.largeTitle.fontFamily, fontSize: 48, lineHeight: 54, fontWeight: '700', color: Colors.dark },
  heroUnit: { ...TextStyles.title3, color: Colors.gray },
  heroLine: { ...TextStyles.subhead, color: Colors.label2 },
  muted: { ...TextStyles.subhead, color: Colors.gray },
  startWrap: { position: 'absolute', left: Spacing.md, right: Spacing.md },
  start: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { ...TextStyles.headline, color: Colors.white },
});

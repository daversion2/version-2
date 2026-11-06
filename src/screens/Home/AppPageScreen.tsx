import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { listWorkouts } from '../../services/labWorkouts';
import { loadSessionDraft } from '../../services/miniAppDrafts';
import { StartAction, workoutStartAction } from '../../services/workoutUpNext';
import type { WorkoutSession, WorkoutsLaunch } from '../../types/workouts';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { TopScrim } from '../../components/common/TopScrim';
import { BarTrend, DayDots, DotTrend, ServingsTreemap } from '../../components/homeDashboard/DashboardParts';
import { APP_TITLES } from '../../components/homeRedesign/TodayView';
import { LoadError } from '../../components/homeRedesign/LoadError';
import { getTodayString } from '../../utils/date';

// =============================================================================
// AN APP'S PAGE (redesign only; canvas "Meditate" / "Workouts" / "Meals").
// Opened from a row on the redesigned Today. One big number, its chart, the
// week's details, and a button that starts the app. Same numbers the old
// Today's swipe pages showed (services/homeDashboard.ts).
//
// Start goes back to Today before opening the app, so the session's hand-back
// (the rating sheet, services/miniApps.ts) lands on Today as it always has.
// On Workouts, Start names the workout it opens (services/workoutUpNext.ts)
// and "Something else" opens Workouts' home instead.
// =============================================================================

type Props = NativeStackScreenProps<HomeStackParamList, 'AppPage'>;

/** The docked start bar: the 52pt button plus its padding above and below. */
const START_BAR_HEIGHT = 52 + Spacing.sm * 2;
/** The line under Workouts' button ("Phase 2, week 3 of 6 · Something else"). */
const START_META_HEIGHT = 32;

const START_LABEL = { meditate: 'Start a session', workouts: 'Start a workout', meals: 'Log a meal' } as const;

export const AppPageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<{ app: HomeAppData; logs: CompletionLog[] } | null>(null);
  const [error, setError] = useState(false);
  const [workoutStart, setWorkoutStart] = useState<StartAction | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const app = await loadHomeAppData(user.uid);
      const logs = await fetchAllNudgeLogs(user.uid, addDays(app.today, -20));
      setData({ app, logs });
      setError(false);
      if (appId === 'workouts') {
        // Only for the button's label: if either read fails, Start just opens Workouts.
        const [workouts, draft] = await Promise.all([
          listWorkouts(user.uid),
          loadSessionDraft<WorkoutSession>('workouts', user.uid).catch(() => null),
        ]).catch(() => [null, null] as const);
        setWorkoutStart(
          workouts
            ? workoutStartAction({
                draft: draft?.data,
                phase: app.phase,
                workouts,
                sessions: app.workoutSessions,
                today: app.today,
              })
            : null
        );
      }
    } catch (e) {
      console.warn('App page: loading failed:', e);
      setError(true);
    }
  }, [user, appId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Back in the app on a new day: the 7 days moved, so read again.
  const loadedDay = data?.app.today;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && loadedDay && loadedDay !== getTodayString()) reload();
    });
    return () => sub.remove();
  }, [loadedDay, reload]);

  const d = useMemo(() => (data ? buildHomeDashboard({ ...data.app, logs: data.logs }) : null), [data]);

  const start = (launch?: WorkoutsLaunch) => {
    const target = TODAY_APPS.find((a) => a.id === appId)?.route;
    navigation.goBack();
    if (target) navigation.dispatch(CommonActions.navigate({ name: target, params: launch ? { launch } : undefined }));
  };
  const startBarHeight = START_BAR_HEIGHT + (workoutStart ? START_META_HEIGHT : 0);

  const today = data?.app.today ?? '';
  const friction = d ? describeFriction(d.friction[appId]) ?? 'Not rated yet' : '';

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
            line={describeVsPrior(m.minutes, m.priorMinutes, 'min') ?? 'Nothing in the last 7 days'}
            note={m.lastSessionMinutes !== null ? `Last session: ${m.lastSessionMinutes} min` : undefined}
          />
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Minutes per session</Text>
            <DotTrend values={m.series} label="Your last 8 sessions" empty="No sessions yet." />
          </View>
          <ListGroup title="Last 7 days">
            <ListRow title="Streak" value={`${m.streakDays} ${m.streakDays === 1 ? 'day' : 'days'}`} />
            <ListRow title="Goal" value={`${m.sessions} of ${m.goal} sessions`} />
            <ListRow title="Your override" subtitle={friction} />
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
            <BarTrend
              values={w.series}
              label="Your last 8 sessions"
              empty="No sessions yet."
              formatValue={(kg) => formatVolume(kg, data.app.unit)}
            />
          </View>
          <ListGroup title="Last 7 days">
            <ListRow title="Streak" value={`${w.streakWeeks} ${w.streakWeeks === 1 ? 'week' : 'weeks'}`} />
            <ListRow title="Goal" value={`${w.sessions} of ${w.goal} sessions`} />
            <ListRow title="The 7 days before" value={`${w.priorSessions} ${w.priorSessions === 1 ? 'session' : 'sessions'}`} />
            <ListRow title="Your override" subtitle={friction} />
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
          note={`${m.loggedDates.length} of ${m.goal} days logged · ${m.onTarget} of 7 on target (${m.threshold}+)`}
        />
        <View style={styles.card}>
          <Text style={styles.cardLabel}>What you ate</Text>
          <ServingsTreemap servings={m.servings} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Day by day</Text>
          <DayDots days={m.days} threshold={m.threshold} />
        </View>
        <ListGroup title="Last 7 days">
          <ListRow title="Streak" value={`${m.streakDays} ${m.streakDays === 1 ? 'day' : 'days'}`} />
          <ListRow title="Your override" subtitle={friction} />
        </ListGroup>
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: startBarHeight + Spacing.lg },
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
            {error ? <LoadError onRetry={reload} /> : <ActivityIndicator color={Colors.primary} />}
          </View>
        ) : (
          body()
        )}
      </ScrollView>
      {/* Docked on the tab bar, solid, so the list never shows around the button.
          The tab bar isn't translucent, so this screen already ends at its top. */}
      <View style={styles.startBar}>
        <TouchableOpacity style={styles.start} onPress={() => start(workoutStart?.launch)} accessibilityRole="button">
          <Text style={styles.startText} numberOfLines={1}>
            {workoutStart?.label ?? START_LABEL[appId]}
          </Text>
        </TouchableOpacity>
        {workoutStart && (
          <View style={styles.startMeta}>
            <Text style={styles.startMetaText} numberOfLines={1}>
              {workoutStart.meta}
              {workoutStart.canChoose ? ' · ' : ''}
            </Text>
            {workoutStart.canChoose && (
              <TouchableOpacity onPress={() => start({ kind: 'home' })} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.startMetaLink}>Something else</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <TopScrim />
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
  startBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.lightGray,
  },
  start: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { ...TextStyles.headline, color: Colors.white, paddingHorizontal: Spacing.md },
  startMeta: {
    height: START_META_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMetaText: { ...TextStyles.footnote, color: Colors.gray, flexShrink: 1 },
  startMetaLink: { ...TextStyles.footnote, fontWeight: '600', color: Colors.primary },
});

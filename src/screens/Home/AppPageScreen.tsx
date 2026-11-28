import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
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
import { finishSession } from '../../services/miniApps';
import { StartAction, workoutStartAction } from '../../services/workoutUpNext';
import type { WorkoutSession, WorkoutsLaunch } from '../../types/workouts';
import type { WorkoutLogSheetProps } from '../Lab/experiments/workouts/components/WorkoutLogSheet';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { TopScrim } from '../../components/common/TopScrim';
import { BarTrend, DayDots, DotTrend, ServingsTreemap } from '../../components/homeDashboard/DashboardParts';
import { APP_TITLES } from '../../components/homeRedesign/TodayView';
import { LoadError } from '../../components/homeRedesign/LoadError';
import { getTodayString } from '../../utils/date';
import { Copy } from '../../components/common/Copy';
import { useCopy } from '../../context/CopyContext';

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
  const t = useCopy();
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

  // Back in the app on a new day: the 7 days (or the week) moved, so read again.
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

  // Log, beside Start: something already done, straight into the week
  // (services/workoutQuickLog.ts). The sheet is part of the Workouts app, so
  // it's required on first use, never at start-up.
  const [logOpen, setLogOpen] = useState(false);
  const [LogSheet, setLogSheet] = useState<React.ComponentType<WorkoutLogSheetProps> | null>(null);
  const openLog = () => {
    if (!LogSheet) {
      const { WorkoutLogSheet } = require('../Lab/experiments/workouts/components/WorkoutLogSheet');
      setLogSheet(() => WorkoutLogSheet);
    }
    setLogOpen(true);
  };
  const onLogged = ({ sessionId, durationSec }: { sessionId: string; durationSec: number }) => {
    setLogOpen(false);
    // Today asks both ratings (it happened before it was logged) and runs the celebration.
    finishSession({ appId: 'workouts', sessionId, ...(durationSec ? { durationSec } : {}) });
    navigation.goBack();
  };

  const today = data?.app.today ?? '';
  const notRated = t('appPage.notRated', 'Not rated yet');
  const friction = d ? describeFriction(d.friction[appId]) ?? notRated : '';
  const keepGoing = d && appId !== 'meals' ? describeFriction(d.keepGoing[appId]) ?? notRated : '';
  const mealsDay = d ? describeFriction(d.mealsDay) ?? notRated : '';
  /** `.one` / `.other` wording for a count, chosen here as the old ternaries did. */
  const plural = (key: string, one: string, other: string, n: number) =>
    t(`${key}.${n === 1 ? 'one' : 'other'}`, n === 1 ? one : other, { n });

  const body = () => {
    if (!d || !data) return null;
    if (appId === 'meditate') {
      const m = d.meditate;
      return (
        <>
          <Hero
            label={t('appPage.last7', 'Last 7 days')}
            value={`${m.minutes}`}
            unit={t('appPage.minUnit', ' min')}
            line={
              describeVsPrior(m.minutes, m.priorMinutes, 'min') ??
              t('appPage.meditate.nothing', 'Nothing in the last 7 days')
            }
            note={
              m.lastSessionMinutes !== null
                ? t('appPage.meditate.last', 'Last session: {n} min', { n: m.lastSessionMinutes })
                : undefined
            }
          />
          <View style={styles.card}>
            <Copy id="appPage.meditate.perSession" style={styles.cardLabel}>{'Minutes per session'}</Copy>
            <DotTrend
              values={m.series}
              label={t('appPage.last8', 'Your last 8 sessions')}
              empty={t('appPage.noSessions', 'No sessions yet.')}
            />
          </View>
          <ListGroup title={t('appPage.thisWeek', 'This week')}>
            <ListRow
              title={t('appPage.goal', 'Goal')}
              value={t('appPage.sessionsOfGoal', '{sessions} of {goal} sessions', { sessions: m.sessions, goal: m.goal })}
            />
          </ListGroup>
          <ListGroup title={t('appPage.last7', 'Last 7 days')}>
            <ListRow
              title={t('appPage.streak', 'Streak')}
              value={plural('appPage.days', '{n} day', '{n} days', m.streakDays)}
            />
          </ListGroup>
          <ListGroup title={t('appPage.override', 'Your override · last 7 days')}>
            <ListRow title={t('appPage.gettingStarted', 'Getting started')} subtitle={friction} />
            <ListRow title={t('appPage.stayingWithIt', 'Staying with it')} subtitle={keepGoing} />
          </ListGroup>
          {m.recent.length > 0 && (
            <ListGroup title={t('appPage.recent', 'Recent')}>
              {m.recent.map((s, i) => (
                <ListRow
                  key={i}
                  title={MODES[s.mode].label}
                  value={t('appPage.dayMinutes', '{day} · {n} min', { day: recentDayLabel(s.date, today), n: s.minutes })}
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
            label={t('appPage.workouts.volumeLabel', 'Volume, last 7 days')}
            value={formatVolume(w.volumeKg, data.app.unit)}
            line={
              w.volumeChangePct === null
                ? t('appPage.workouts.volume', 'Total volume lifted')
                : t('appPage.workouts.volumeChange', '{dir} {pct}% on the 7 days before', {
                    dir: w.volumeChangePct >= 0 ? t('appPage.dirUp', 'Up') : t('appPage.dirDown', 'Down'),
                    pct: Math.abs(w.volumeChangePct),
                  })
            }
            note={w.standout ? `${w.standout.name}: ${w.standout.line}` : undefined}
          />
          <View style={styles.card}>
            <Copy id="appPage.workouts.perSession" style={styles.cardLabel}>{'Volume per session'}</Copy>
            <BarTrend
              values={w.series}
              label={t('appPage.last8', 'Your last 8 sessions')}
              empty={t('appPage.noSessions', 'No sessions yet.')}
              formatValue={(kg) => formatVolume(kg, data.app.unit)}
            />
          </View>
          <ListGroup title={t('appPage.thisWeek', 'This week')}>
            <ListRow
              title={t('appPage.goal', 'Goal')}
              value={t('appPage.sessionsOfGoal', '{sessions} of {goal} sessions', { sessions: w.sessions, goal: w.goal })}
            />
            <ListRow
              title={t('appPage.lastWeek', 'Last week')}
              value={plural('appPage.sessions', '{n} session', '{n} sessions', w.priorSessions)}
            />
            <ListRow
              title={t('appPage.streak', 'Streak')}
              value={plural('appPage.weeks', '{n} week', '{n} weeks', w.streakWeeks)}
            />
          </ListGroup>
          <ListGroup title={t('appPage.override', 'Your override · last 7 days')}>
            <ListRow title={t('appPage.gettingStarted', 'Getting started')} subtitle={friction} />
            <ListRow title={t('appPage.stayingWithIt', 'Staying with it')} subtitle={keepGoing} />
          </ListGroup>
          {(w.week.length > 0 || w.phaseLine) && (
            <ListGroup
              title={
                w.phaseLine
                  ? t('appPage.sessionsPhase', 'Sessions · {phase}', { phase: w.phaseLine })
                  : t('appPage.sessionsTitle', 'Sessions')
              }
            >
              {w.week.map((s, i) => (
                <ListRow
                  key={i}
                  title={s.name}
                  value={t('appPage.daySets', '{day} · {n} sets', { day: recentDayLabel(s.date, today), n: s.sets })}
                />
              ))}
            </ListGroup>
          )}
          <ListGroup>
            <ListRow
              title={t('appPage.workouts.week', 'Your week')}
              subtitle={t('appPage.workouts.weekSub', 'Day by day, every set, in Workouts')}
              icon={{ name: 'calendar-outline', color: AppColors.workouts }}
              onPress={() => start({ kind: 'week' })}
            />
          </ListGroup>
        </>
      );
    }
    const m = d.meals;
    return (
      <>
        <Hero
          label={t('appPage.meals.avgLabel', 'Average plate score, last 7 days')}
          value={m.averageScore === null ? '–' : `${m.averageScore}`}
          unit={m.averageScore === null ? undefined : t('appPage.meals.outOf', ' / 100')}
          line={
            m.averageScore === null
              ? t('appPage.meals.none', 'No plates logged yet')
              : m.priorAverageScore === null
              ? t('appPage.meals.every', 'Every plate in the last 7 days')
              : describeVsPrior(m.averageScore, m.priorAverageScore, 'pts') ?? ''
          }
          note={t(
            'appPage.meals.note',
            '{logged} of {goal} days logged this week · {onTarget} of the last 7 on target ({threshold}+)',
            { logged: m.loggedThisWeek, goal: m.goal, onTarget: m.onTarget, threshold: m.threshold }
          )}
        />
        <View style={styles.card}>
          <Copy id="appPage.meals.ate" style={styles.cardLabel}>{'What you ate'}</Copy>
          <ServingsTreemap servings={m.servings} />
        </View>
        <View style={styles.card}>
          <Copy id="appPage.meals.dayByDay" style={styles.cardLabel}>{'Day by day'}</Copy>
          <DayDots days={m.days} threshold={m.threshold} />
        </View>
        <ListGroup title={t('appPage.last7', 'Last 7 days')}>
          <ListRow
            title={t('appPage.streak', 'Streak')}
            value={plural('appPage.days', '{n} day', '{n} days', m.streakDays)}
          />
          <ListRow title={t('appPage.meals.override', 'Your override')} subtitle={mealsDay} />
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
          <Copy id="appPage.back" style={styles.backText}>{'Today'}</Copy>
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
        <View style={styles.startRow}>
          <TouchableOpacity style={[styles.start, styles.startGrow]} onPress={() => start(workoutStart?.launch)} accessibilityRole="button">
            <Text style={styles.startText} numberOfLines={1}>
              {workoutStart?.label ?? t(`appPage.start.${appId}`, START_LABEL[appId])}
            </Text>
          </TouchableOpacity>
          {appId === 'workouts' && data && (
            <TouchableOpacity
              style={styles.log}
              onPress={openLog}
              accessibilityRole="button"
              accessibilityLabel="Log"
              accessibilityHint="Add something you’ve already done to this week"
            >
              <Copy id="appPage.log" style={styles.logText}>{'Log'}</Copy>
            </TouchableOpacity>
          )}
        </View>
        {workoutStart && (
          <View style={styles.startMeta}>
            <Text style={styles.startMetaText} numberOfLines={1}>
              {workoutStart.meta}
              {workoutStart.canChoose ? ' · ' : ''}
            </Text>
            {workoutStart.canChoose && (
              <TouchableOpacity onPress={() => start({ kind: 'home' })} accessibilityRole="button" hitSlop={8}>
                <Copy id="appPage.somethingElse" style={styles.startMetaLink}>{'Something else'}</Copy>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <TopScrim />
      {LogSheet && data && user && (
        <LogSheet
          visible={logOpen}
          userId={user.uid}
          sessions={data.app.workoutSessions}
          exercisesById={data.app.exercisesById}
          unit={data.app.unit}
          vt1={data.app.vt1}
          vt2={data.app.vt2}
          onLogged={onLogged}
          onCancel={() => setLogOpen(false)}
        />
      )}
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
  startRow: { flexDirection: 'row', gap: Spacing.sm + 2 },
  startGrow: { flex: 1 },
  log: {
    height: 52,
    minWidth: 96,
    borderRadius: 26,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logText: { ...TextStyles.headline, color: Colors.primary },
  startMeta: {
    height: START_META_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMetaText: { ...TextStyles.footnote, color: Colors.gray, flexShrink: 1 },
  startMetaLink: { ...TextStyles.footnote, fontWeight: '600', color: Colors.primary },
});

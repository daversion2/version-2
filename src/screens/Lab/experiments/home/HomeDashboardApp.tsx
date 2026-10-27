import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type { RootStackParamList } from '../../../../types/navigation';
import type { WeightUnit } from '../../../../types/workouts';
import { useAuth } from '../../../../context/AuthContext';
import {
  addDays,
  buildHomeDashboard,
  describeFriction,
  describeVsPrior,
  HomeDashboard,
} from '../../../../services/homeDashboard';
import { clampWeeklyGoal, TODAY_APPS, TodayAppId } from '../../../../services/appCheckins';
import { getMeditatePrefs, listMeditateSessions } from '../../../../services/labMeditate';
import {
  getWorkoutPrefs,
  listCustomExercises,
  listPhases,
  listSessions,
  mergeExerciseLibrary,
} from '../../../../services/labWorkouts';
import { getMealsPrefs, listMealsDays } from '../../../../services/labMeals';
import { rulesOf } from '../../../../services/mealsMath';
import { currentPhase } from '../../../../services/trainingPhases';
import { fetchAllNudgeLogs } from '../../../../services/practices';
import { MODES } from '../../../../services/meditateMath';
import { formatVolume } from '../../../../services/workoutMath';
import { formatShortDay, getTodayString } from '../../../../utils/date';
import {
  APP_ICONS,
  Chip,
  DayDots,
  DotTrend,
  ListRow,
  Ring,
  SectionLabel,
  ServingsHeatmap,
  StartButton,
  TINT,
  WeekGrid,
} from './DashboardParts';

// =============================================================================
// HOME DASHBOARD (Lab) — the new Home from docs/no-generic-habits-micro-apps.md:
// rings across the top, then Overview / Meditate / Workouts / Meals as pages
// you swipe between (or tap a tab). The rings shrink to one line once you
// scroll into a page. Numbers come from services/homeDashboard.ts.
// =============================================================================

type PageId = 'overview' | TodayAppId;
const PAGES: { id: PageId; title: string; icon: string }[] = [
  { id: 'overview', title: 'Overview', icon: 'grid-outline' },
  { id: 'meditate', title: 'Meditate', icon: APP_ICONS.meditate },
  { id: 'workouts', title: 'Workouts', icon: APP_ICONS.workouts },
  { id: 'meals', title: 'Meals', icon: APP_ICONS.meals },
];

const COLLAPSE_AT = 40;
const EXPAND_AT = 8;
const ROUTE: Record<TodayAppId, string> = Object.fromEntries(TODAY_APPS.map((a) => [a.id, a.route])) as Record<
  TodayAppId,
  string
>;

interface Loaded {
  data: HomeDashboard;
  unit: WeightUnit;
}

const load = async (uid: string): Promise<Loaded> => {
  const today = getTodayString();
  const [medSessions, medPrefs, wSessions, wPrefs, custom, phases, mealsPrefs, mealsDays, logs] = await Promise.all([
    listMeditateSessions(uid, 1000),
    getMeditatePrefs(uid),
    listSessions(uid, 300),
    getWorkoutPrefs(uid),
    listCustomExercises(uid),
    listPhases(uid),
    getMealsPrefs(uid),
    listMealsDays(uid, addDays(today, -89), today),
    fetchAllNudgeLogs(uid, addDays(today, -13)),
  ]);
  const data = buildHomeDashboard({
    today,
    meditateSessions: medSessions,
    meditateGoal: clampWeeklyGoal(medPrefs.weekly_goal, 'meditate'),
    workoutSessions: wSessions,
    workoutsGoal: clampWeeklyGoal(wPrefs.weekly_goal, 'workouts'),
    exercisesById: Object.fromEntries(mergeExerciseLibrary(custom).map((e) => [e.id, e])),
    unit: wPrefs.unit,
    phase: currentPhase(phases),
    mealsDays,
    mealsRules: rulesOf(mealsPrefs),
    logs,
  });
  return { data, unit: wPrefs.unit };
};

export const HomeDashboardApp: React.FC<NativeStackScreenProps<RootStackParamList, 'HomeDashboardApp'>> = ({
  navigation,
}) => {
  const { user, userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const offsets = useRef<Record<PageId, number>>({ overview: 0, meditate: 0, workouts: 0, meals: 0 });

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<PageId>('overview');
  const [collapsed, setCollapsed] = useState(false);

  const uid = user?.uid;
  // Reload on every return, so a session finished in an app shows up.
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      load(uid)
        .then((l) => live && (setLoaded(l), setError(null)))
        .catch((e) => live && setError(String(e?.message ?? e)));
      return () => {
        live = false;
      };
    }, [uid])
  );

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

  const goTo = (id: PageId, animated = true) => {
    const i = PAGES.findIndex((p) => p.id === id);
    pager.current?.scrollTo({ x: i * width, animated });
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
    const id = PAGES[Math.max(0, Math.min(PAGES.length - 1, i))].id;
    if (id !== page) {
      setPage(id);
      setCollapsedSmooth(offsets.current[id] > COLLAPSE_AT);
    }
  };

  const openApp = (appId: TodayAppId) => navigation.dispatch(CommonActions.navigate({ name: ROUTE[appId] }));

  // Lab screen: reachable only from Admin → Lab, and closed to everyone else here too.
  if (!user || !userProfile?.is_admin) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This isn’t available on this account.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pageBottom = { paddingBottom: Spacing.xxl + insets.bottom };
  const d = loaded?.data;
  const unit = loaded?.unit ?? 'lb';
  const collapsedLine: Record<PageId, string> = {
    overview: 'across Mind, Movement & Meals',
    meditate: d ? `Meditate · ${d.meditate.minutes} min` : 'Meditate',
    workouts: d ? `Workouts · ${d.workouts.sessions} of ${d.workouts.goal}` : 'Workouts',
    meals: d ? `Meals · ${d.meals.averageScore === null ? 'no plates yet' : `score ${d.meals.averageScore}`}` : 'Meals',
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.window}>Last 7 days</Text>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {PAGES.map((p) => {
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
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{p.title}</Text>
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
                <Text style={styles.strong}>{d.combinedStreak}-day streak</Text> · {collapsedLine[page]}
              </Text>
            </View>
          ) : (
            <View style={styles.rings}>
              <View style={styles.ringRow}>
                {d.rings.map((r) => (
                  <TouchableOpacity key={r.appId} style={styles.ringItem} onPress={() => goTo(r.appId)}>
                    <Ring
                      pct={r.pct}
                      label={`${PAGES.find((p) => p.id === r.appId)?.title}: ${r.done} of ${r.goal}`}
                    />
                    <Text style={styles.ringLabel}>{PAGES.find((p) => p.id === r.appId)?.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.insight}>
                <Text style={styles.strong}>
                  {d.combinedStreak > 0 ? `${d.combinedStreak}-day streak` : 'No streak yet'}
                </Text>{' '}
                across all three{d.insight ? ` · ${d.insight}` : ''}
              </Text>
            </View>
          ))}
      </View>

      {!d ? (
        <View style={styles.center}>
          {error ? <Text style={styles.muted}>Couldn’t load: {error}</Text> : <ActivityIndicator color={Colors.primary} />}
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
            style={{ width }}
            contentContainerStyle={[styles.page, pageBottom]}
            onScroll={onPageScroll('overview')}
            scrollEventThrottle={16}
          >
            <SectionLabel>Your week at a glance</SectionLabel>
            <WeekGrid grid={d.grid} />

            <SectionLabel>Open an app</SectionLabel>
            {(
              [
                ['meditate', 'Meditate', `${d.meditate.minutes} min · ${d.meditate.streakDays}-day streak`],
                [
                  'workouts',
                  'Workouts',
                  `${d.workouts.sessions} of ${d.workouts.goal} sessions · ${d.workouts.streakWeeks}-week streak`,
                ],
                [
                  'meals',
                  'Meals',
                  `${d.meals.averageScore === null ? 'No plates yet' : `Score ${d.meals.averageScore}`} · ${d.meals.onTarget} of 7 days on target`,
                ],
              ] as [TodayAppId, string, string][]
            ).map(([id, title, line]) => (
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
          </ScrollView>

          {/* Meditate */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={[styles.page, pageBottom]}
            onScroll={onPageScroll('meditate')}
            scrollEventThrottle={16}
          >
            <Text style={styles.hero}>
              {d.meditate.minutes} <Text style={styles.heroUnit}>min</Text>
            </Text>
            <Text style={styles.body}>
              {describeVsPrior(d.meditate.minutes, d.meditate.priorMinutes, 'min') ?? 'Nothing yet this week'}
            </Text>
            {d.meditate.lastSessionMinutes !== null && (
              <Text style={styles.muted}>Last session: {d.meditate.lastSessionMinutes} min</Text>
            )}
            <SectionLabel>Minutes per session</SectionLabel>
            <DotTrend values={d.meditate.series} label="Your last 8 sessions" empty="No sessions yet." />
            <View style={styles.chips}>
              <Chip text={`${d.meditate.streakDays}-day streak`} />
              <Chip text={`${d.meditate.sessions} of ${d.meditate.goal} sessions`} />
              <Chip text={describeFriction(d.friction.meditate) ?? 'No ratings yet'} />
            </View>
            {d.meditate.recent.length > 0 && <SectionLabel>Recent sessions</SectionLabel>}
            {d.meditate.recent.map((s, i) => (
              <ListRow key={i} cells={[formatShortDay(s.date), MODES[s.mode].label, `${s.minutes} min`]} />
            ))}
            <StartButton label="Start a session" onPress={() => openApp('meditate')} />
          </ScrollView>

          {/* Workouts */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={[styles.page, pageBottom]}
            onScroll={onPageScroll('workouts')}
            scrollEventThrottle={16}
          >
            <Text style={styles.hero}>{formatVolume(d.workouts.volumeKg, unit)}</Text>
            <Text style={styles.body}>
              {d.workouts.volumeChangePct === null
                ? 'Total volume lifted'
                : `Total volume ${d.workouts.volumeChangePct >= 0 ? 'up' : 'down'} ${Math.abs(
                    d.workouts.volumeChangePct
                  )}% on the 7 days before`}
            </Text>
            {d.workouts.standout && (
              <Text style={styles.muted}>
                {d.workouts.standout.name}: {d.workouts.standout.line}
              </Text>
            )}
            <SectionLabel>Volume per session</SectionLabel>
            <DotTrend values={d.workouts.series} label="Your last 8 sessions" empty="No sessions yet." />
            <View style={styles.chips}>
              <Chip text={`${d.workouts.streakWeeks}-week streak`} />
              <Chip text={`${d.workouts.sessions} of ${d.workouts.goal} sessions`} />
              <Chip text={`${d.workouts.priorSessions} the week before`} />
              <Chip text={describeFriction(d.friction.workouts) ?? 'No ratings yet'} />
            </View>
            {(d.workouts.week.length > 0 || d.workouts.phaseLine) && (
              <SectionLabel>
                This week{d.workouts.phaseLine ? ` · ${d.workouts.phaseLine}` : ''}
              </SectionLabel>
            )}
            {d.workouts.week.map((w, i) => (
              <ListRow key={i} cells={[formatShortDay(w.date), w.name, `${w.sets} sets`]} />
            ))}
            <StartButton label="Start a workout" onPress={() => openApp('workouts')} />
          </ScrollView>

          {/* Meals */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={[styles.page, pageBottom]}
            onScroll={onPageScroll('meals')}
            scrollEventThrottle={16}
          >
            {d.meals.averageScore === null ? (
              <Text style={styles.hero}>
                – <Text style={styles.heroUnit}>no plates logged yet</Text>
              </Text>
            ) : (
              <>
                <Text style={styles.hero}>
                  {d.meals.averageScore} <Text style={styles.heroUnit}>average score</Text>
                </Text>
                <Text style={styles.body}>
                  {d.meals.priorAverageScore === null
                    ? 'Every plate in the last 7 days, out of 100'
                    : describeVsPrior(d.meals.averageScore, d.meals.priorAverageScore, 'pts')}
                </Text>
              </>
            )}
            <Text style={styles.muted}>
              {d.meals.onTarget} of 7 days on target ({d.meals.threshold}+) ·{' '}
              {describeVsPrior(d.meals.onTarget, d.meals.priorOnTarget, 'days')?.toLowerCase() ??
                'none the week before'}
            </Text>
            <SectionLabel>What you ate</SectionLabel>
            <ServingsHeatmap servings={d.meals.servings} />
            <SectionLabel>Day by day</SectionLabel>
            <DayDots days={d.meals.days} threshold={d.meals.threshold} />
            <View style={styles.chips}>
              <Chip text={`${d.meals.streakDays}-day streak`} />
              <Chip text={describeFriction(d.friction.meals) ?? 'No ratings yet'} />
            </View>
            <StartButton label="Log a meal" onPress={() => openApp('meals')} />
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: Colors.lightGray },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  window: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    color: Colors.gray,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 4 },
  tabText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  tabTextOn: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  tabBar: { height: 2, alignSelf: 'stretch', borderRadius: 1, marginTop: 4, backgroundColor: 'transparent' },
  tabBarOn: { backgroundColor: Colors.primary },
  rings: { paddingVertical: Spacing.md },
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  ringItem: { alignItems: 'center', gap: 4 },
  ringLabel: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.gray },
  insight: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, textAlign: 'center', lineHeight: 17 },
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
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },
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

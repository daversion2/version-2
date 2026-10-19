import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { PracticeInstance } from '../../types';
import { activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveHabits, completePractice, logMirrorCompletion, fetchAllNudgeLogs, getHabitsStreaksFromLogs, ensureCuratedPractices, saveLogReflection } from '../../services/practices';
import { getTacticPattern, TacticPattern } from '../../services/tacticPatterns';
import { reconcileHabitReminders, cancelHabitReminder } from '../../services/habitReminders';
import { HabitStreakInfo } from '../../types';
import { PracticeCompletionInput } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { PracticeReflectionSheet, ReflectionInput } from '../../components/habits/PracticeReflectionSheet';
import { PracticeBriefingModal } from '../../components/habits/PracticeBriefingModal';
import { getPractice, getPracticeColor, formatCommitment } from '../../data/practices';
import {
  APP_TRACKING,
  TODAY_APPS,
  TodayAppId,
  appCheckinHabit,
  appIdFromCheckinId,
  habitTickedBy,
  lastAppCheckin,
} from '../../services/appCheckins';
import { TodayAppCard } from '../../components/home/TodayAppCard';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
import { ComebackModal } from '../../components/home/ComebackModal';
import { saveComebackLog } from '../../services/comebackLogs';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { selectHabitTidbit, recordTidbitShown, recordLearnMoreTap } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { getTodayString, toLocalDateString, formatRelativeDay } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { PlanDraft, getPlanForToday, isPlanDone, formatPlan } from '../../services/nightlyClose';
import { markPointsIntroSeen, incrementAppOpenCount } from '../../services/users';
import { ReflectionGrade } from '../../types';
import { RuleModal } from '../../components/common/RuleModal';
import { PushOptInModal } from '../../components/common/PushOptInModal';
import { registerForPushNotifications } from '../../services/notifications';
import { detailFor, CHIP_CAPTIONS } from '../../components/home/TodayHabitRow';
import { TodayRow } from '../../components/home/TodayRow';
import { TodayRowPanel } from '../../components/home/TodayRowPanel';
import { TodaySectionCard } from '../../components/home/TodaySectionCard';
import { QuickLogSheet } from '../../components/home/QuickLogSheet';
import { LogToast, LogToastContent } from '../../components/home/LogToast';
import { buildTodayList, sectionFor, weekDatesFor } from '../../services/habitPace';
import { buildTodaySectionViews, RowClass, TodayRow as TodayRowModel } from '../../services/todaySections';
import { buildQuickSheetInput, formatMetricValue, isNumericField, prefillMetrics } from '../../services/lastMetrics';
import { takeDetailedLogRequest, DetailedLogRequest } from '../../services/todayRequests';
import { displayStreak } from '../../services/streakDisplay';
import { purgeRemovedHabits } from '../../services/habitCleanup';
import { getHabitSection, sectionOfHabit } from '../../data/habitSections';
import { RESISTANCE_SCALE, TACTIC_GATE_RESISTANCE } from '../../constants/resistance';
import type { TrackingField } from '../../data/practices';
import { CompletionLog } from '../../types';
import { SkipReviewSheet } from '../../components/habits/SkipReviewSheet';
import {
  getPendingSkipReview,
  saveSkipReason,
  dismissSkipReview,
  completeSkipReview,
} from '../../services/skips';
import { PendingSkipReview } from '../../services/skipLogic';
import { RuleBanner } from '../../components/common/RuleBanner';
import { useRuleSurfaces } from '../../hooks/useRuleSurfaces';
import { CTA_TAB_TARGETS, RETIRED_CTA_SCREENS } from '../../types/rules';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro, ScreenIntroButton } from '../../components/common/ScreenIntro';
import { Copy } from '../../components/common/Copy';
import { useCopy } from '../../context/CopyContext';
import {
  canOpenMiniApp,
  checkinMetricsFor,
  MINI_APPS,
  SessionHandoff,
  takePendingFinish,
} from '../../services/miniApps';
import { getWorkoutPrefs } from '../../services/labWorkouts';
import { getMeditatePrefs } from '../../services/labMeditate';
import { resolveTemplateFields } from '../../data/habitTemplates';

type Props = HomeScreenProps<'HomeScreen'>;

/** What the quick sheet is open on. */
interface QuickLogTarget {
  habit: PracticeInstance;
  fields: TrackingField[];
  initialValues: Record<string, number>;
  /** Filled in when a mini-app handed back a finished session. */
  note?: string;
  /** Non-numeric answers a session already gave (Meditate's technique), saved with the rating. */
  extraMetrics?: Record<string, number | string>;
  /** A past session logged in an app: the day it happened. */
  date?: string;
  /** Meditate's mode, for which habit the session ticks. */
  mode?: string;
}

/** The habit's tracking fields: an app's own, the catalog's, or a custom habit's template. */
const trackingFor = (habit: PracticeInstance): TrackingField[] => {
  const appId = appIdFromCheckinId(habit.id);
  if (appId) return APP_TRACKING[appId];
  return getPractice(habit.practice_id)?.tracking ?? resolveTemplateFields({ template_id: habit.template_id }) ?? [];
};

/** Which section a habit — or an app's check-in habit — sits in. */
const sectionOf = (habit: PracticeInstance) =>
  TODAY_APPS.find((a) => appIdFromCheckinId(habit.id) === a.id)?.section ?? sectionOfHabit(habit);

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // First visit explains the screen; the ⓘ in the header brings it back.
  const intro = useScreenIntro('today', {
    navigation,
    side: 'left',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });
  const { user, userProfile, refreshProfile } = useAuth();
  const t = useCopy();
  const scrollViewRef = useRef<ScrollView>(null);

  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  // Last week's shortfalls, if any are still unanswered. See services/skipLogic.ts.
  const [skipReview, setSkipReview] = useState<PendingSkipReview | null>(null);
  // This week's nudge logs, kept in state so the Today list can be derived from
  // them and recompute when a habit is logged without waiting on a full reload.
  const [nudgeLogs, setNudgeLogs] = useState<CompletionLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [completingHabit, setCompletingHabit] = useState<PracticeInstance | null>(null);
  // True when the capture modal was opened by the card's "Log it" action — no
  // timer, and every question collapsed onto one screen.
  const [completingLogOnly, setCompletingLogOnly] = useState(false);
  // Day the capture modal opens on (YYYY-MM-DD). undefined = today.
  const [completingDate, setCompletingDate] = useState<string | undefined>(undefined);
  // A mini-app handed back a finished session: the capture opens locked to
  // today, with what the session measured (its duration, a technique) filled in.
  const [completingLockDate, setCompletingLockDate] = useState(false);
  const [completingMetrics, setCompletingMetrics] = useState<Record<string, number | string> | undefined>();
  const [pendingFinish, setPendingFinish] = useState<SessionHandoff | null>(null);
  // The apps are the main thing (services/appCheckins.ts): always on Today,
  // each as a check-in habit of its own with the weekly goal set in the app.
  const [appGoals, setAppGoals] = useState<Partial<Record<TodayAppId, number>>>({});
  const appHabits = useMemo(
    () =>
      TODAY_APPS.filter((a) => canOpenMiniApp(a.id, userProfile)).map((a) => appCheckinHabit(a.id, appGoals[a.id])),
    [appGoals, userProfile]
  );
  // False until the first habit fetch lands: the app cards draw at once, and
  // "Add a habit" must not flash under them while habits are still loading.
  const [habitsLoaded, setHabitsLoaded] = useState(false);
  // The habit whose briefing ("About" in a row's panel) is open.
  const [briefingHabit, setBriefingHabit] = useState<PracticeInstance | null>(null);
  // The one row whose panel is open. Single-valued on purpose: several open
  // panels turns the list back into a wall of controls.
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  // A tap on a plain habit: the quick sheet, amounts filled in from last time.
  const [quickLog, setQuickLog] = useState<QuickLogTarget | null>(null);
  // The everyday "+N XP" — the full celebration is kept for milestones.
  const [toast, setToast] = useState<LogToastContent | null>(null);
  // The habit page's "Log with details", waiting for the habit list to load.
  const [pendingDetailedLog, setPendingDetailedLog] = useState<DetailedLogRequest | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [celebrationMilestone, setCelebrationMilestone] = useState<string | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  // Muted "Logged for Yesterday" note on the celebration, for backfilled reps.
  const [celebrationContext, setCelebrationContext] = useState<string | null>(null);
  // Reopening the celebration after "Learn more" — render it already settled
  // instead of replaying the ring sweep.
  const [celebrationSkipIntro, setCelebrationSkipIntro] = useState(false);
  const [showReflectionBanner, setShowReflectionBanner] = useState(false);
  const [reflectedToday, setReflectedToday] = useState(false);
  const [todaysGrade, setTodaysGrade] = useState<ReflectionGrade | undefined>();
  const [todaysPlan, setTodaysPlan] = useState<PlanDraft | null>(null);

  // Habit tidbit state. The tidbit now renders inside the celebration card;
  // only the "Learn more" expansion is still its own surface.
  const [habitTidbit, setHabitTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [habitLearnMoreVisible, setHabitLearnMoreVisible] = useState(false);

  // Post-reward reflection. Holds the just-written log so the reflection can be
  // patched onto it, plus the habit's recent hard-rep playbook as context. Only
  // armed for reps that cleared TACTIC_GATE_RESISTANCE — an easy rep has nothing
  // to ask, so no reflect action is offered.
  const [reflectTarget, setReflectTarget] = useState<{
    logId: string;
    habitId: string;
    name: string;
    accent: string;
    /** What they just rated this rep — gates the "what helped you get started?" step. */
    resistance?: number;
  } | null>(null);
  const [reflectVisible, setReflectVisible] = useState(false);
  const [reflectPattern, setReflectPattern] = useState<TacticPattern | null>(null);

  // Points intro modal (one-time, first habit completion)
  const [pointsIntroVisible, setPointsIntroVisible] = useState(false);

  // The one-time Craving Crusher pointer went with the practices/craving tab
  // strip it pointed at — the tool now has a permanent card further down, so
  // there is no first-run discovery problem left to solve.
  //
  // The Training unlock moment (3 completions → Challenges + Avoidance Training)
  // went the same way when the Training tab was archived. Its state used to be
  // set here and could only be cleared by a modal rendered `visible={false}`, so
  // it latched anyModalActive on for the rest of the session and held every
  // rule-driven modal off-screen. The component survives at
  // components/common/TrainingUnlockModal.tsx for whenever that tab comes back;
  // restoring it means re-adding the state, the render, and the flag write.

  // Track app opens
  const appOpenTrackedRef = useRef(false);
  const remindersReconciledRef = useRef(false);
  const seedAttemptedRef = useRef(false);

  // Rule-driven surfaces (admin-configured modals/banners, evaluated on app open).
  // The modal is held while any bespoke modal is up so they never stack.
  //
  // EVERY modal this screen can show belongs in this list. Two were missing: the
  // first-visit ScreenIntro and the skip-review sheet, either of which could have
  // shared the screen with a rule modal. Neither pairing was reachable in
  // practice — both live rule modals need days of absence or day 30+, by which
  // point the Today intro is long seen — but the next intro id added would have
  // made it reachable, and nothing here would have flagged it.
  const anyModalActive =
    pointsIntroVisible ||
    celebrationVisible ||
    habitLearnMoreVisible ||
    reflectVisible ||
    intro.visible ||
    !!skipReview ||
    !!quickLog ||
    !!briefingHabit ||
    !!completingHabit;
  const {
    modalRule: ruleModalRule,
    modalVisible: ruleModalVisible,
    dismissModal: dismissRuleModal,
    bannerRule: ruleBannerRule,
    dismissBanner: dismissRuleBanner,
  } = useRuleSurfaces('app_open', anyModalActive);

  // A modal rule can name a bespoke component to open in the rule-modal slot
  // instead of the generic RuleModal: 'comeback' is the barrier → recommit flow,
  // 'push_optin' is the notification permission ask.
  const comebackRule = ruleModalRule?.content.component === 'comeback' ? ruleModalRule : null;
  const pushOptInRule = ruleModalRule?.content.component === 'push_optin' ? ruleModalRule : null;

  // Registering writes the token to the user doc, which flips the has_push_token
  // fact to 1 — so refresh the profile or this session keeps thinking it's 0.
  const handleEnablePush = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const token = await registerForPushNotifications(user.uid);
      if (!token) return false;
      await refreshProfile();
      return true;
    } catch (err) {
      console.warn('Push registration failed:', err);
      return false;
    }
  }, [user, refreshProfile]);

  // Rule modal CTA: dismiss, then follow the rule's target (screen or URL)
  const handleRuleModalCta = useCallback(() => {
    dismissRuleModal();
    const target = ruleModalRule?.content.cta_target;
    if (!target) return;
    try {
      if (target.type === 'url' && target.url) {
        Linking.openURL(target.url).catch((err) =>
          console.warn('Failed to open CTA URL:', err)
        );
      } else if (target.type === 'screen' && target.screen) {
        // A rule stored in Firestore can outlive the screen it points at, so
        // retired targets dismiss quietly rather than navigating nowhere.
        if (RETIRED_CTA_SCREENS.includes(target.screen)) return;
        if (CTA_TAB_TARGETS.includes(target.screen)) {
          navigation.getParent()?.navigate(target.screen as any);
        } else {
          navigation.navigate(target.screen as any);
        }
      }
    } catch (err) {
      console.warn('Failed to follow CTA target:', err);
    }
  }, [dismissRuleModal, ruleModalRule, navigation]);

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationVisible(false);
  }, []);

  const handleHabitLearnMore = useCallback(() => {
    if (user && habitTidbit) {
      recordLearnMoreTap(user.uid, habitTidbit.id).catch(() => {});
    }
    setCelebrationVisible(false);
    setHabitLearnMoreVisible(true);
  }, [user, habitTidbit]);

  const handleHabitLearnMoreClose = useCallback(() => {
    setHabitLearnMoreVisible(false);
    // Return to the celebration card when there's still a reflection on offer,
    // so reading the science doesn't cost you the chance to reflect. Nothing
    // pending → close out as before rather than adding a tap.
    if (reflectTarget) {
      setCelebrationSkipIntro(true);
      setCelebrationVisible(true);
    }
  }, [reflectTarget]);

  // Celebration → reflection. The log already exists, so the sheet patches it.
  const handleOpenReflection = useCallback(() => {
    setCelebrationVisible(false);
    setReflectVisible(true);
  }, []);

  const handleReflectionDone = useCallback(() => {
    setReflectVisible(false);
    setReflectTarget(null);
    setReflectPattern(null);
  }, []);

  const handleReflectionSave = useCallback(
    async (input: ReflectionInput) => {
      if (user && reflectTarget) {
        await saveLogReflection(user.uid, reflectTarget.logId, input);
      }
      handleReflectionDone();
    },
    [user, reflectTarget, handleReflectionDone]
  );



  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Refresh user profile so totalHabitsCompleted, flags, etc. are current.
      // Runs concurrently with the main fetch.
      refreshProfile().catch(() => {});

      // Once per session, BEFORE fetching habits so they show on the very first
      // load: ensure the full curated practice protocol is on the home. Creates
      // missing instances and reactivates removed ones — practices always live
      // on Home, with no add step.
      if (!seedAttemptedRef.current) {
        seedAttemptedRef.current = true;
        try {
          // The practice chosen during onboarding is seeded even if it isn't
          // one of the core three — "pick one, just one" has to mean the app
          // puts that one on Home.
          const { changed, deactivated } = await ensureCuratedPractices(
            user.uid,
            userProfile?.starting_practice_id ?? null
          );
          if (changed > 0) console.log(`[home] provisioned ${changed} curated practices`);
          // A retired practice is hidden everywhere, so its daily reminder
          // would otherwise keep firing with no way to turn it off in-app
          for (const h of deactivated) cancelHabitReminder(h).catch(() => {});
          // Money and the food habits Meals replaced are removed outright:
          // delete any copies (and their check-ins) still on the account.
          const purged = await purgeRemovedHabits(user.uid);
          for (const h of purged) cancelHabitReminder(h).catch(() => {});
        } catch (err) {
          console.warn('Failed to ensure curated practices:', err);
          seedAttemptedRef.current = false; // allow a retry on the next load
        }
      }

      // Home renders habits and nothing else, so it fetches habits and nothing
      // else. It used to also pull daily challenges, extended challenges and
      // willpower stats on every focus — four reads feeding an object no longer
      // rendered since the zoned layout was archived.
      const habitList = await getActiveHabits(user.uid);
      setHabits(habitList);
      setHabitsLoaded(true);
      // The apps' weekly goals, set inside each app. Defaults if unreadable.
      const [workoutPrefs, meditatePrefs] = await Promise.all([
        getWorkoutPrefs(user.uid).catch(() => null),
        getMeditatePrefs(user.uid).catch(() => null),
      ]);
      const goals = { workouts: workoutPrefs?.weekly_goal, meditate: meditatePrefs?.weekly_goal };
      setAppGoals(goals);
      const appHabitList = TODAY_APPS.filter((a) => canOpenMiniApp(a.id, userProfile)).map((a) =>
        appCheckinHabit(a.id, goals[a.id as keyof typeof goals])
      );
      // Once per session: schedule any enabled reminders that aren't scheduled yet
      // (e.g. saved before reminders shipped, or while permission was denied).
      if (!remindersReconciledRef.current && user) {
        remindersReconciledRef.current = true;
        reconcileHabitReminders(user.uid, habitList).catch(() => {});
      }

      // Streak-break comeback check-in now fires via the rules engine
      // ("Comeback check-in" rule, app_open) — see the comebackRule block above.

      // Fetch nudge logs once — the Today list, the week strips and the streaks
      // are all derived from them. Windowed to the last 120 days so the read
      // stays flat as history grows; the only casualty is that a current streak
      // longer than the window displays capped at it.
      const logWindowStart = new Date();
      logWindowStart.setDate(logWindowStart.getDate() - 120);
      let cachedNudgeLogs: Awaited<ReturnType<typeof fetchAllNudgeLogs>> = [];
      try {
        cachedNudgeLogs = await fetchAllNudgeLogs(user.uid, toLocalDateString(logWindowStart));
        setNudgeLogs(cachedNudgeLogs);
        const todayStr = getTodayString();
        if (habitList.length > 0) {
          setHabitStreaks(getHabitsStreaksFromLogs(cachedNudgeLogs, habitList));
        }
        // Weekly skip review: did any habit fall short of its target LAST week?
        // buildPendingReview runs locally first and bails before any read when
        // nothing is short, so the common case costs nothing.
        try {
          setSkipReview(
            // Apps' weekly goals are reviewed like any habit's.
            await getPendingSkipReview(user.uid, [...habitList, ...appHabitList], cachedNudgeLogs, todayStr)
          );
        } catch (err) {
          console.warn('Skip review check failed:', err);
        }
      } catch (err) {
        console.warn('Nudge logs fetch failed:', err);
      }

      // Challenge maintenance. Home is the only screen that runs it, so it stays
      // even though Home no longer shows challenges — but it is fire-and-forget
      // now. Nothing on this screen reads the result, so awaiting it only
      // delayed the reflection check behind two writes.
      const maintenanceDay = getTodayString();
      expireStaleDailyChallenges(user.uid, maintenanceDay).catch((err) =>
        console.warn('Challenge expiry failed:', err)
      );
      activateScheduledChallenges(user.uid, maintenanceDay).catch((err) =>
        console.warn('Challenge activation failed:', err)
      );

      // Check nightly reflection status
      try {
        const todayStr = getTodayString();
        const [reflected, plan] = await Promise.all([
          hasReflectedToday(user.uid),
          getPlanForToday(user.uid, todayStr),
        ]);
        setReflectedToday(reflected);
        setTodaysPlan(plan);
        if (reflected) {
          const todayReflection = await getReflection(user.uid, todayStr);
          setTodaysGrade(todayReflection?.grade);
        }
        // Show prominent banner at 8pm+, always show at least the compact version
        setShowReflectionBanner(true);
      } catch (err) {
        console.warn('Reflection check failed:', err);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user, refreshProfile, userProfile?.starting_practice_id, userProfile?.is_admin]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Back from a mini-app with a finished session? See services/miniApps.ts.
      const handoff = takePendingFinish();
      if (handoff) setPendingFinish(handoff);
      // Back from a habit's page via "Log with details"? See services/todayRequests.ts.
      const detailed = takeDetailedLogRequest();
      if (detailed) setPendingDetailedLog(detailed);
    }, [loadData])
  );

  // The finished session's check-in: the quick sheet, with what the session
  // measured filled in, then the same handleHabitComplete as any check-in —
  // filed under the app itself (services/appCheckins.ts). Waits for the
  // mini-app's full-screen dismissal: iOS drops a modal presented while
  // another is still animating away.
  useEffect(() => {
    if (!pendingFinish) return;
    const habit = appHabits.find((h) => appIdFromCheckinId(h.id) === pendingFinish.appId);
    if (!habit) return;
    const tracking = trackingFor(habit);
    const measured = checkinMetricsFor(tracking, pendingFinish) ?? {};
    const numeric = tracking.filter(isNumericField);
    const fromSession: Record<string, number> = {};
    const extra: Record<string, number | string> = {};
    for (const [key, value] of Object.entries(measured)) {
      if (typeof value === 'number' && numeric.some((f) => f.key === key)) fromSession[key] = value;
      else extra[key] = value;
    }
    const timer = setTimeout(() => {
      setPendingFinish(null);
      setQuickLog({
        habit,
        fields: numeric,
        initialValues: { ...prefillMetrics(numeric, habit, nudgeLogs), ...fromSession },
        note: pendingFinish.date
          ? t('today.quick.forDay', 'Logging for {day}.', { day: formatRelativeDay(pendingFinish.date) })
          : t('today.quick.fromApp', 'From {app}.', { app: MINI_APPS[pendingFinish.appId].title }),
        extraMetrics: Object.keys(extra).length ? extra : undefined,
        date: pendingFinish.date,
        mode: pendingFinish.mode,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFinish, appHabits]);

  // "Log with details" from the habit's page: the full capture, after the
  // page's pop has finished animating.
  useEffect(() => {
    if (!pendingDetailedLog) return;
    const habit = habits.find((h) => h.id === pendingDetailedLog.habitId);
    if (!habit) return;
    const timer = setTimeout(() => {
      setPendingDetailedLog(null);
      handleHabitLogIt(habit);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDetailedLog, habits]);

  // Track app opens (once per session)
  useEffect(() => {
    if (appOpenTrackedRef.current || !user) return;
    appOpenTrackedRef.current = true;
    incrementAppOpenCount(user.uid).catch((err) =>
      console.warn('Failed to increment app open count:', err)
    );
  }, [user]);


  // The post-first-practice Debrief is currently disabled — it is neither
  // auto-navigated to nor surfaced by a banner. DebriefScreen and its route
  // are left intact so this can be switched back on.

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // "I already did it" — the same capture modal for every practice, briefing
  // and session beat skipped. Which flow you get is now the user's choice
  // rather than a function of whether the catalog carries briefing content.
  // `date` preselects a past day; the capture flow still lets them change it.
  const handleHabitLogIt = useCallback(
    (habit: PracticeInstance, date?: string) => {
      setCompletingLogOnly(true);
      setCompletingDate(date);
      setCompletingLockDate(false);
      // Amounts start at last time's, like the quick sheet.
      const filled = prefillMetrics(trackingFor(habit), habit, nudgeLogs);
      setCompletingMetrics(Object.keys(filled).length ? filled : undefined);
      setCompletingHabit(habit);
    },
    [nudgeLogs]
  );

  // A row's tap is always the quick route (or the app it opens) — never the
  // briefing. The briefing is "About" in the row's panel, behind the ›.

  /**
   * The one completion path. The capture sheet passes no `forHabit` and the
   * habit comes from `completingHabit`; the Today row's chips pass it directly,
   * because a quick log never opens the sheet and so never sets that state.
   *
   * Both routes land here on purpose — XP, streak, the celebration, the tidbit
   * and the hard-rep reflection offer are the same events whichever surface
   * produced the rep.
   */
  const handleHabitComplete = async (
    input: PracticeCompletionInput,
    forHabit?: PracticeInstance,
    opts?: { mode?: string }
  ) => {
    const habit = forHabit ?? completingHabit;
    if (!user || !habit) return;
    const { difficulty } = input;
    // Log + XP all happen in the shared completePractice path. A failure here
    // propagates to the capture flow, which re-arms its Log button and shows
    // the error — the follow-up celebration work below stays best-effort.
    const { logId, pointsEarned, streakBefore, firstTry, backdated, date, willpower: updateResult } =
      await completePractice(user.uid, { id: habit.id, name: habit.name }, input);
    try {
      // Neutral confirmation of which day the rep landed on. Not a bonus —
      // it goes in its own muted slot so backdating never looks rewarded.
      setCelebrationContext(
        backdated
          ? t('today.celebration.loggedFor', 'Logged for {day}', { day: formatRelativeDay(date) })
          : null
      );

      // Optimistically add the rep to the log set the Today list is derived
      // from, so the week strip fills, the row re-sorts and "done today" flips
      // immediately. Without this the list would stay stale until the next focus
      // reload, and logging a habit would appear to do nothing. Backdated reps
      // included — they still count toward the week they were filed under, and
      // the strip fills the day they were filed under rather than today.
      setNudgeLogs((prev) => [
        ...prev,
        {
          id: logId,
          user_id: user.uid,
          type: 'nudge',
          reference_id: habit.id,
          points: pointsEarned,
          difficulty: difficulty === 'easy' ? 1 : 2,
          resistance: input.resistance,
          resistance_scale: RESISTANCE_SCALE,
          // So the next quick sheet fills in what was just logged.
          metrics: input.metrics,
          completed_at: new Date().toISOString(),
          date,
        } as CompletionLog,
      ]);

      // An app session also ticks its matching habit (Workout, Meditation…):
      // a mirror log with no rating or XP, so the effort counts once, under the
      // app. Skipped if that habit is already logged for the day.
      const appId = appIdFromCheckinId(habit.id);
      const tickId = appId ? habitTickedBy(appId, habits, opts?.mode) : undefined;
      if (tickId && !nudgeLogs.some((l) => l.reference_id === tickId && l.date === date)) {
        logMirrorCompletion(user.uid, tickId, date, logId)
          .then((mirrorId) =>
            setNudgeLogs((prev) => [
              ...prev,
              {
                id: mirrorId,
                user_id: user.uid,
                type: 'nudge',
                reference_id: tickId,
                points: 0,
                difficulty: 0,
                date,
                mirror_of: logId,
                completed_at: new Date().toISOString(),
              } as CompletionLog,
            ])
          )
          .catch((err) => console.warn('Ticking the matching habit failed:', err));
      }

      setCompletingHabit(null);
      setQuickLog(null);
      // XP and the streak in the header live on the profile.
      refreshProfile().catch(() => {});

      // Arm the post-reward reflection against the log we just wrote, and warm
      // its "Your pattern" context in the background.
      const wasHard =
        typeof input.resistance === 'number' && input.resistance >= TACTIC_GATE_RESISTANCE;
      setReflectTarget(
        wasHard
          ? {
              logId,
              habitId: habit.id,
              name: habit.name,
              accent: getPracticeColor(habit),
              resistance: input.resistance,
            }
          : null
      );
      setReflectPattern(null);
      if (wasHard) {
        getTacticPattern(user.uid, habit.id).then(setReflectPattern).catch(() => {});
      }

      // One-time points intro on the first completion after onboarding. It no
      // longer short-circuits the reward: the celebration (and with it the
      // reflection offer) is staged below and opens when the intro is dismissed
      // — the first practice is exactly when reflecting is worth offering.
      const needsPointsIntro = !userProfile?.has_seen_points_intro;
      if (needsPointsIntro) {
        try {
          await markPointsIntroSeen(user.uid);
          await refreshProfile();
        } catch (err) {
          console.warn('Failed to mark points intro seen:', err);
        }
      }

      // The 3-completion Training unlock used to fire here. It was writing
      // has_seen_training_unlock — burning the one-time flag — for a modal that
      // has been rendered `visible={false}` since the Training tab was archived.
      // Nothing was shown and the flag is spent, so users who cross 3 completions
      // now keep an unspent flag and would get the moment properly if that tab
      // ever returns.

      // Crossing a streak tier goes into the celebration card's own slot rather
      // than a native Alert fired after it was dismissed. Same news, one surface.
      const milestoneLabel =
        updateResult.newTierReached && updateResult.tierInfo
          ? t('today.celebration.milestone', '{days}-day streak: {tier}', {
              days: updateResult.newStreak,
              tier: updateResult.tierInfo.tierName,
            })
          : null;

      // Everyday check-ins get the toast; the full celebration (and its
      // tidbit) is kept for milestones — a streak tier, or the first ever
      // check-in, which the points intro leads into.
      if (!needsPointsIntro && !milestoneLabel) {
        const level = typeof input.resistance === 'number' ? CHIP_CAPTIONS[input.resistance - 1] : undefined;
        const amounts = trackingFor(habit)
          .filter((f) => isNumericField(f) && typeof input.metrics?.[f.key] === 'number')
          .map((f) => formatMetricValue(f, input.metrics![f.key] as number));
        setToast({
          key: Date.now(),
          points: pointsEarned,
          text: [habit.name, ...amounts, level].filter(Boolean).join(' · '),
          context: backdated
            ? t('today.celebration.loggedFor', 'Logged for {day}', { day: formatRelativeDay(date) })
            : null,
          canAddNote: wasHard,
        });
        return;
      }

      // Fetch habit tidbit — staged now, shown after the celebration
      let tidbit: NeuroscienceTidbit | null = null;
      try {
        tidbit = await selectHabitTidbit(user.uid, {
          streakDays: streakBefore,
          habitName: habit.name,
          resistance: input.resistance,
          difficulty,
          // Coming back: the streak was broken, but they've done this habit
          // before — so it's a gap being closed, not a first attempt.
          isReturn: streakBefore === 0 && !firstTry,
        });
        if (tidbit) {
          await recordTidbitShown(user.uid, tidbit.id);
        }
      } catch (err) {
        console.warn('Failed to fetch habit tidbit:', err);
      }
      setHabitTidbit(tidbit);

      setEarnedPoints(pointsEarned);
      setCelebrationStreak(updateResult.newStreak);
      setCelebrationMilestone(milestoneLabel);
      setCelebrationSkipIntro(false);
      // The points intro goes first on the very first completion; dismissing it
      // opens the celebration staged above.
      if (needsPointsIntro) {
        setPointsIntroVisible(true);
      } else {
        setCelebrationVisible(true);
      }

      // No weekly-count refetch here any more: the optimistic nudge log above
      // is the same source the week strip and pace are derived from, so the
      // screen is already correct without another round-trip.
    } catch (e) {
      console.error(e);
    }
  };

  // Setting a habit's weekly commitment used to live here too, wired into the
  // archived section layout. It now belongs to the habit's own detail screen
  // (WeeklyGoalSheet), which is the only place that still offers it.

  // --- Derived view state ---

  // One clock reading per render, shared by the list, the week strips and the
  // hero — so a render that straddles midnight can't disagree with itself.
  const todayStr = getTodayString();

  // The Today list: every active habit, ordered by what needs attention. Derived
  // rather than stored, so an optimistic habit update reorders immediately.
  // The apps' check-in habits go through the same pace rule as habits.
  const todayList = useMemo(
    () => buildTodayList([...habits, ...appHabits], nudgeLogs, todayStr),
    [habits, appHabits, nudgeLogs, todayStr]
  );
  const habitsById = useMemo(
    () =>
      Object.fromEntries([...habits, ...appHabits].map((h) => [h.id, h])) as Record<string, PracticeInstance>,
    [habits, appHabits]
  );

  // Mind, Movement, Meals — see services/todaySections.ts.
  const sectionViews = useMemo(
    () =>
      buildTodaySectionViews(todayList, (habitId): RowClass | null => {
        const habit = habitsById[habitId];
        if (!habit) return null;
        const appId = appIdFromCheckinId(habitId);
        return { section: sectionOf(habit), kind: appId ? 'app' : 'plain', appId };
      }),
    [todayList, habitsById]
  );

  const weekDates = useMemo(() => weekDatesFor(todayStr), [todayStr]);
  const xp = userProfile?.totalWillpowerPoints ?? 0;
  const streak = displayStreak(userProfile?.currentStreak, userProfile?.lastActivityDate, todayStr);

  // Today's rating on a done row, e.g. "Med"; "This week" when the week's
  // target was met on another day.
  const doneLabelFor = (pace: TodayRowModel['pace']): string => {
    if (!pace.doneToday) return t('today.row.weekDone', 'This week');
    const todays = nudgeLogs.filter((l) => l.reference_id === pace.habitId && l.date === todayStr);
    const r = todays[todays.length - 1]?.resistance;
    return typeof r === 'number' && r >= 1 && r <= 3 ? CHIP_CAPTIONS[r - 1] : t('today.row.loggedToday', 'Logged today');
  };

  const openQuickLog = (habit: PracticeInstance) => {
    const fields = trackingFor(habit).filter(isNumericField);
    setQuickLog({ habit, fields, initialValues: prefillMetrics(fields, habit, nudgeLogs) });
  };

  // An app at the head of its section: its weekly goal, what you did last
  // time, and the way in. The whole card opens the app's own home screen.
  const renderApp = (row: TodayRowModel, sectionColor: string) => {
    const appId = row.appId as TodayAppId;
    const app = MINI_APPS[appId];
    const route = TODAY_APPS.find((a) => a.id === appId)!.route;
    const { pace } = row;
    const status = sectionFor(pace);
    const week = t('today.app.week', '{completed} of {target} this week', {
      completed: pace.completed,
      target: pace.target,
    });
    const goalLine = pace.doneToday ? t('today.app.doneToday', 'Done today · {week}', { week }) : week;
    const last = lastAppCheckin(appId, nudgeLogs);
    const lastMinutes = typeof last?.metrics?.duration_min === 'number' ? last.metrics.duration_min : undefined;
    const lastLine = last
      ? appId === 'meals'
        ? t('today.app.lastMeals', 'Last on-target day: {day}', { day: formatRelativeDay(last.date) })
        : lastMinutes
          ? t('today.app.lastWithMinutes', 'Last: {day} · {minutes} min', {
              day: formatRelativeDay(last.date),
              minutes: lastMinutes,
            })
          : t('today.app.last', 'Last: {day}', { day: formatRelativeDay(last.date) })
      : appId === 'meals'
        ? t('today.app.firstMeals', 'Log what was on your plate today.')
        : t('today.app.first', 'Nothing logged yet. Start your first session.');
    return (
      <TodayAppCard
        key={row.habitId}
        name={app.title}
        icon={app.icon}
        color={sectionColor}
        goalLine={goalLine}
        goalAlert={status === 'behind'}
        lastLine={lastLine}
        cta={appId === 'meals' ? t('today.app.open', 'Open') : t('today.app.start', 'Start')}
        // A root route, above the tabs — dispatch bubbles up to it.
        onOpen={() => navigation.dispatch(CommonActions.navigate({ name: route }))}
      />
    );
  };

  const renderRow = (row: TodayRowModel, index: number, sectionColor: string) => {
    const habit = habitsById[row.habitId];
    if (!habit) return null;
    const def = getPractice(habit.practice_id);
    const status = sectionFor(row.pace);
    // The status line ("1 of 3 · do 1 today"), else the amount committed to.
    const caption = detailFor(row.pace, t) ?? formatCommitment(def, habit.metric_goals);
    const done = status === 'done';
    // Habits never open an app: every row logs quickly. A briefing is "About"
    // in the row's panel, behind the ›.
    const onPress = () => openQuickLog(habit);
    return (
      <TodayRow
        key={row.habitId}
        first={index === 0}
        name={habit.name}
        caption={done ? null : caption}
        captionAlert={status === 'behind' || (status === 'due_today' && row.pace.missed > 0)}
        accentColor={sectionColor}
        done={done}
        doneLabel={done ? doneLabelFor(row.pace) : undefined}
        onPress={onPress}
        // The full check-in: day, notes, every field, amounts from last time.
        onLongPress={() => handleHabitLogIt(habit)}
        expanded={expandedHabitId === habit.id}
        onToggleExpand={() => setExpandedHabitId((prev) => (prev === habit.id ? null : habit.id))}
        panel={
          <TodayRowPanel
            name={habit.name}
            pace={row.pace}
            accentColor={sectionColor}
            weekDates={weekDates}
            today={todayStr}
            hasAbout={!!def?.ready}
            onLogDay={(date) => handleHabitLogIt(habit, date)}
            onAbout={() => setBriefingHabit(habit)}
            onLogDetails={() => handleHabitLogIt(habit)}
            onHistory={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
          />
        }
      />
    );
  };

  return (
    <View style={styles.screen}>
      {/*
        TODAY. One list of every active habit, ordered by what needs attention.

        The old zoned/customisable layout, the mantra section and the points
        hero are archived (see services/homeLayout.ts and SECTION_REGISTRY —
        both still exist and still compile). Craving Crusher survives as a card
        near the bottom rather than a peer tab: it's a tool you reach for in a
        moment, not a second thing this screen is about.
      */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <RuleBanner rule={ruleBannerRule} onDismiss={dismissRuleBanner} />

        {/* XP and the day streak, quietly. The ⓘ in the header explains the screen. */}
        <Text style={styles.stats}>
          {t('today.stats.xp', '{xp} XP', { xp: xp.toLocaleString() })}
          {streak >= 2 ? ` · ${t('today.stats.streak', '{days}-day streak', { days: streak })}` : ''}
        </Text>

        {/* Last night's if-then, shown until the habit it names is logged. The
            plan only works if it's in front of you when the cue arrives. */}
        {todaysPlan && !isPlanDone(todaysPlan, nudgeLogs, todayStr) && (
          <View style={styles.planCard}>
            <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
            <View style={styles.utilityText}>
              <Copy id="today.plan.label" style={styles.planLabel}>{'Today’s plan'}</Copy>
              <Text style={styles.planText}>{formatPlan(todaysPlan)}</Text>
            </View>
          </View>
        )}

        {/*
          Mind, Movement, Meals. Each section is one card: its app on top
          (always there), then the habits that need you today, with what isn't owed today and what's done
          folded into two links at the foot. A tap logs; press and hold opens
          the full check-in; the › opens the row's panel (week, About, Log
          details, History). See
          services/todaySections.ts.
        */}
        {sectionViews.map((view) => {
          const section = getHabitSection(view.id);
          const name = t(`today.section.name.${view.id}`, section.name);
          return (
            <TodaySectionCard
              key={view.id}
              name={name}
              color={section.color}
              apps={view.apps.map((r) => renderApp(r, section.color))}
              onAddHabit={habitsLoaded ? () => navigation.getParent()?.navigate('Library') : undefined}
              rows={view.rows.map((r, i) => renderRow(r, i, section.color))}
              weekRows={view.weekRows.map((r, i) => renderRow(r, i, section.color))}
              doneRows={view.doneRows.map((r, i) => renderRow(r, i, section.color))}
            />
          );
        })}

        {/* No "No habits yet" message: the apps are always here, and each
            section without habits has its own "Add a habit" link. */}

        {/*
          Close out the day. Answers a different question from the habit rows:
          resistance is per-habit and mechanical, this is per-day and
          interpretive, so they don't compete.

          ALWAYS visible, unlike the old version which only appeared after 5pm
          and only if you hadn't reflected. That gate made it a surprise element
          — fine when it lived inside a collapsible "Also today" section, wrong
          for the only route to a feature. Progress renders a weekly card from
          this data, so it needs a visible source.
        */}
        <TouchableOpacity
          style={styles.utilityCard}
          onPress={() => navigation.navigate('NightlyReflection')}
          activeOpacity={0.85}
        >
          <Ionicons
            name={reflectedToday ? 'checkmark-circle' : 'moon-outline'}
            size={20}
            color={reflectedToday ? Colors.primary : Colors.gray}
          />
          <View style={styles.utilityText}>
            {reflectedToday ? (
              <Copy id="today.close.titleDone" style={styles.utilityTitle}>
                {'Today’s reflection'}
              </Copy>
            ) : (
              <Copy id="today.close.title" style={styles.utilityTitle}>
                {'Close out the day'}
              </Copy>
            )}
            {reflectedToday ? (
              todaysGrade ? (
                <Copy
                  id="today.close.graded"
                  style={styles.utilitySubtitle}
                  vars={{ grade: todaysGrade }}
                >
                  {'You graded today a {grade}. Tap to review.'}
                </Copy>
              ) : (
                <Copy id="today.close.saved" style={styles.utilitySubtitle}>
                  {'Saved. Tap to review.'}
                </Copy>
              )
            ) : (
              <Copy id="today.close.subtitle" style={styles.utilitySubtitle}>
                {'Grade the effort, set tomorrow’s plan.'}
              </Copy>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>

        {/* Craving Crusher — an in-the-moment tool, kept below the habits. */}
        <TouchableOpacity
          style={styles.utilityCard}
          onPress={() => navigation.navigate('CravingCrusher')}
          activeOpacity={0.85}
        >
          <Ionicons name="flash-outline" size={20} color={Colors.secondary} />
          <View style={styles.utilityText}>
            <Copy id="today.craving.title" style={styles.utilityTitle}>
              {'Craving Crusher'}
            </Copy>
            <Copy id="today.craving.subtitle" style={styles.utilitySubtitle}>
              {'Ride out an urge without giving in.'}
            </Copy>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>

        {/*
          Two ways in, one tap apart. Browse leads, because the curated library
          with its science pages is the thing worth finding first — but someone
          who already knows what they want shouldn't have to scroll a list of 45
          to discover they can just type it.
        */}
        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.getParent()?.navigate('Library')}
            activeOpacity={0.7}
          >
            <Ionicons name="library-outline" size={18} color={Colors.primary} />
            <Copy id="today.add.browse" style={styles.addText}>{'Browse library'}</Copy>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateHabit')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Copy id="today.add.create" style={styles.addText}>{'Create your own'}</Copy>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weekly "what got in the way?" — one tap per habit that fell short. */}
      <SkipReviewSheet
        visible={!!skipReview}
        review={skipReview}
        onAnswer={async (item, reasonId) => {
          if (!user || !skipReview) return;
          await saveSkipReason(user.uid, {
            habitId: item.habitId,
            weekStart: skipReview.weekStart,
            missedCount: item.missed,
            reasonId,
          });
        }}
        onDismiss={async () => {
          const week = skipReview?.weekStart;
          // Close the sheet first: a dismiss that waits on a write feels broken.
          setSkipReview(null);
          if (user && week) {
            try {
              await dismissSkipReview(user.uid, week);
            } catch (err) {
              console.warn('Skip review dismiss failed:', err);
            }
          }
        }}
        onComplete={async () => {
          const week = skipReview?.weekStart;
          setSkipReview(null);
          if (user && week) {
            try {
              await completeSkipReview(user.uid, week);
            } catch (err) {
              console.warn('Skip review complete failed:', err);
            }
          }
        }}
      />

      <HabitCompletionModal
        visible={!!completingHabit}
        habitName={completingHabit?.name || ''}
        practiceId={completingHabit?.practice_id}
        // Custom habits have no catalog entry — their template comes from the
        // preset chosen at creation. Without this a custom habit would log
        // resistance and silently never ask for its metric.
        templateId={completingHabit?.template_id}
        metricGoals={completingHabit?.metric_goals}
        logOnly={completingLogOnly}
        initialDate={completingDate}
        lockDate={completingLockDate}
        initialMetrics={completingMetrics}
        onSubmit={handleHabitComplete}
        onCancel={() => setCompletingHabit(null)}
      />
      <QuickLogSheet
        visible={!!quickLog}
        habitName={quickLog?.habit.name ?? ''}
        sectionName={quickLog ? t(`today.section.name.${sectionOf(quickLog.habit)}`, getHabitSection(sectionOf(quickLog.habit)).name) : ''}
        sectionColor={quickLog ? getHabitSection(sectionOf(quickLog.habit)).color : Colors.primary}
        fields={quickLog?.fields ?? []}
        initialValues={quickLog?.initialValues ?? {}}
        note={quickLog?.note}
        onRate={async (resistance, values) => {
          if (!quickLog) return;
          const input = buildQuickSheetInput(resistance, values, quickLog.initialValues, quickLog.date);
          if (quickLog.extraMetrics) input.metrics = { ...quickLog.extraMetrics, ...input.metrics };
          try {
            await handleHabitComplete(input, quickLog.habit, { mode: quickLog.mode });
          } catch (err) {
            console.warn('Quick log failed:', err);
            showAlert(
              t('today.alert.quickLogFailed.title', "Couldn't log that"),
              t('today.alert.quickLogFailed.message', 'Check your connection and try again.')
            );
            throw err;
          }
        }}
        onCancel={() => setQuickLog(null)}
      />
      <LogToast
        toast={toast}
        onHide={() => setToast(null)}
        onAddNote={() => {
          setToast(null);
          setReflectVisible(true);
        }}
      />
      <PracticeBriefingModal
        visible={!!briefingHabit}
        practiceId={briefingHabit?.practice_id}
        habitId={briefingHabit?.id}
        userId={user?.uid}
        // "Log it" drops into the same full capture a press and hold opens.
        onStart={() => {
          const habit = briefingHabit;
          setBriefingHabit(null);
          if (habit) handleHabitLogIt(habit);
        }}
        onLearn={() => {
          const practiceId = briefingHabit?.practice_id;
          setBriefingHabit(null);
          if (practiceId) navigation.navigate('PracticeDetail', { practiceId, readOnly: true });
        }}
        onClose={() => setBriefingHabit(null)}
      />
      <HabitCelebrationModal
        visible={celebrationVisible}
        pointsEarned={earnedPoints}
        streakDays={celebrationStreak}
        milestoneLabel={celebrationMilestone}
        contextLabel={celebrationContext}
        tidbit={habitTidbit}
        onLearnMore={handleHabitLearnMore}
        onReflect={reflectTarget ? handleOpenReflection : undefined}
        skipIntro={celebrationSkipIntro}
        onDismiss={handleCelebrationDismiss}
      />
      <PracticeReflectionSheet
        visible={reflectVisible}
        practiceName={reflectTarget?.name || ''}
        accentColor={reflectTarget?.accent}
        tacticPattern={reflectPattern}
        resistance={reflectTarget?.resistance}
        onSave={handleReflectionSave}
        onSkip={handleReflectionDone}
      />
      <PointsIntroModal
        visible={pointsIntroVisible}
        onDismiss={() => {
          setPointsIntroVisible(false);
          // Hand off to the celebration staged by handleHabitComplete — this is
          // the first completion, so it's the one that most needs the reflect offer.
          setCelebrationVisible(true);
        }}
      />
      {/* The "Comeback check-in" rule fires the bespoke comeback/story flow in
          the rule-modal slot; every other modal rule gets the generic RuleModal. */}
      {comebackRule && (
      <ComebackModal
        visible={ruleModalVisible}
        habits={habits}
        title={comebackRule.content.title}
        body={comebackRule.content.body}
        onCommit={async (habitId, habitName, barrierReason) => {
          dismissRuleModal();
          if (!user) return;
          try {
            await saveComebackLog(user.uid, { barrierReason, committedHabitId: habitId, committedHabitName: habitName });
          } catch (err) {
            console.warn('Failed to save comeback commitment:', err);
          }
        }}
        onDismiss={dismissRuleModal}
      />
      )}
      {pushOptInRule && (
      <PushOptInModal
        visible={ruleModalVisible}
        title={pushOptInRule.content.title}
        body={pushOptInRule.content.body}
        ctaLabel={pushOptInRule.content.cta}
        onEnable={handleEnablePush}
        onDismiss={dismissRuleModal}
      />
      )}
      {!comebackRule && !pushOptInRule && (
      <RuleModal
        rule={ruleModalRule}
        visible={ruleModalVisible}
        onDismiss={dismissRuleModal}
        onCtaPress={handleRuleModalCta}
      />
      )}
      {habitTidbit && (
        <TidbitLearnMore
          visible={habitLearnMoreVisible}
          tidbit={habitTidbit}
          onClose={handleHabitLearnMoreClose}
        />
      )}
      <ScreenIntro intro={intro} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl * 2 },
  stats: { fontFamily: Fonts.secondaryBold, fontSize: 13, color: Colors.gray, marginLeft: Spacing.xs },
  sectionHeading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.gray,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  utilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  utilityText: { flex: 1, gap: 2 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  planLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  planText: { fontFamily: Fonts.secondary, fontSize: 15, color: Colors.dark, lineHeight: 21 },
  utilityTitle: { fontFamily: Fonts.primaryBold, fontSize: 16, color: Colors.dark },
  utilitySubtitle: { fontFamily: Fonts.secondary, fontSize: 13, color: Colors.gray },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  addText: { fontFamily: Fonts.primaryBold, fontSize: 14, color: Colors.primary },
});


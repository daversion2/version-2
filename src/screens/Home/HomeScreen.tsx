import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { PracticeInstance } from '../../types';
import { activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveHabits, fetchAllNudgeLogs, getHabitsStreaksFromLogs, saveLogReflection } from '../../services/practices';
import { rateAppSession } from '../../services/appRatings';
import { getTacticPattern, TacticPattern } from '../../services/tacticPatterns';
import { cancelScheduledHabitReminders } from '../../services/habitReminders';
import { HabitStreakInfo } from '../../types';
import { PracticeCompletionInput } from '../../types';
import { showAlert } from '../../utils/alert';
import { PracticeReflectionSheet, ReflectionInput } from '../../components/habits/PracticeReflectionSheet';
import {
  APP_TRACKING,
  TODAY_APPS,
  TodayAppId,
  appCheckinHabit,
  appCheckinId,
} from '../../services/appCheckins';
import { HomeDashboardView } from '../../components/homeDashboard/HomeDashboardView';
import { TodayView } from '../../components/homeRedesign/TodayView';
import { isRedesignOn } from '../../utils/redesign';
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
import { syncProfileActivity } from '../../services/appActivity';
import { HomeDashboard, ProfileActivity, profileActivityPatch } from '../../services/homeDashboard';
import { ReflectionGrade } from '../../types';
import { RuleModal } from '../../components/common/RuleModal';
import { PushOptInModal } from '../../components/common/PushOptInModal';
import { registerForPushNotifications } from '../../services/notifications';
import { CHIP_CAPTIONS } from '../../components/home/TodayHabitRow';
import { QuickLogSheet } from '../../components/home/QuickLogSheet';
import { LogToast, LogToastContent } from '../../components/home/LogToast';
import { buildQuickSheetInput, formatMetricValue, isNumericField, prefillMetrics } from '../../services/lastMetrics';
import { displayStreak } from '../../services/streakDisplay';
import { getHabitSection } from '../../data/habitSections';
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

type Props = HomeScreenProps<'HomeScreen'>;

/** What the quick sheet is open on. */
interface QuickLogTarget {
  appId: TodayAppId;
  fields: TrackingField[];
  initialValues: Record<string, number>;
  /** Filled in when a mini-app handed back a finished session. */
  note?: string;
  /** Non-numeric answers a session already gave (Meditate's technique), saved with the rating. */
  extraMetrics?: Record<string, number | string>;
  /** A past session logged in an app: the day it happened. */
  date?: string;
  /** The saved session this rating is for, when there is one. */
  sessionId?: string;
}

/** Mind, Movement or Meals — for the quick sheet's heading and colour. */
const sectionOfApp = (appId: TodayAppId) => TODAY_APPS.find((a) => a.id === appId)!.section;

const isTodayApp = (id: string): id is TodayAppId => TODAY_APPS.some((a) => a.id === id);

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // First visit explains the screen; the ⓘ in the header brings it back.
  // The redesign draws its own header (title + ⓘ) inside TodayView.
  const redesign = isRedesignOn();
  const intro = useScreenIntro('today', {
    navigation: redesign ? undefined : navigation,
    side: 'left',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });
  useLayoutEffect(() => {
    if (redesign) navigation.setOptions({ headerShown: false });
  }, [navigation, redesign]);
  const { user, userProfile, refreshProfile } = useAuth();
  const t = useCopy();

  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  // Last week's shortfalls, if any are still unanswered. See services/skipLogic.ts.
  const [skipReview, setSkipReview] = useState<PendingSkipReview | null>(null);
  // This week's nudge logs, kept in state so the Today list can be derived from
  // them and recompute when a habit is logged without waiting on a full reload.
  const [nudgeLogs, setNudgeLogs] = useState<CompletionLog[]>([]);
  // The dashboard waits for these: friction and the session counts read them.
  const [logsReady, setLogsReady] = useState(false);
  const [logsFailed, setLogsFailed] = useState(false);
  const [pendingFinish, setPendingFinish] = useState<SessionHandoff | null>(null);
  // The apps are the main thing (services/appCheckins.ts): always on Today,
  // each as a check-in habit of its own with the weekly goal set in the app.
  const [appGoals, setAppGoals] = useState<Partial<Record<TodayAppId, number>>>({});
  const appHabits = useMemo(
    () =>
      TODAY_APPS.filter((a) => canOpenMiniApp(a.id, userProfile)).map((a) => appCheckinHabit(a.id, appGoals[a.id])),
    [appGoals, userProfile]
  );
  // A tap on a plain habit: the quick sheet, amounts filled in from last time.
  const [quickLog, setQuickLog] = useState<QuickLogTarget | null>(null);
  // The dashboard's combined day streak (services/homeDashboard.ts), once loaded.
  const [dashStreak, setDashStreak] = useState<number | null>(null);
  const lastActivityPatchRef = useRef<string | null>(null);
  // The everyday "+N XP" — the full celebration is kept for milestones.
  const [toast, setToast] = useState<LogToastContent | null>(null);
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
    !!quickLog;
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

      // No habit seeding: habits were dropped (2026-10-31), and Today used to
      // add Meditation, Breathwork and Unplugged Cardio on every load.

      // Home renders habits and nothing else, so it fetches habits and nothing
      // else. It used to also pull daily challenges, extended challenges and
      // willpower stats on every focus — four reads feeding an object no longer
      // rendered since the zoned layout was archived.
      const habitList = await getActiveHabits(user.uid);
      setHabits(habitList);
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
      // Habit reminders were removed (2026-10-31). Once per session, cancel any
      // still scheduled on this device from before.
      if (!remindersReconciledRef.current) {
        remindersReconciledRef.current = true;
        cancelScheduledHabitReminders().catch(() => {});
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
        setLogsReady(true);
        const todayStr = getTodayString();
        if (habitList.length > 0) {
          setHabitStreaks(getHabitsStreaksFromLogs(cachedNudgeLogs, habitList));
        }
        // Weekly skip review: did any habit fall short of its target LAST week?
        // buildPendingReview runs locally first and bails before any read when
        // nothing is short, so the common case costs nothing.
        try {
          setSkipReview(
            // Only the apps: habits are off the screen, so every one would read as missed.
            await getPendingSkipReview(user.uid, appHabitList, cachedNudgeLogs, todayStr)
          );
        } catch (err) {
          console.warn('Skip review check failed:', err);
        }
      } catch (err) {
        console.warn('Nudge logs fetch failed:', err);
        setLogsFailed(true);
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
    }, [loadData])
  );

  // The finished session's rating: the quick sheet, with what the session
  // measured filled in, then handleAppRated (services/appRatings.ts). Waits
  // for the mini-app's full-screen dismissal: iOS drops a modal presented
  // while another is still animating away.
  useEffect(() => {
    if (!pendingFinish) return;
    const appId = pendingFinish.appId;
    if (!isTodayApp(appId) || !canOpenMiniApp(appId, userProfile)) return;
    const tracking = APP_TRACKING[appId];
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
        appId,
        fields: numeric,
        initialValues: { ...prefillMetrics(numeric, { id: appCheckinId(appId) }, nudgeLogs), ...fromSession },
        note: pendingFinish.date
          ? t('today.quick.forDay', 'Logging for {day}.', { day: formatRelativeDay(pendingFinish.date) })
          : t('today.quick.fromApp', 'From {app}.', { app: MINI_APPS[pendingFinish.appId].title }),
        extraMetrics: Object.keys(extra).length ? extra : undefined,
        date: pendingFinish.date,
        sessionId: pendingFinish.sessionId,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFinish, userProfile]);

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

  /**
   * The one rating path: an app session's "How hard was it to start?" from the
   * quick sheet. XP, streak, the celebration, the tidbit and the hard-session
   * reflection offer all start here.
   */
  const handleAppRated = async (input: PracticeCompletionInput, appId: TodayAppId, sessionId?: string) => {
    if (!user) return;
    const { difficulty } = input;
    const refId = appCheckinId(appId);
    const appName = MINI_APPS[appId].title;
    // A failure here propagates to the quick sheet, which re-arms its buttons
    // and shows the error — the follow-up celebration work below stays best-effort.
    const { logId, pointsEarned, streakBefore, firstTry, backdated, date, willpower: updateResult } =
      await rateAppSession(user.uid, appId, { ...input, sessionId });
    try {
      // Neutral confirmation of which day the rep landed on. Not a bonus —
      // it goes in its own muted slot so backdating never looks rewarded.
      setCelebrationContext(
        backdated
          ? t('today.celebration.loggedFor', 'Logged for {day}', { day: formatRelativeDay(date) })
          : null
      );

      // Optimistically add the rating to the logs the dashboard reads, so its
      // friction and counts move the moment it's made.
      // A reload that started before the rating can land after it, already
      // holding this log — so add it only if it isn't there yet.
      setNudgeLogs((prev) => prev.some((l) => l.id === logId) ? prev : [
        ...prev,
        {
          id: logId,
          user_id: user.uid,
          type: 'nudge',
          reference_id: refId,
          app_id: appId,
          ...(sessionId ? { session_id: sessionId } : {}),
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
              habitId: refId,
              name: appName,
              accent: getHabitSection(sectionOfApp(appId)).color,
              resistance: input.resistance,
            }
          : null
      );
      setReflectPattern(null);
      if (wasHard) {
        getTacticPattern(user.uid, refId).then(setReflectPattern).catch(() => {});
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
        const amounts = APP_TRACKING[appId]
          .filter((f) => isNumericField(f) && typeof input.metrics?.[f.key] === 'number')
          .map((f) => formatMetricValue(f, input.metrics![f.key] as number));
        setToast({
          key: Date.now(),
          points: pointsEarned,
          text: [appName, ...amounts, level].filter(Boolean).join(' · '),
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
          habitName: appName,
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

  const todayStr = getTodayString();
  const xp = userProfile?.totalWillpowerPoints ?? 0;
  // The dashboard's own day streak once it has loaded, so this line always
  // matches the rings; the stored one only until then.
  const streak = dashStreak ?? displayStreak(userProfile?.currentStreak, userProfile?.lastActivityDate, todayStr);

  // Keep the user doc in step with the apps: the stored streak (past days
  // only), and the counters the rules read. Written only when something moved.
  const onDashboard = (d: HomeDashboard) => {
    setDashStreak(d.combinedStreak);
    if (!user || !userProfile) return;
    // Cheap check against the profile on screen first; the transaction then
    // works the patch out again from the doc itself.
    if (!profileActivityPatch(d.activity, getTodayString(), userProfile as ProfileActivity)) return;
    const key = JSON.stringify(d.activity);
    if (key === lastActivityPatchRef.current) return;
    lastActivityPatchRef.current = key;
    syncProfileActivity(user.uid, d.activity, getTodayString())
      .then((wrote) => (wrote ? refreshProfile() : null))
      .catch((err) => console.warn('Saving app activity failed:', err));
  };

  // A root route, above the tabs — dispatch bubbles up to it.
  const openApp = (appId: TodayAppId) => {
    const route = TODAY_APPS.find((a) => a.id === appId)?.route;
    if (route) navigation.dispatch(CommonActions.navigate({ name: route }));
  };

  return (
    <View style={styles.screen}>
      {/*
        HOME. The dashboard (components/homeDashboard): rings, then Overview and
        a page per app. Habits are being dropped (docs/no-generic-habits-micro-apps.md),
        so there is no habit list. Everything a check-in sets off — the rating
        sheet, XP, the celebration, the weekly review, rule modals — still lives
        here, below.
      */}
      {user && redesign && (
        <TodayView
          userId={user.uid}
          logs={nudgeLogs}
          logsReady={logsReady || logsFailed}
          onDashboard={onDashboard}
          onRefresh={loadData}
          onOpenAppPage={(appId) => navigation.navigate('AppPage', { appId })}
          onInfo={intro.reopen}
          top={<RuleBanner rule={ruleBannerRule} onDismiss={dismissRuleBanner} />}
          xp={xp}
          plan={todaysPlan && !isPlanDone(todaysPlan, nudgeLogs, todayStr) ? formatPlan(todaysPlan) : null}
          closeOut={{
            done: reflectedToday,
            title: reflectedToday
              ? t('today.close.titleDone', 'Today’s reflection')
              : t('today.close.title', 'Close out the day'),
            subtitle: reflectedToday
              ? todaysGrade
                ? t('today.close.graded', 'You graded today a {grade}. Tap to review.', { grade: todaysGrade })
                : t('today.close.saved', 'Saved. Tap to review.')
              : t('today.close.subtitle', 'Grade the effort, set tomorrow’s plan.'),
            onPress: () => navigation.navigate('NightlyReflection'),
          }}
          craving={{
            title: t('today.craving.title', 'Craving Crusher'),
            subtitle: t('today.craving.subtitle', 'Ride out an urge without giving in.'),
            onPress: () => navigation.navigate('CravingCrusher'),
          }}
        />
      )}
      {user && !redesign && (
        <HomeDashboardView
          userId={user.uid}
          logs={nudgeLogs}
          // On a failed read the dashboard still draws, just without friction.
          logsReady={logsReady || logsFailed}
          onDashboard={onDashboard}
          onOpenApp={openApp}
          onRefresh={loadData}
          overviewTop={
            <>
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
            </>
          }
          overviewBottom={
            <>
              {/* Close out the day: always visible — it's the only way in, and
                  Progress renders a weekly card from it. */}
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

              {/* Craving Crusher — an in-the-moment tool. */}
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
            </>
          }
        />
      )}

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

      <QuickLogSheet
        visible={!!quickLog}
        habitName={quickLog ? MINI_APPS[quickLog.appId].title : ''}
        sectionName={
          quickLog
            ? t(`today.section.name.${sectionOfApp(quickLog.appId)}`, getHabitSection(sectionOfApp(quickLog.appId)).name)
            : ''
        }
        sectionColor={quickLog ? getHabitSection(sectionOfApp(quickLog.appId)).color : Colors.primary}
        fields={quickLog?.fields ?? []}
        initialValues={quickLog?.initialValues ?? {}}
        note={quickLog?.note}
        onRate={async (resistance, values) => {
          if (!quickLog) return;
          const input = buildQuickSheetInput(resistance, values, quickLog.initialValues, quickLog.date);
          if (quickLog.extraMetrics) input.metrics = { ...quickLog.extraMetrics, ...input.metrics };
          try {
            await handleAppRated(input, quickLog.appId, quickLog.sessionId);
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
          // Hand off to the celebration staged by handleAppRated — this is
          // the first completion, so it's the one that most needs the reflect offer.
          setCelebrationVisible(true);
        }}
      />
      {/* The "Comeback check-in" rule fires the bespoke comeback/story flow in
          the rule-modal slot; every other modal rule gets the generic RuleModal. */}
      {comebackRule && (
      <ComebackModal
        visible={ruleModalVisible}
        habits={appHabits}
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
  stats: { fontFamily: Fonts.secondaryBold, fontSize: 13, color: Colors.gray, marginLeft: Spacing.xs },
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
});


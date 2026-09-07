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
import { useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { PracticeInstance } from '../../types';
import { activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveHabits, completePractice, fetchAllNudgeLogs, getHabitsStreaksFromLogs, ensureCuratedPractices, saveLogReflection } from '../../services/practices';
import { getTacticPattern, TacticPattern } from '../../services/tacticPatterns';
import { reconcileHabitReminders, cancelHabitReminder } from '../../services/habitReminders';
import { HabitStreakInfo } from '../../types';
import { PracticeCompletionInput } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { PracticeBriefingModal } from '../../components/habits/PracticeBriefingModal';
import { PracticeReflectionSheet, ReflectionInput } from '../../components/habits/PracticeReflectionSheet';
import { getPractice, getPracticeColor, formatCommitment } from '../../data/practices';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
import { TrainingUnlockModal } from '../../components/common/TrainingUnlockModal';
import { ComebackModal } from '../../components/home/ComebackModal';
import { saveComebackLog } from '../../services/comebackLogs';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { selectHabitTidbit, recordTidbitShown, recordLearnMoreTap } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { getTodayString, toLocalDateString, formatRelativeDay } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { markPointsIntroSeen, markTrainingUnlockSeen, incrementAppOpenCount } from '../../services/users';
import { ReflectionGrade } from '../../types';
import { RuleModal } from '../../components/common/RuleModal';
import { TodayHero } from '../../components/home/TodayHero';
import { TodayHabitRow } from '../../components/home/TodayHabitRow';
import { buildTodayList, buildTodaySections, buildWeekGlance, pickNextAction, weekDatesFor } from '../../services/habitPace';
import { buildQuickLogInput } from '../../services/quickLog';
import { RESISTANCE_SCALE, TACTIC_GATE_RESISTANCE } from '../../constants/resistance';
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

type Props = HomeScreenProps<'HomeScreen'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
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
  // Practice whose briefing is open on its own (no forward flow committed to).
  const [briefingHabit, setBriefingHabit] = useState<PracticeInstance | null>(null);
  // The one expanded card. Single-valued on purpose: several open panels turns
  // the list back into the wall of controls this layout exists to undo.
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [celebrationBonus, setCelebrationBonus] = useState<string | null>(null);
  // Muted "Logged for Yesterday" note on the celebration, for backfilled reps.
  const [celebrationContext, setCelebrationContext] = useState<string | null>(null);
  // Reopening the celebration after "Learn more" — render it already settled
  // instead of replaying the ring sweep.
  const [celebrationSkipIntro, setCelebrationSkipIntro] = useState(false);
  const [showReflectionBanner, setShowReflectionBanner] = useState(false);
  const [reflectedToday, setReflectedToday] = useState(false);
  const [todaysGrade, setTodaysGrade] = useState<ReflectionGrade | undefined>();

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

  // Training unlock modal (after 3 practice completions) — covers Challenges
  // and Avoidance Training together.
  const [challengesUnlockVisible, setChallengesUnlockVisible] = useState(false);

  // The one-time Craving Crusher pointer went with the practices/craving tab
  // strip it pointed at — the tool now has a permanent card further down, so
  // there is no first-run discovery problem left to solve.

  // Track app opens
  const appOpenTrackedRef = useRef(false);
  const remindersReconciledRef = useRef(false);
  const seedAttemptedRef = useRef(false);

  // Rule-driven surfaces (admin-configured modals/banners, evaluated on app open).
  // The modal is held while any bespoke modal is up so they never stack.
  const anyModalActive =
    pointsIntroVisible ||
    challengesUnlockVisible ||
    celebrationVisible ||
    habitLearnMoreVisible ||
    reflectVisible ||
    !!briefingHabit ||
    !!completingHabit;
  const {
    modalRule: ruleModalRule,
    modalVisible: ruleModalVisible,
    dismissModal: dismissRuleModal,
    bannerRule: ruleBannerRule,
    dismissBanner: dismissRuleBanner,
  } = useRuleSurfaces('app_open', anyModalActive);

  // A modal rule marked component:'comeback' opens the bespoke comeback flow
  // (barrier → recommit) in the rule-modal slot instead of the generic RuleModal.
  const comebackRule = ruleModalRule?.content.component === 'comeback' ? ruleModalRule : null;

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

  // Fires the streak-milestone alert once nothing else is on screen.
  const flushPendingAlert = useCallback(() => {
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationVisible(false);
    flushPendingAlert();
  }, [flushPendingAlert]);

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
      return;
    }
    flushPendingAlert();
  }, [reflectTarget, flushPendingAlert]);

  // Celebration → reflection. The log already exists, so the sheet patches it.
  const handleOpenReflection = useCallback(() => {
    setCelebrationVisible(false);
    setReflectVisible(true);
  }, []);

  const handleReflectionDone = useCallback(() => {
    setReflectVisible(false);
    setReflectTarget(null);
    setReflectPattern(null);
    flushPendingAlert();
  }, [flushPendingAlert]);

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
            await getPendingSkipReview(user.uid, habitList, cachedNudgeLogs, todayStr)
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
        const reflected = await hasReflectedToday(user.uid);
        setReflectedToday(reflected);
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
  }, [user, refreshProfile, userProfile?.starting_practice_id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
  const handleHabitLogIt = useCallback((habit: PracticeInstance, date?: string) => {
    setCompletingLogOnly(true);
    setCompletingDate(date);
    setCompletingHabit(habit);
  }, []);

  // NOTE: the old handleHabitTap is gone. It routed a card tap to either the
  // briefing or the capture sheet depending on whether the catalog happened to
  // carry `ready` content — the same gesture doing two different things, with
  // nothing on the card to say which. The card now expands, and "About" is a
  // labelled route inside it for the habits that have something to show.

  const handleHabitBriefing = useCallback((habit: PracticeInstance) => {
    setBriefingHabit(habit);
  }, []);

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
    forHabit?: PracticeInstance
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
      const bonusLabel = firstTry ? 'First time trying this practice — XP doubled' : null;
      // Neutral confirmation of which day the rep landed on. Not a bonus —
      // it goes in its own muted slot so backdating never looks rewarded.
      setCelebrationContext(backdated ? `Logged for ${formatRelativeDay(date)}` : null);

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
          date,
        } as CompletionLog,
      ]);

      setCompletingHabit(null);

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

      // Show the Training unlock when crossing 3 total completions. Gated on its
      // own flag rather than the legacy challenges-only one, so users who saw the
      // old modal still get introduced to Avoidance Training once.
      const newTotal = (userProfile?.totalHabitsCompleted ?? 0) + 1;
      if (newTotal >= 3 && !userProfile?.has_seen_training_unlock) {
        setChallengesUnlockVisible(true);
        try {
          await markTrainingUnlockSeen(user.uid);
          await refreshProfile();
        } catch (err) {
          console.warn('Failed to mark challenges unlock seen:', err);
        }
        // Still show the normal points flow after dismiss, don't return
      }

      // Prepare alerts to show after popup animation completes
      const showAlerts = async () => {
        if (updateResult.newTierReached && updateResult.tierInfo) {
          showAlert(
            'Streak Milestone!',
            `${updateResult.newStreak}-Day Streak: ${updateResult.tierInfo.tierName}!\n\nYou're now earning ${updateResult.tierInfo.multiplier}x XP on all activities!`
          );
        }
      };

      // Fetch habit tidbit — staged now, shown after the celebration
      let tidbit: NeuroscienceTidbit | null = null;
      try {
        tidbit = await selectHabitTidbit(user.uid, {
          streakDays: streakBefore,
          difficulty,
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
      setCelebrationBonus(bonusLabel);
      setCelebrationSkipIntro(false);
      setPendingAlert(() => showAlerts);
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

  /**
   * One tap on a resistance chip. The chip IS the rating, so nothing is
   * inferred except the amount the habit already committed to — see
   * services/quickLog.ts.
   */
  const handleQuickLog = useCallback(
    async (habit: PracticeInstance, resistance: number) => {
      try {
        await handleHabitComplete(
          buildQuickLogInput(habit, getPractice(habit.practice_id), resistance),
          habit
        );
      } catch (err: any) {
        console.warn('Quick log failed:', err);
        showAlert("Couldn't log that", 'Check your connection and try again.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, completingHabit, userProfile]
  );

  // The Today list: every active habit, ordered by what needs attention. Derived
  // rather than stored, so an optimistic habit update reorders immediately.
  const todayList = useMemo(
    () => buildTodayList(habits, nudgeLogs, todayStr),
    [habits, nudgeLogs, todayStr]
  );
  const weekGlance = useMemo(() => buildWeekGlance(todayList), [todayList]);
  // Grouped by what each habit is asking. The heading carries the status, so
  // the cards do not repeat it once per row.
  const todaySections = useMemo(() => buildTodaySections(todayList), [todayList]);
  const weekDates = useMemo(() => weekDatesFor(todayStr), [todayStr]);
  const habitsById = useMemo(
    () => Object.fromEntries(habits.map((h) => [h.id, h])) as Record<string, PracticeInstance>,
    [habits]
  );

  // The one habit worth naming in the hero, resolved to a display name. Falls
  // back to null when the habit has vanished from under us mid-render.
  const nextAction = useMemo(() => {
    const action = pickNextAction(todayList);
    const habit = action && habitsById[action.habitId];
    if (!action || !habit) return null;
    return { habitName: habit.name, reps: action.reps, recovers: action.recovers };
  }, [todayList, habitsById]);

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

        <TodayHero
          glance={weekGlance}
          name={userProfile?.username}
          nextAction={nextAction}
        />

        {/*
          Grouped by what each habit is asking of you. The heading says it once
          for the group — "Due today", "Behind this week" — which is what let the
          cards shrink to a name and a way to log. Habits move between groups as
          they are logged, so the list reorders under the thumb by design.
        */}
        {todaySections.map((section) => (
          <View key={section.id}>
            <Text style={styles.sectionHeading}>
              {section.title} · {section.paces.length}
            </Text>
            {section.paces.map((pace) => {
              const habit = habitsById[pace.habitId];
              if (!habit) return null;
              const definition = getPractice(habit.practice_id);
              return (
                <TodayHabitRow
                  key={pace.habitId}
                  // "Drink water · 80 oz". The commitment belongs on the row
                  // because this is the screen where you decide whether to act,
                  // and a habit without a threshold is one you can't really
                  // succeed or fail at.
                  name={[habit.name, formatCommitment(definition, habit.metric_goals)]
                    .filter(Boolean)
                    .join(' · ')}
                  pace={pace}
                  accentColor={getPracticeColor(habit)}
                  weekDates={weekDates}
                  today={todayStr}
                  streak={habitStreaks[habit.id]?.currentStreak ?? 0}
                  expanded={expandedHabitId === habit.id}
                  hasAbout={!!definition?.ready}
                  onToggleExpand={() =>
                    setExpandedHabitId((prev) => (prev === habit.id ? null : habit.id))
                  }
                  onQuickLog={(resistance) => handleQuickLog(habit, resistance)}
                  onOpenSheet={() => handleHabitLogIt(habit)}
                  onLogDay={(date) => handleHabitLogIt(habit, date)}
                  onAbout={() => setBriefingHabit(habit)}
                  onDetails={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                />
              );
            })}
          </View>
        ))}

        {todayList.length === 0 && (
          <Text style={styles.emptyText}>
            No habits yet. Browse the library to add your first one.
          </Text>
        )}

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
            <Text style={styles.utilityTitle}>
              {reflectedToday ? 'Today’s reflection' : 'Close out the day'}
            </Text>
            <Text style={styles.utilitySubtitle}>
              {reflectedToday
                ? todaysGrade
                  ? `You graded today a ${todaysGrade}. Tap to review.`
                  : 'Saved. Tap to review.'
                : 'How did today actually go?'}
            </Text>
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
            <Text style={styles.utilityTitle}>Craving Crusher</Text>
            <Text style={styles.utilitySubtitle}>Ride out an urge without giving in.</Text>
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
            <Text style={styles.addText}>Browse library</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateHabit')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addText}>Create your own</Text>
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
        onSubmit={handleHabitComplete}
        onCancel={() => setCompletingHabit(null)}
      />
      <PracticeBriefingModal
        visible={!!briefingHabit}
        practiceId={briefingHabit?.practice_id}
        habitId={briefingHabit?.id}
        userId={user?.uid}
        // "Log it" — the briefing's button drops into the SAME single-screen
        // capture the row's tick opens, rather than starting a stepped session.
        // One capture experience however you got there.
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
        bonusLabel={celebrationBonus}
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
      {/*
        Suppressed: the Training tab is archived, so this modal would announce a
        feature the user cannot reach and its CTA would navigate to a tab that no
        longer exists (a silent no-op). Left in place rather than deleted so
        restoring the Challenges tab restores this with a one-line change.
      */}
      <TrainingUnlockModal
        visible={false}
        onOpenTraining={() => setChallengesUnlockVisible(false)}
        onDismiss={() => setChallengesUnlockVisible(false)}
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
      {!comebackRule && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
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


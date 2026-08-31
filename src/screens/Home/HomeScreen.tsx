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
import { CravingCrusherTab } from './CravingCrusherTab';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { Challenge, PracticeInstance } from '../../types';
import { getActiveChallenges, getActiveExtendedChallenges, createChallenge, activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveHabits, completePractice, fetchAllNudgeLogs, getWeeklyCompletionCountsFromLogs, getHabitsStreaksFromLogs, getWeeklyCompletionCounts, updateHabit, ensureCuratedPractices, saveLogReflection } from '../../services/practices';
import { getMindPattern, MindPattern } from '../../services/mindPatterns';
import { reconcileHabitReminders, cancelHabitReminder } from '../../services/habitReminders';
import { HabitStreakInfo } from '../../types';
import { getWillpowerStats } from '../../services/willpower';
import { HabitDifficulty, PracticeCompletionInput } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { PracticeBriefingModal } from '../../components/habits/PracticeBriefingModal';
import { PracticeReflectionSheet, ReflectionInput } from '../../components/habits/PracticeReflectionSheet';
import { getPractice, getPracticeColor } from '../../data/practices';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { PointsPopup } from '../../components/common/PointsPopup';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
import { TrainingUnlockModal } from '../../components/common/TrainingUnlockModal';
import { CravingPointer } from '../../components/home/CravingPointer';
import { ComebackModal } from '../../components/home/ComebackModal';
import { saveComebackLog } from '../../services/comebackLogs';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { selectHabitTidbit, recordTidbitShown, recordLearnMoreTap } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { getTodayString, toLocalDateString, formatRelativeDay } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { markPointsIntroSeen, markTrainingUnlockSeen, markCravingPointerSeen, incrementAppOpenCount } from '../../services/users';
import { ReflectionGrade } from '../../types';
import { resolveLayout } from '../../services/homeLayout';
import { SECTION_REGISTRY } from './sections';
import { HomeData, HomeCallbacks, WillpowerStatsData } from './sections/types';
import { ZONE_CONFIG, SECTION_TO_ZONE, HomeSectionId } from '../../constants/homeLayout';
import { ZoneHeader } from '../../components/home/ZoneHeader';
import { getActiveMantraText } from '../../services/mantras';
import { RuleModal } from '../../components/common/RuleModal';
import { TodayHero } from '../../components/home/TodayHero';
import { TodayHabitRow } from '../../components/home/TodayHabitRow';
import { buildTodayList, buildWeekGlance } from '../../services/habitPace';
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
import { CTA_TAB_TARGETS } from '../../types/rules';

type Props = HomeScreenProps<'HomeScreen'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [homeTab, setHomeTab] = useState<'practices' | 'craving'>('practices');

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [extendedChallenges, setExtendedChallenges] = useState<Challenge[]>([]);
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
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [completedTodayIds, setCompletedTodayIds] = useState<string[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [showPointsPopup, setShowPointsPopup] = useState(false);
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
  const [willpowerStats, setWillpowerStats] = useState<WillpowerStatsData | null>(null);

  // Habit tidbit state. The tidbit now renders inside the celebration card;
  // only the "Learn more" expansion is still its own surface.
  const [habitTidbit, setHabitTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [habitLearnMoreVisible, setHabitLearnMoreVisible] = useState(false);

  // Post-reward reflection. Holds the just-written log so the reflection can be
  // patched onto it, plus the practice's recent-reps pattern as context.
  const [reflectTarget, setReflectTarget] = useState<{
    logId: string;
    habitId: string;
    name: string;
    accent: string;
  } | null>(null);
  const [reflectVisible, setReflectVisible] = useState(false);
  const [reflectPattern, setReflectPattern] = useState<MindPattern | null>(null);

  // Points intro modal (one-time, first habit completion)
  const [pointsIntroVisible, setPointsIntroVisible] = useState(false);

  // Training unlock modal (after 3 practice completions) — covers Challenges
  // and Avoidance Training together.
  const [challengesUnlockVisible, setChallengesUnlockVisible] = useState(false);

  // One-time Craving Crusher pointer. Held locally so dismissing it is instant
  // rather than waiting on the profile write to round-trip.
  const [cravingPointerDismissed, setCravingPointerDismissed] = useState(false);
  const showCravingPointer =
    !cravingPointerDismissed && userProfile?.has_seen_craving_pointer !== true;

  const dismissCravingPointer = useCallback(() => {
    setCravingPointerDismissed(true);
    if (user) markCravingPointerSeen(user.uid).catch(() => {});
  }, [user]);

  // Following the pointer counts as having seen it — switch to the tab and retire it.
  const followCravingPointer = useCallback(() => {
    dismissCravingPointer();
    setHomeTab('craving');
  }, [dismissCravingPointer]);

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
    showPointsPopup ||
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
        // TODO(tools-tab): the Tools tab is hidden, so CTAs targeting it are
        // ignored. Remove this guard when the tab returns.
        if (target.screen === 'Tools') return;
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

  const handlePopupComplete = useCallback(() => {
    setShowPointsPopup(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

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
          const { changed, deactivated } = await ensureCuratedPractices(user.uid);
          if (changed > 0) console.log(`[home] provisioned ${changed} curated practices`);
          // A retired practice is hidden everywhere, so its daily reminder
          // would otherwise keep firing with no way to turn it off in-app
          for (const h of deactivated) cancelHabitReminder(h).catch(() => {});
        } catch (err) {
          console.warn('Failed to ensure curated practices:', err);
          seedAttemptedRef.current = false; // allow a retry on the next load
        }
      }

      const [dailyChallenges, extChallenges, habitList, wpStats] = await Promise.all([
        getActiveChallenges(user.uid),
        getActiveExtendedChallenges(user.uid),
        getActiveHabits(user.uid),
        getWillpowerStats(user.uid),
      ]);
      // Everything from the parallel batch renders immediately — practices
      // especially. Follow-up round-trips (nudge logs, challenge maintenance,
      // weekly plans) happen below and fill in as they arrive.
      setActiveChallenges(dailyChallenges);
      setExtendedChallenges(extChallenges);
      setHabits(habitList);
      // Once per session: schedule any enabled reminders that aren't scheduled yet
      // (e.g. saved before reminders shipped, or while permission was denied).
      if (!remindersReconciledRef.current && user) {
        remindersReconciledRef.current = true;
        reconcileHabitReminders(user.uid, habitList).catch(() => {});
      }
      setWillpowerStats(wpStats);

      // Streak-break comeback check-in now fires via the rules engine
      // ("Comeback check-in" rule, app_open) — see the comebackRule block above.

      // Fetch nudge logs once — reused by weekly counts and streaks.
      // Windowed to the last 120 days so the read stays flat
      // as history grows; the only casualty is that a current streak longer
      // than the window displays capped at it.
      const logWindowStart = new Date();
      logWindowStart.setDate(logWindowStart.getDate() - 120);
      let cachedNudgeLogs: Awaited<ReturnType<typeof fetchAllNudgeLogs>> = [];
      try {
        cachedNudgeLogs = await fetchAllNudgeLogs(user.uid, toLocalDateString(logWindowStart));
        setNudgeLogs(cachedNudgeLogs);
        setWeeklyCounts(getWeeklyCompletionCountsFromLogs(cachedNudgeLogs));
        // Habit ids logged today — powers the hero counter + card "Done today" state.
        const todayStr = getTodayString();
        setCompletedTodayIds(
          cachedNudgeLogs.filter((l) => l.date === todayStr).map((l) => l.reference_id)
        );
        if (habitList.length > 0) {
          setHabitStreaks(getHabitsStreaksFromLogs(cachedNudgeLogs, habitList.map(h => h.id)));
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

      // Challenge maintenance (after the batch state is set, so none of it
      // blocks the first render of practices):
      // 1. Expire stale daily challenges from previous days
      // 2. Activate scheduled challenges whose date has arrived
      try {
        const todayStr = getTodayString();
        const expiredCount = await expireStaleDailyChallenges(user.uid, todayStr);
        const activatedCount = await activateScheduledChallenges(user.uid, todayStr);
        if (expiredCount > 0 || activatedCount > 0) {
          const refreshedChallenges = await getActiveChallenges(user.uid);
          setActiveChallenges(refreshedChallenges);
          const refreshedExtended = await getActiveExtendedChallenges(user.uid);
          setExtendedChallenges(refreshedExtended);
        }
      } catch (err) {
        console.warn('Challenge maintenance failed:', err);
      }

      // Check nightly reflection status
      try {
        const reflected = await hasReflectedToday(user.uid);
        setReflectedToday(reflected);
        if (reflected) {
          const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
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
  }, [user, refreshProfile]);

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

  const handleHabitTap = useCallback(
    (habit: PracticeInstance) => {
      // Start: curated practices with a briefing run the forward Ready → Go →
      // Capture flow (hosted in this stack, so it returns to Home when done).
      // Everything else opens the capture modal, timer included where relevant.
      const practice = getPractice(habit.practice_id);
      if (practice?.ready) {
        navigation.navigate('PracticeSession', {
          practiceId: practice.id,
          habitId: habit.id,
          habitName: habit.name,
        });
        return;
      }
      setCompletingLogOnly(false);
      setCompletingDate(undefined);
      setCompletingHabit(habit);
    },
    [navigation]
  );

  // "I already did it" — the same capture modal for every practice, briefing
  // and session beat skipped. Which flow you get is now the user's choice
  // rather than a function of whether the catalog carries briefing content.
  // `date` preselects a past day; the capture flow still lets them change it.
  const handleHabitLogIt = useCallback((habit: PracticeInstance, date?: string) => {
    setCompletingLogOnly(true);
    setCompletingDate(date);
    setCompletingHabit(habit);
  }, []);

  const handleHabitBriefing = useCallback((habit: PracticeInstance) => {
    setBriefingHabit(habit);
  }, []);

  const handleHabitComplete = async (input: PracticeCompletionInput) => {
    if (!user || !completingHabit) return;
    const { difficulty } = input;
    // Snapshot the practice — `completingHabit` is cleared below, but the
    // reflection sheet still needs its identity after the celebration.
    const habit = completingHabit;
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

      // Optimistically flip the card to "Done today" (loadData reconciles on
      // next focus). Only for today's reps — a backfilled Saturday rep must not
      // make the card claim today is handled.
      if (!backdated) {
        const completedId = habit.id;
        setCompletedTodayIds((prev) => (prev.includes(completedId) ? prev : [...prev, completedId]));
      }

      // Optimistically add the rep to the log set the Today list is derived
      // from, so the weekly pips fill and the row re-sorts immediately. Without
      // this the list would stay stale until the next focus reload, and logging
      // a habit would appear to do nothing. Backdated reps included — they still
      // count toward the week they were filed under.
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
          date,
        } as CompletionLog,
      ]);

      setCompletingHabit(null);

      // Arm the post-reward reflection against the log we just wrote, and warm
      // its "Your pattern" context in the background.
      setReflectTarget({
        logId,
        habitId: habit.id,
        name: habit.name,
        accent: getPracticeColor(habit),
      });
      setReflectPattern(null);
      getMindPattern(user.uid, habit.id).then(setReflectPattern).catch(() => {});

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

      try {
        const counts = await getWeeklyCompletionCounts(user.uid);
        setWeeklyCounts(counts);
      } catch (err) {
        console.warn('Weekly counts refresh failed:', err);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Weekly goal (per-practice commitment) ---

  const handleSetWeeklyGoal = useCallback(
    async (habitId: string, target: number) => {
      if (!user) return;
      // Optimistic: reflect the new target immediately on the card.
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, target_count_per_week: target } : h))
      );
      try {
        await updateHabit(user.uid, habitId, { target_count_per_week: target });
      } catch (err) {
        console.warn('Failed to update weekly goal:', err);
        // Reload to resync if the write failed.
        loadData();
      }
    },
    [user, loadData]
  );

  // --- Layout & Section Props ---

  const layout = useMemo(
    () => resolveLayout(userProfile?.home_layout),
    [userProfile?.home_layout]
  );

  const zonedLayout = useMemo(() => {
    const visibleItems = layout.filter(item => item.visible);
    return ZONE_CONFIG.map(zone => {
      const zoneItems = visibleItems.filter(
        item => SECTION_TO_ZONE[item.id as HomeSectionId] === zone.id
      );
      return { zone, items: zoneItems };
    }).filter(group => group.items.length > 0);
  }, [layout]);

  const totalHabitsCompleted = userProfile?.totalHabitsCompleted ?? 0;
  const activeMantra = getActiveMantraText(userProfile);
  const whyStatement = userProfile?.why_statement || null;
  const hasCompletedWhyDiscovery = userProfile?.has_completed_why_discovery === true;

  const homeData: HomeData = useMemo(() => ({
    activeChallenges,
    extendedChallenges,
    habits,
    weeklyCounts,
    habitStreaks,
    showReflectionBanner,
    reflectedToday,
    todaysGrade,
    willpowerStats,
    totalHabitsCompleted,
    activeMantra,
    whyStatement,
    hasCompletedWhyDiscovery,
    completedTodayIds,
    startingPracticeId: userProfile?.starting_practice_id ?? null,
    userName: userProfile?.username ?? null,
  }), [
    activeChallenges, extendedChallenges, habits,
    weeklyCounts, habitStreaks,
    showReflectionBanner, reflectedToday, todaysGrade,
    willpowerStats, totalHabitsCompleted, activeMantra,
    whyStatement, hasCompletedWhyDiscovery,
    completedTodayIds, userProfile?.starting_practice_id, userProfile?.username,
  ]);

  const onNavigate = useCallback((screen: string, params?: any) => {
    if (screen === '__progressTab') {
      navigation.getParent()?.navigate('Progress');
      return;
    }
    navigation.navigate(screen as any, params);
  }, [navigation]);

  const homeCallbacks: HomeCallbacks = useMemo(() => ({
    onNavigate,
    onHabitTap: handleHabitTap,
    onHabitLogIt: handleHabitLogIt,
    onHabitBriefing: handleHabitBriefing,
    onSetWeeklyGoal: handleSetWeeklyGoal,
  }), [onNavigate, handleHabitTap, handleHabitLogIt, handleHabitBriefing, handleSetWeeklyGoal]);


  // The Today list: every active habit, ordered by what needs attention. Derived
  // rather than stored, so an optimistic habit update reorders immediately.
  const todayList = useMemo(
    () => buildTodayList(habits, nudgeLogs, getTodayString()),
    [habits, nudgeLogs]
  );
  const weekGlance = useMemo(() => buildWeekGlance(todayList), [todayList]);
  const habitsById = useMemo(
    () => Object.fromEntries(habits.map((h) => [h.id, h])) as Record<string, PracticeInstance>,
    [habits]
  );

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

        <TodayHero glance={weekGlance} name={userProfile?.username} />

        {todayList.map((pace) => {
          const habit = habitsById[pace.habitId];
          if (!habit) return null;
          return (
            <TodayHabitRow
              key={pace.habitId}
              name={habit.name}
              pace={pace}
              accentColor={getPracticeColor(habit)}
              onPress={() => handleHabitTap(habit)}
              onQuickLog={() => handleHabitLogIt(habit)}
              onDetails={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
            />
          );
        })}

        {todayList.length === 0 && (
          <Text style={styles.emptyText}>
            No habits yet. Browse the library to add your first one.
          </Text>
        )}

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
        actionPlan={completingHabit?.action_plan}
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
        onStart={() => {
          const habit = briefingHabit;
          setBriefingHabit(null);
          if (!habit?.practice_id) return;
          navigation.navigate('PracticeSession', {
            practiceId: habit.practice_id,
            habitId: habit.id,
            habitName: habit.name,
          });
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
        mindPattern={reflectPattern}
        onSave={handleReflectionSave}
        onSkip={handleReflectionDone}
      />
      <PointsPopup
        points={earnedPoints}
        visible={showPointsPopup}
        onComplete={handlePopupComplete}
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

const TAB_LABELS = {
  practices: 'Practices',
  craving: 'Craving Crusher',
} as const;

// Craving Crusher is the one feature a user may need before they've explored
// anything — the icons keep the strip readable as two destinations rather than
// as a line of chrome.
const TAB_ICONS: Record<keyof typeof TAB_LABELS, keyof typeof Ionicons.glyphMap> = {
  practices: 'flame',
  craving: 'flash',
};

const tabStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  tabPanel: { flex: 1 },
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
  tabHidden: { display: 'none' },
});


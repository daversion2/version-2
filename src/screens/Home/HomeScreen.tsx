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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { Challenge, Nudge, Team, TeamMemberActivitySummary, BuddyChallenge, ProgramEnrollment, ProgramDay, Goal, GoalFollowThrough, PlannedItem, TomorrowChallenge, TomorrowPlan } from '../../types';
import { getActiveChallenges, getActiveExtendedChallenges, createChallenge, activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveEnrollment, getTodaysProgramContent, checkAndProcessMissedDays } from '../../services/programs';
import { getPendingInviteCount, getActiveBuddyChallenges } from '../../services/buddyChallenge';
import { getActiveHabits, logHabitCompletion, fetchAllNudgeLogs, getWeeklyCompletionCountsFromLogs, getHabitsStreaksFromLogs, getWeeklyCompletionCounts } from '../../services/habits';
import { reconcileHabitReminders } from '../../services/habitReminders';
import { HabitStreakInfo } from '../../types';
import { getGoalColor } from '../../constants/goalColors';
import { getUserTeam, logTeamActivity, getTeamMemberActivitySummaryOptimized } from '../../services/teams';
import {
  calculateHabitPoints,
  updateWillpowerStats,
  getWillpowerStats,
} from '../../services/willpower';
import { HabitDifficulty } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { PointsPopup } from '../../components/common/PointsPopup';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
import { PlanIntroModal } from '../../components/common/PlanIntroModal';
import { GoalPromptModal } from '../../components/common/GoalPromptModal';
import { ChallengesUnlockModal } from '../../components/common/ChallengesUnlockModal';
import { ComebackModal } from '../../components/home/ComebackModal';
import { StoryReminderModal } from '../../components/home/StoryReminderModal';
import { saveComebackLog } from '../../services/comebackLogs';
import { getRandomProofPoint } from '../../services/proofPoints';
import { ProofPoint } from '../../types';
import { HabitTidbitModal } from '../../components/habits/HabitTidbitModal';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { selectHabitTidbit, recordTidbitShown, recordLearnMoreTap } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { convertPlannedChallengesToChallenges, getTomorrowPlan, saveTomorrowPlan } from '../../services/dailyPlan';
import { exportToCalendar } from '../../services/calendarExport';
import { getTodayString, toLocalDateString } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { getActiveGoals, computeGoalFollowThrough } from '../../services/goals';
import { markPointsIntroSeen, markPlanIntroSeen, dismissGoalPrompt, markChallengesUnlockSeen, incrementAppOpenCount, markComebackShown } from '../../services/users';
import { runGoalsMigration } from '../../services/dataMigration';
import { ReflectionGrade } from '../../types';
import { resolveLayout } from '../../services/homeLayout';
import { SECTION_REGISTRY } from './sections';
import { HomeData, HomeCallbacks, WillpowerStatsData } from './sections/types';
import { ZONE_CONFIG, SECTION_TO_ZONE, HomeSectionId } from '../../constants/homeLayout';
import { ZoneHeader } from '../../components/home/ZoneHeader';
import { getActiveMantraText } from '../../services/mantras';
import { RuleModal } from '../../components/common/RuleModal';
import { RuleBanner } from '../../components/common/RuleBanner';
import { useRuleSurfaces } from '../../hooks/useRuleSurfaces';
import { CTA_TAB_TARGETS } from '../../types/rules';

type Props = HomeScreenProps<'HomeScreen'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [extendedChallenges, setExtendedChallenges] = useState<Challenge[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [buddyChallenges, setBuddyChallenges] = useState<BuddyChallenge[]>([]);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [completingHabit, setCompletingHabit] = useState<Nudge | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [team, setTeam] = useState<Team | null>(null);
  const [teamSummary, setTeamSummary] = useState<TeamMemberActivitySummary[]>([]);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [activeProgram, setActiveProgram] = useState<ProgramEnrollment | null>(null);
  const [todaysProgramDay, setTodaysProgramDay] = useState<ProgramDay | null>(null);
  const [programDayNumber, setProgramDayNumber] = useState(0);
  const [programCheckedIn, setProgramCheckedIn] = useState(false);
  const [plannedHabitIds, setPlannedHabitIds] = useState<string[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<Record<string, TomorrowPlan>>({});
  const [showReflectionBanner, setShowReflectionBanner] = useState(false);
  const [reflectedToday, setReflectedToday] = useState(false);
  const [todaysGrade, setTodaysGrade] = useState<ReflectionGrade | undefined>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [willpowerStats, setWillpowerStats] = useState<WillpowerStatsData | null>(null);
  const [goalFollowThrough, setGoalFollowThrough] = useState<Record<string, GoalFollowThrough>>({});
  const [comebackVisible, setComebackVisible] = useState(false);
  const comebackShownRef = useRef(false);
  const [storyReminderVisible, setStoryReminderVisible] = useState(false);
  const [storyReminderProofPoint, setStoryReminderProofPoint] = useState<ProofPoint | null>(null);

  // Habit tidbit state
  const [habitTidbit, setHabitTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [habitTidbitVisible, setHabitTidbitVisible] = useState(false);
  const [habitLearnMoreVisible, setHabitLearnMoreVisible] = useState(false);
  const pendingHabitPointsRef = useRef<{ points: number; streak: number; alertFn: () => void } | null>(null);

  // Points intro modal (one-time, first habit completion)
  const [pointsIntroVisible, setPointsIntroVisible] = useState(false);

  // Plan intro modal (one-time, first home screen landing after onboarding)
  const [planIntroVisible, setPlanIntroVisible] = useState(false);

  // Goal prompt modal (Day 2 - second app open, no goals)
  const [goalPromptVisible, setGoalPromptVisible] = useState(false);

  // Challenges unlock modal (after 3 habit completions)
  const [challengesUnlockVisible, setChallengesUnlockVisible] = useState(false);

  // Track app opens
  const appOpenTrackedRef = useRef(false);
  const remindersReconciledRef = useRef(false);

  // Rule-driven surfaces (admin-configured modals/banners, evaluated on app open).
  // The modal is held while any bespoke modal is up so they never stack.
  const anyModalActive =
    comebackVisible ||
    storyReminderVisible ||
    pointsIntroVisible ||
    planIntroVisible ||
    goalPromptVisible ||
    challengesUnlockVisible ||
    celebrationVisible ||
    habitTidbitVisible ||
    habitLearnMoreVisible ||
    showPointsPopup ||
    !!completingHabit;
  const {
    modalRule: ruleModalRule,
    modalVisible: ruleModalVisible,
    dismissModal: dismissRuleModal,
    bannerRule: ruleBannerRule,
    dismissBanner: dismissRuleBanner,
  } = useRuleSurfaces('app_open', anyModalActive);

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

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationVisible(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

  const handleHabitTidbitDismiss = useCallback(() => {
    setHabitTidbitVisible(false);
    const pending = pendingHabitPointsRef.current;
    if (pending) {
      pendingHabitPointsRef.current = null;
      setEarnedPoints(pending.points);
      setCelebrationStreak(pending.streak);
      setCelebrationVisible(true);
      setPendingAlert(() => pending.alertFn);
    }
  }, []);

  const handleHabitLearnMore = useCallback(() => {
    if (habitTidbit) {
      recordLearnMoreTap(habitTidbit.id).catch(() => {});
    }
    setHabitTidbitVisible(false);
    setHabitLearnMoreVisible(true);
  }, [habitTidbit]);

  const handleHabitLearnMoreClose = useCallback(() => {
    setHabitLearnMoreVisible(false);
    const pending = pendingHabitPointsRef.current;
    if (pending) {
      pendingHabitPointsRef.current = null;
      setEarnedPoints(pending.points);
      setCelebrationStreak(pending.streak);
      setCelebrationVisible(true);
      setPendingAlert(() => pending.alertFn);
    }
  }, []);


  const getItemColor = useCallback((goalIds?: string[]) => {
    return getGoalColor(goalIds, goals);
  }, [goals]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Refresh user profile so totalHabitsCompleted, flags, etc. are current
      await refreshProfile();

      // Run lazy goals migration before loading data
      const didMigrate = await runGoalsMigration(user.uid);
      if (didMigrate) {
        showAlert(
          'Goals Update',
          'Your existing challenges, habits, and programs have been organized under a "General" goal. You can reassign them to specific goals anytime.'
        );
      }

      const [dailyChallenges, extChallenges, habitList, userTeam, inviteCount, activeBuddies, enrollment, activeGoals, wpStats] = await Promise.all([
        getActiveChallenges(user.uid),
        getActiveExtendedChallenges(user.uid),
        getActiveHabits(user.uid),
        getUserTeam(user.uid),
        getPendingInviteCount(user.uid),
        getActiveBuddyChallenges(user.uid),
        getActiveEnrollment(user.uid),
        getActiveGoals(user.uid),
        getWillpowerStats(user.uid),
      ]);
      setActiveChallenges(dailyChallenges);
      setExtendedChallenges(extChallenges);

      // 1. Expire stale daily challenges from previous days
      // 2. Activate scheduled challenges whose date has arrived
      // 3. Convert planned challenges into real Challenge documents
      // 4. Load planned habit IDs for Today's Plan
      try {
        const todayStr = getTodayString();
        const expiredCount = await expireStaleDailyChallenges(user.uid, todayStr);
        const activatedCount = await activateScheduledChallenges(user.uid, todayStr);
        const convertedCount = await convertPlannedChallengesToChallenges(user.uid, todayStr);
        if (expiredCount > 0 || activatedCount > 0 || convertedCount > 0) {
          const refreshedChallenges = await getActiveChallenges(user.uid);
          setActiveChallenges(refreshedChallenges);
          const refreshedExtended = await getActiveExtendedChallenges(user.uid);
          setExtendedChallenges(refreshedExtended);
        }
        // Load planned habit IDs for today
        const todayPlan = await getTomorrowPlan(user.uid, todayStr);
        if (todayPlan?.planned_habit_ids) {
          setPlannedHabitIds(todayPlan.planned_habit_ids);
        }

        // Load future plans for this week (for planner context on habit rows)
        const today = new Date();
        const futurePlans: Record<string, TomorrowPlan> = {};
        const futureDates: string[] = [];
        for (let i = 1; i <= 6; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          futureDates.push(toLocalDateString(d));
        }
        const planResults = await Promise.all(
          futureDates.map((date) => getTomorrowPlan(user.uid, date))
        );
        planResults.forEach((plan, idx) => {
          if (plan) futurePlans[futureDates[idx]] = plan;
        });
        setWeeklyPlans(futurePlans);
      } catch (err) {
        console.warn('Planned items conversion failed:', err);
      }

      setGoals(activeGoals);
      setPendingInvites(inviteCount);
      setBuddyChallenges(activeBuddies);
      setHabits(habitList);
      // Once per session: schedule any enabled reminders that aren't scheduled yet
      // (e.g. saved before reminders shipped, or while permission was denied).
      if (!remindersReconciledRef.current && user) {
        remindersReconciledRef.current = true;
        reconcileHabitReminders(user.uid, habitList).catch(() => {});
      }
      setTeam(userTeam);
      setActiveProgram(enrollment);
      setWillpowerStats(wpStats);

      // Detect streak break and show comeback/story reminder modal (once per day)
      const todayForComeback = getTodayString();
      if (
        !comebackShownRef.current &&
        wpStats.currentStreak === 0 &&
        habitList.length > 0 &&
        userProfile?.lastComebackDate !== todayForComeback
      ) {
        comebackShownRef.current = true;
        markComebackShown(user.uid, todayForComeback).catch(() => {});

        // If user has proof points, show StoryReminder; otherwise show ComebackModal
        try {
          const randomProof = await getRandomProofPoint(user.uid);
          if (randomProof) {
            setStoryReminderProofPoint(randomProof);
            setStoryReminderVisible(true);
          } else {
            setComebackVisible(true);
          }
        } catch {
          setComebackVisible(true);
        }
      }

      // Fetch all nudge logs once — reused by weekly counts, streaks, and goal follow-through
      let cachedNudgeLogs: Awaited<ReturnType<typeof fetchAllNudgeLogs>> = [];
      try {
        cachedNudgeLogs = await fetchAllNudgeLogs(user.uid);
        setWeeklyCounts(getWeeklyCompletionCountsFromLogs(cachedNudgeLogs));
        if (habitList.length > 0) {
          setHabitStreaks(getHabitsStreaksFromLogs(cachedNudgeLogs, habitList.map(h => h.id)));
        }
      } catch (err) {
        console.warn('Nudge logs fetch failed:', err);
      }

      // Compute follow-through for each goal (reuses cached logs)
      if (activeGoals.length > 0) {
        try {
          const logsForGoals = cachedNudgeLogs.map(l => ({ reference_id: l.reference_id, date: l.date }));
          const ftEntries = await Promise.all(
            activeGoals.map(async (g) => {
              const ft = await computeGoalFollowThrough(user.uid, g.id, logsForGoals);
              return [g.id, ft] as const;
            })
          );
          setGoalFollowThrough(Object.fromEntries(ftEntries));
        } catch (err) {
          console.warn('Follow-through computation failed:', err);
        }
      }

      // Load program day content and check for missed days
      if (enrollment) {
        try {
          await checkAndProcessMissedDays(user.uid, enrollment.id);
          const content = await getTodaysProgramContent(user.uid, enrollment.id);
          if (content) {
            setTodaysProgramDay(content.programDay);
            setProgramDayNumber(content.dayNumber);
            setProgramCheckedIn(content.isCheckedIn);
          }
        } catch (err) {
          console.warn('Program data load failed:', err);
        }
      } else {
        setTodaysProgramDay(null);
        setProgramDayNumber(0);
        setProgramCheckedIn(false);
      }

      // Fetch team activity summary if user has a team
      if (userTeam) {
        try {
          const summary = await getTeamMemberActivitySummaryOptimized(userTeam.id);
          setTeamSummary(summary);
        } catch (err) {
          console.warn('Team activity summary failed:', err);
        }
      } else {
        setTeamSummary([]);
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

  // Show one-time plan intro after onboarding OR after first habit creation (if skipped onboarding)
  useEffect(() => {
    if (!userProfile) return;
    if (planIntroVisible) return; // Already showing
    if (!userProfile.has_seen_plan_intro && habits.length > 0) {
      // Small delay so the home screen renders first
      const timer = setTimeout(() => setPlanIntroVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userProfile, habits]);

  // Show goal prompt on second app open if user has no goals
  useEffect(() => {
    if (!userProfile || goals.length > 0) return;
    if (goalPromptVisible) return; // Already showing
    if (
      (userProfile.app_open_count ?? 0) >= 2 &&
      !userProfile.has_dismissed_goal_prompt &&
      userProfile.has_seen_plan_intro // Don't stack with plan intro
    ) {
      const timer = setTimeout(() => setGoalPromptVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userProfile, goals]);


  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleHabitTap = useCallback((habit: Nudge) => {
    setCompletingHabit(habit);
  }, []);

  const handleHabitComplete = async (difficulty: HabitDifficulty, notes?: string) => {
    if (!user || !completingHabit) return;
    try {
      await logHabitCompletion(user.uid, completingHabit.id, difficulty, undefined, notes);

      // Log team activity if user is in a team
      if (team) {
        try {
          await logTeamActivity(
            team.id,
            user.uid,
            'habit',
            completingHabit.name
          );
          // Refresh team summary after logging activity
          const summary = await getTeamMemberActivitySummaryOptimized(team.id);
          setTeamSummary(summary);
        } catch (teamErr) {
          console.warn('Failed to log team activity:', teamErr);
        }
      }

      // Calculate and award XP
      const difficultyNum = difficulty === 'easy' ? 1 : 2;
      const stats = await getWillpowerStats(user.uid);
      const pointsEarned = calculateHabitPoints(difficultyNum, stats.currentStreak);
      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      setCompletingHabit(null);

      // Show one-time points intro on first habit completion after onboarding
      if (!userProfile?.has_seen_points_intro) {
        setPointsIntroVisible(true);
        try {
          await markPointsIntroSeen(user.uid);
          await refreshProfile();
        } catch (err) {
          console.warn('Failed to mark points intro seen:', err);
        }
        return;
      }

      // Show challenges unlock celebration when crossing 3 total completions
      const newTotal = (userProfile?.totalHabitsCompleted ?? 0) + 1;
      if (newTotal >= 3 && !userProfile?.has_seen_challenges_unlock) {
        setChallengesUnlockVisible(true);
        try {
          await markChallengesUnlockSeen(user.uid);
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
            `${updateResult.newStreak}-Day Streak: ${updateResult.tierInfo.tierName}!\n\nYou're now earning ${updateResult.tierInfo.multiplier}x points on all activities!`
          );
        }
      };

      // Fetch habit tidbit — show it before celebration for a clean sequence
      try {
        const tidbit = await selectHabitTidbit(user.uid, {
          streakDays: stats.currentStreak,
          difficulty,
        });
        if (tidbit) {
          await recordTidbitShown(user.uid, tidbit.id);
          setHabitTidbit(tidbit);
          pendingHabitPointsRef.current = { points: pointsEarned, streak: updateResult.newStreak, alertFn: showAlerts };
          setHabitTidbitVisible(true);
          return; // Celebration fires after tidbit is dismissed
        }
      } catch (err) {
        console.warn('Failed to fetch habit tidbit:', err);
      }

      // No tidbit — show celebration immediately
      setEarnedPoints(pointsEarned);
      setCelebrationStreak(updateResult.newStreak);
      setCelebrationVisible(true);
      setPendingAlert(() => showAlerts);

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

  // --- Calendar Export ---

  const handleCalendarExport = useCallback(async (item: PlannedItem) => {
    await exportToCalendar({
      title: item.calendarTitle || item.title,
      notes: item.calendarNotes,
      startDate: item.calendarStartDate,
      endDate: item.calendarEndDate,
    });
  }, []);

  // --- Planned Item Press ---

  const handlePlannedItemPress = useCallback((item: PlannedItem) => {
    switch (item.type) {
      case 'habit': {
        const habit = item.sourceData.habit;
        if (habit) handleHabitTap(habit);
        break;
      }
      case 'daily_challenge': {
        const challenge = item.sourceData.challenge;
        if (challenge) navigation.navigate('CompleteChallenge' as any, { challenge });
        break;
      }
      case 'extended_milestone': {
        const challenge = item.sourceData.challenge;
        if (challenge) navigation.navigate('ExtendedChallengeProgress' as any, { challengeId: challenge.id });
        break;
      }
      case 'program_checkin': {
        const program = item.sourceData.program;
        if (program) navigation.navigate('ProgramDashboard' as any, { enrollmentId: program.id });
        break;
      }
    }
  }, [handleHabitTap, navigation]);

  // --- Add to Today ---

  const handleAddTodayChallenge = useCallback(async (challenge: TomorrowChallenge) => {
    if (!user) return;
    try {
      const todayStr = getTodayString();
      await createChallenge(user.uid, {
        name: challenge.name,
        date: todayStr,
        difficulty_expected: challenge.difficulty_expected,
        description: challenge.description,
      });
      // Refresh challenges list
      const refreshed = await getActiveChallenges(user.uid);
      setActiveChallenges(refreshed);
    } catch (err) {
      console.warn('Failed to add today challenge:', err);
      showAlert('Error', 'Could not create challenge.');
    }
  }, [user]);

  const handleToggleTodayHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    const updated = plannedHabitIds.includes(habitId)
      ? plannedHabitIds.filter((id) => id !== habitId)
      : [...plannedHabitIds, habitId];
    setPlannedHabitIds(updated);

    // Persist to today's plan doc
    try {
      const todayStr = getTodayString();
      const existingPlan = await getTomorrowPlan(user.uid, todayStr);
      await saveTomorrowPlan(user.uid, {
        user_id: user.uid,
        date: todayStr,
        planned_habit_ids: updated,
        planned_challenges: existingPlan?.planned_challenges || [],
        dismissed_habit_ids: existingPlan?.dismissed_habit_ids || [],
        created_at: existingPlan?.created_at || new Date().toISOString(),
        source: 'manual',
      });
    } catch (err) {
      console.warn('Failed to save planned habits:', err);
    }
  }, [user, plannedHabitIds]);

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
    team,
    teamSummary,
    weeklyCounts,
    habitStreaks,
    pendingInvites,
    buddyChallenges,
    activeProgram,
    todaysProgramDay,
    programDayNumber,
    programCheckedIn,
    goals,
    showReflectionBanner,
    reflectedToday,
    todaysGrade,
    willpowerStats,
    goalFollowThrough,
    totalHabitsCompleted,
    activeMantra,
    whyStatement,
    hasCompletedWhyDiscovery,
    plannedHabitIds,
    weeklyPlans,
  }), [
    activeChallenges, extendedChallenges, habits, team, teamSummary,
    weeklyCounts, habitStreaks, pendingInvites, buddyChallenges,
    activeProgram, todaysProgramDay, programDayNumber, programCheckedIn,
    goals, showReflectionBanner, reflectedToday, todaysGrade,
    willpowerStats, goalFollowThrough, totalHabitsCompleted, activeMantra,
    whyStatement, hasCompletedWhyDiscovery, plannedHabitIds, weeklyPlans,
  ]);

  const onNavigate = useCallback((screen: string, params?: any) => {
    if (screen === '__progressTab') {
      navigation.getParent()?.navigate('Progress');
      return;
    }
    navigation.navigate(screen as any, params);
  }, [navigation]);

  const onGoalTap = useCallback((goalId: string) => {
    navigation.navigate('GoalDashboard' as any, { goalId });
  }, [navigation]);

  const homeCallbacks: HomeCallbacks = useMemo(() => ({
    onNavigate,
    onHabitTap: handleHabitTap,
    getItemColor,
    onGoalTap,
    onCalendarExport: handleCalendarExport,
    onPlannedItemPress: handlePlannedItemPress,
    onAddTodayChallenge: handleAddTodayChallenge,
    onToggleTodayHabit: handleToggleTodayHabit,
  }), [onNavigate, handleHabitTap, getItemColor, onGoalTap, handleCalendarExport, handlePlannedItemPress, handleAddTodayChallenge, handleToggleTodayHabit]);


  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <RuleBanner rule={ruleBannerRule} onDismiss={dismissRuleBanner} />

        {zonedLayout.map((group) => (
          <React.Fragment key={group.zone.id}>
            {group.zone.id !== 'welcome' && group.zone.id !== 'legacy' && (
              <ZoneHeader label={group.zone.label} icon={group.zone.icon} />
            )}
            {group.items.map(item => {
              const Section = SECTION_REGISTRY[item.id];
              if (!Section) return null;
              return (
                <Section
                  key={item.id}
                  data={homeData}
                  callbacks={homeCallbacks}
                />
              );
            })}
          </React.Fragment>
        ))}

      <HabitCompletionModal
        visible={!!completingHabit}
        habitName={completingHabit?.name || ''}
        actionPlan={completingHabit?.action_plan}
        onSubmit={handleHabitComplete}
        onCancel={() => setCompletingHabit(null)}
      />
      </ScrollView>
      <HabitCelebrationModal
        visible={celebrationVisible}
        pointsEarned={earnedPoints}
        streakDays={celebrationStreak}
        onDismiss={handleCelebrationDismiss}
      />
      <PointsPopup
        points={earnedPoints}
        visible={showPointsPopup}
        onComplete={handlePopupComplete}
      />
      <PointsIntroModal
        visible={pointsIntroVisible}
        onDismiss={() => setPointsIntroVisible(false)}
      />
      <PlanIntroModal
        visible={planIntroVisible}
        onDismiss={async () => {
          setPlanIntroVisible(false);
          if (user) {
            try {
              await markPlanIntroSeen(user.uid);
              await refreshProfile();
            } catch (err) {
              console.warn('Failed to mark plan intro seen:', err);
            }
          }
        }}
      />
      <GoalPromptModal
        visible={goalPromptVisible}
        onSetupGoal={async () => {
          setGoalPromptVisible(false);
          if (user) {
            try {
              await dismissGoalPrompt(user.uid);
              await refreshProfile();
            } catch (err) {
              console.warn('Failed to dismiss goal prompt:', err);
            }
          }
          navigation.navigate('GoalCreationFlow');
        }}
        onDismiss={async () => {
          setGoalPromptVisible(false);
          if (user) {
            try {
              await dismissGoalPrompt(user.uid);
              await refreshProfile();
            } catch (err) {
              console.warn('Failed to dismiss goal prompt:', err);
            }
          }
        }}
      />
      <ChallengesUnlockModal
        visible={challengesUnlockVisible}
        onBrowse={() => {
          setChallengesUnlockVisible(false);
          navigation.navigate('StartChallenge');
        }}
        onDismiss={() => setChallengesUnlockVisible(false)}
      />
<ComebackModal
        visible={comebackVisible}
        habits={habits}
        onCommit={async (habitId, habitName, barrierReason) => {
          setComebackVisible(false);
          if (!user) return;
          try {
            // Add habit to today's plan
            const todayStr = getTodayString();
            const updated = plannedHabitIds.includes(habitId)
              ? plannedHabitIds
              : [...plannedHabitIds, habitId];
            setPlannedHabitIds(updated);
            const existingPlan = await getTomorrowPlan(user.uid, todayStr);
            await saveTomorrowPlan(user.uid, {
              user_id: user.uid,
              date: todayStr,
              planned_habit_ids: updated,
              planned_challenges: existingPlan?.planned_challenges || [],
              dismissed_habit_ids: existingPlan?.dismissed_habit_ids || [],
              created_at: existingPlan?.created_at || new Date().toISOString(),
              source: 'manual',
            });
            // Save comeback log
            await saveComebackLog(user.uid, { barrierReason, committedHabitId: habitId, committedHabitName: habitName });
          } catch (err) {
            console.warn('Failed to save comeback commitment:', err);
          }
        }}
        onDismiss={() => setComebackVisible(false)}
      />
      <StoryReminderModal
        visible={storyReminderVisible}
        proofPoint={storyReminderProofPoint}
        onSubmit={async (reflection) => {
          setStoryReminderVisible(false);
          if (user) {
            try {
              await saveComebackLog(user.uid, {
                barrierReason: 'story_reminder',
                committedHabitId: '',
                committedHabitName: reflection || '(no reflection)',
              });
            } catch (err) {
              console.warn('Failed to save story reminder log:', err);
            }
          }
        }}
        onDismiss={() => setStoryReminderVisible(false)}
      />
      <RuleModal
        rule={ruleModalRule}
        visible={ruleModalVisible}
        onDismiss={dismissRuleModal}
        onCtaPress={handleRuleModalCta}
      />
      <HabitTidbitModal
        visible={habitTidbitVisible}
        tidbit={habitTidbit}
        onLearnMore={handleHabitLearnMore}
        onDismiss={handleHabitTidbitDismiss}
      />
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

});

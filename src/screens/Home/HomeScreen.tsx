import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { Challenge, Nudge, Category, Team, TeamMemberActivitySummary, BuddyChallenge, ProgramEnrollment, ProgramDay, MicroGoal, Goal, GoalFollowThrough, PlannedItem, TomorrowChallenge } from '../../types';
import { getActiveChallenges, getActiveExtendedChallenges, createChallenge, activateScheduledChallenges } from '../../services/challenges';
import { getActiveEnrollment, getTodaysProgramContent, checkAndProcessMissedDays } from '../../services/programs';
import { getPendingInviteCount, getActiveBuddyChallenges } from '../../services/buddyChallenge';
import { getActiveHabits, logHabitCompletion, getWeeklyCompletionCounts, getHabitsStreaks } from '../../services/habits';
import { HabitStreakInfo } from '../../types';
import { getUserCategories } from '../../services/categories';
import { getUserTeam, logTeamActivity, getTeamMemberActivitySummaryOptimized } from '../../services/teams';
import {
  calculateHabitPoints,
  calculateMicroGoalPoints,
  calculateCleanSweepBonus,
  updateWillpowerStats,
  getWillpowerStats,
  getStreakMultiplier,
} from '../../services/willpower';
import { HabitDifficulty } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { useWalkthrough } from '../../context/WalkthroughContext';
import { WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay, SpotlightLayout } from '../../components/walkthrough/WalkthroughOverlay';
import { PointsPopup } from '../../components/common/PointsPopup';
import { PointsAlertModal } from '../../components/common/PointsAlertModal';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
import { PlanIntroModal } from '../../components/common/PlanIntroModal';
import { GoalPromptModal } from '../../components/common/GoalPromptModal';
import { ChallengesUnlockModal } from '../../components/common/ChallengesUnlockModal';
import { LevelUpPopup } from '../../components/common/LevelUpPopup';
import { shouldShowPointsAlert } from '../../services/alertPreferences';
import { FunFactModal } from '../../components/home/FunFactModal';
import { getTodaysFunFact } from '../../services/funFacts';
import { FunFact } from '../../types';
import { CleanSweepPopup } from '../../components/home/CleanSweepPopup';
import { ComebackModal } from '../../components/home/ComebackModal';
import { HabitTidbitModal } from '../../components/habits/HabitTidbitModal';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { selectHabitTidbit, recordTidbitShown, recordLearnMoreTap } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { getTodaysMicroGoals, createMicroGoal, completeMicroGoal, deleteMicroGoal } from '../../services/microGoals';
import { convertPlannedChallengesToChallenges, getTomorrowPlan, saveTomorrowPlan } from '../../services/dailyPlan';
import { exportToCalendar } from '../../services/calendarExport';
import { getTodayString } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { getActiveGoals, computeGoalFollowThrough } from '../../services/goals';
import { markPointsIntroSeen, markPlanIntroSeen, dismissGoalPrompt, markChallengesUnlockSeen, incrementAppOpenCount } from '../../services/users';
import { runGoalsMigration } from '../../services/dataMigration';
import { ReflectionGrade } from '../../types';
import { resolveLayout } from '../../services/homeLayout';
import { SECTION_REGISTRY } from './sections';
import { HomeData, HomeCallbacks, HomeRefs, WillpowerStatsData } from './sections/types';
import { ZONE_CONFIG, SECTION_TO_ZONE, HomeSectionId } from '../../constants/homeLayout';
import { ZoneHeader } from '../../components/home/ZoneHeader';

type Props = NativeStackScreenProps<any, 'HomeScreen'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();

  const challengeBtnRef = useRef<View>(null);
  const habitsAddRef = useRef<View>(null);
  const habitAreaRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [spotlightLayout, setSpotlightLayout] = useState<SpotlightLayout | null>(null);

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [extendedChallenges, setExtendedChallenges] = useState<Challenge[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [buddyChallenges, setBuddyChallenges] = useState<BuddyChallenge[]>([]);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completingHabit, setCompletingHabit] = useState<Nudge | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [team, setTeam] = useState<Team | null>(null);
  const [teamSummary, setTeamSummary] = useState<TeamMemberActivitySummary[]>([]);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [pointsAlertVisible, setPointsAlertVisible] = useState(false);
  const [pointsAlertTitle, setPointsAlertTitle] = useState('');
  const [pointsAlertMessage, setPointsAlertMessage] = useState('');
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState('');
  const [funFact, setFunFact] = useState<FunFact | null>(null);
  const [funFactModalVisible, setFunFactModalVisible] = useState(false);
  const [activeProgram, setActiveProgram] = useState<ProgramEnrollment | null>(null);
  const [todaysProgramDay, setTodaysProgramDay] = useState<ProgramDay | null>(null);
  const [programDayNumber, setProgramDayNumber] = useState(0);
  const [programCheckedIn, setProgramCheckedIn] = useState(false);
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>([]);
  const [plannedHabitIds, setPlannedHabitIds] = useState<string[]>([]);
  const [showCleanSweep, setShowCleanSweep] = useState(false);
  const [cleanSweepBonus, setCleanSweepBonus] = useState(0);
  const [showReflectionBanner, setShowReflectionBanner] = useState(false);
  const [reflectedToday, setReflectedToday] = useState(false);
  const [todaysGrade, setTodaysGrade] = useState<ReflectionGrade | undefined>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [willpowerStats, setWillpowerStats] = useState<WillpowerStatsData | null>(null);
  const [goalFollowThrough, setGoalFollowThrough] = useState<Record<string, GoalFollowThrough>>({});
  const [comebackVisible, setComebackVisible] = useState(false);
  const [comebackGoal, setComebackGoal] = useState<Goal | null>(null);
  const comebackShownRef = useRef(false);

  // Habit tidbit state
  const [habitTidbit, setHabitTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [habitTidbitVisible, setHabitTidbitVisible] = useState(false);
  const [habitLearnMoreVisible, setHabitLearnMoreVisible] = useState(false);
  const pendingHabitPointsRef = useRef<{ points: number; alertFn: () => void } | null>(null);

  // Points intro modal (one-time, first habit completion)
  const [pointsIntroVisible, setPointsIntroVisible] = useState(false);

  // Plan intro modal (one-time, first home screen landing after onboarding)
  const [planIntroVisible, setPlanIntroVisible] = useState(false);
  const planIntroCheckedRef = useRef(false);

  // Goal prompt modal (Day 2 - second app open, no goals)
  const [goalPromptVisible, setGoalPromptVisible] = useState(false);
  const goalPromptCheckedRef = useRef(false);

  // Challenges unlock modal (after 3 habit completions)
  const [challengesUnlockVisible, setChallengesUnlockVisible] = useState(false);

  // Track app opens
  const appOpenTrackedRef = useRef(false);

  const handlePopupComplete = useCallback(() => {
    setShowPointsPopup(false);
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
      setShowPointsPopup(true);
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
      setShowPointsPopup(true);
      setPendingAlert(() => pending.alertFn);
    }
  }, []);

  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'HomeScreen';

  const getCatColor = useCallback((catName: string) => {
    const cat = categories.find((c) => c.name === catName);
    return cat?.color || Colors.gray;
  }, [categories]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Run lazy goals migration before loading data
      const didMigrate = await runGoalsMigration(user.uid);
      if (didMigrate) {
        showAlert(
          'Goals Update',
          'Your existing challenges, habits, and programs have been organized under a "General" goal. You can reassign them to specific goals anytime.'
        );
      }

      const [dailyChallenges, extChallenges, habitList, cats, userTeam, todaysFact, inviteCount, activeBuddies, enrollment, todaysMG, activeGoals, wpStats] = await Promise.all([
        getActiveChallenges(user.uid),
        getActiveExtendedChallenges(user.uid),
        getActiveHabits(user.uid),
        getUserCategories(user.uid),
        getUserTeam(user.uid),
        getTodaysFunFact(),
        getPendingInviteCount(user.uid),
        getActiveBuddyChallenges(user.uid),
        getActiveEnrollment(user.uid),
        getTodaysMicroGoals(user.uid),
        getActiveGoals(user.uid),
        getWillpowerStats(user.uid),
      ]);
      setActiveChallenges(dailyChallenges);
      setExtendedChallenges(extChallenges);
      setMicroGoals(todaysMG);

      // Activate scheduled challenges whose date has arrived,
      // convert planned challenges from last night's reflection into real Challenges,
      // and load planned habit IDs for Today's Plan
      try {
        const todayStr = getTodayString();
        const activatedCount = await activateScheduledChallenges(user.uid, todayStr);
        const convertedCount = await convertPlannedChallengesToChallenges(user.uid, todayStr);
        if (activatedCount > 0 || convertedCount > 0) {
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
      } catch (err) {
        console.warn('Planned items conversion failed:', err);
      }

      setGoals(activeGoals);
      setPendingInvites(inviteCount);
      setBuddyChallenges(activeBuddies);
      setHabits(habitList);
      setCategories(cats);
      setTeam(userTeam);
      setFunFact(todaysFact);
      setActiveProgram(enrollment);
      setWillpowerStats(wpStats);

      // Detect streak break and show comeback modal (once per session)
      if (!comebackShownRef.current && wpStats.currentStreak === 0 && activeGoals.length > 0) {
        // Find the first goal with CBT data to surface
        const comebackCandidate = activeGoals.find(
          (g) => g.recovery_plan || g.minimum_action || (g.inner_voice_challenge && g.inner_voice_response)
        );
        if (comebackCandidate) {
          comebackShownRef.current = true;
          setComebackGoal(comebackCandidate);
          setComebackVisible(true);
        }
      }

      // Compute follow-through for each goal
      if (activeGoals.length > 0) {
        try {
          const ftEntries = await Promise.all(
            activeGoals.map(async (g) => {
              const ft = await computeGoalFollowThrough(user.uid, g.id);
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

      try {
        const counts = await getWeeklyCompletionCounts(user.uid);
        setWeeklyCounts(counts);
      } catch (err) {
        console.warn('Weekly counts query failed (composite index may be needed):', err);
      }
      // Fetch streaks for all habits
      if (habitList.length > 0) {
        try {
          const streaks = await getHabitsStreaks(user.uid, habitList.map((h) => h.id));
          setHabitStreaks(streaks);
        } catch (err) {
          console.warn('Habit streaks query failed:', err);
        }
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
  }, [user]);

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

  // Show one-time plan intro on first home screen landing after onboarding
  useEffect(() => {
    if (planIntroCheckedRef.current) return;
    if (!userProfile || isWalkthroughActive) return;
    planIntroCheckedRef.current = true;
    if (!userProfile.has_seen_plan_intro) {
      // Small delay so the home screen renders first
      const timer = setTimeout(() => setPlanIntroVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userProfile, isWalkthroughActive]);

  // Show goal prompt on second app open if user has no goals
  useEffect(() => {
    if (goalPromptCheckedRef.current) return;
    if (!userProfile || isWalkthroughActive || goals.length > 0) return;
    goalPromptCheckedRef.current = true;
    if (
      (userProfile.app_open_count ?? 0) >= 2 &&
      !userProfile.has_dismissed_goal_prompt &&
      userProfile.has_seen_plan_intro // Don't stack with plan intro
    ) {
      const timer = setTimeout(() => setGoalPromptVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userProfile, isWalkthroughActive, goals]);

  // Measure the target ref for the current walkthrough step
  useEffect(() => {
    if (!isMyStep || !currentStepConfig?.target) {
      setSpotlightLayout(null);
      return;
    }
    const refMap: Record<string, React.RefObject<View | null>> = {
      challengeBtn: challengeBtnRef,
      habitsAdd: habitsAddRef,
      habitArea: habitAreaRef,
    };
    const ref = refMap[currentStepConfig.target];
    if (!ref?.current) return;

    // First, scroll to top for challengeBtn, or scroll down a bit for habits
    if (currentStepConfig.target === 'challengeBtn') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStepConfig.target === 'habitsAdd' || currentStepConfig.target === 'habitArea') {
      // Scroll down to make habits section visible
      scrollViewRef.current?.scrollTo({ y: 150, animated: false });
    }

    // Wait for scroll and layout to settle, then measure
    const timer = setTimeout(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setSpotlightLayout({ x, y, width, height });
        }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [isMyStep, currentStepConfig, currentStep]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleHabitTap = (habit: Nudge) => {
    setCompletingHabit(habit);
  };

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
            completingHabit.category_id,
            completingHabit.category_id
          );
          // Refresh team summary after logging activity
          const summary = await getTeamMemberActivitySummaryOptimized(team.id);
          setTeamSummary(summary);
        } catch (teamErr) {
          console.warn('Failed to log team activity:', teamErr);
        }
      }

      // Calculate and award willpower points
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

      // Build points message with multiplier info
      const multiplier = getStreakMultiplier(stats.currentStreak);
      let pointsMessage = `You earned ${pointsEarned} Willpower Point${pointsEarned !== 1 ? 's' : ''}!`;
      if (multiplier > 1) {
        pointsMessage += `\n(${multiplier}x streak bonus applied)`;
      }

      // Prepare alerts to show after popup animation completes
      const showAlerts = async () => {
        // Show level-up popup first if new level reached
        if (updateResult.newLevelReached && updateResult.levelInfo) {
          setLevelUpLevel(updateResult.levelInfo.level);
          setLevelUpTitle(updateResult.levelInfo.title);
          setLevelUpVisible(true);
          return; // Other alerts will be shown after level-up is dismissed
        }

        if (updateResult.newTierReached && updateResult.tierInfo) {
          showAlert(
            'Streak Milestone!',
            `${updateResult.newStreak}-Day Streak: ${updateResult.tierInfo.tierName}!\n\nYou're now earning ${updateResult.tierInfo.multiplier}x points on all activities!`
          );
          setTimeout(async () => {
            const shouldShow = await shouldShowPointsAlert();
            if (shouldShow) {
              setPointsAlertTitle('Habit Logged');
              setPointsAlertMessage(pointsMessage);
              setPointsAlertVisible(true);
            }
          }, 500);
        } else {
          const shouldShow = await shouldShowPointsAlert();
          if (shouldShow) {
            setPointsAlertTitle('Habit Logged');
            setPointsAlertMessage(pointsMessage);
            setPointsAlertVisible(true);
          }
        }
      };

      // Fetch habit tidbit — show it before points popup for a clean sequence
      try {
        const tidbit = await selectHabitTidbit(user.uid, {
          streakDays: stats.currentStreak,
          difficulty,
        });
        if (tidbit) {
          await recordTidbitShown(user.uid, tidbit.id);
          setHabitTidbit(tidbit);
          pendingHabitPointsRef.current = { points: pointsEarned, alertFn: showAlerts };
          setHabitTidbitVisible(true);
          return; // Points popup fires after tidbit is dismissed
        }
      } catch (err) {
        console.warn('Failed to fetch habit tidbit:', err);
      }

      // No tidbit — show points popup immediately as before
      setEarnedPoints(pointsEarned);
      setShowPointsPopup(true);
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

  // --- Micro-Goal Handlers ---

  const handleMicroGoalComplete = async (microGoalId: string) => {
    if (!user) return;
    try {
      const stats = await getWillpowerStats(user.uid);
      const pointsEarned = calculateMicroGoalPoints(stats.currentStreak);

      const { isCleanSweep } = await completeMicroGoal(user.uid, microGoalId, pointsEarned);
      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      // Show points popup
      setEarnedPoints(pointsEarned);
      setShowPointsPopup(true);

      // Prepare post-popup actions
      const showAlerts = async () => {
        if (isCleanSweep) {
          const sweepBonus = calculateCleanSweepBonus(stats.currentStreak);
          await updateWillpowerStats(user.uid, sweepBonus);
          setCleanSweepBonus(sweepBonus);
          setShowCleanSweep(true);
        } else if (updateResult.newLevelReached && updateResult.levelInfo) {
          setLevelUpLevel(updateResult.levelInfo.level);
          setLevelUpTitle(updateResult.levelInfo.title);
          setLevelUpVisible(true);
        }
      };
      setPendingAlert(() => showAlerts);

      // Refresh micro-goals
      const refreshed = await getTodaysMicroGoals(user.uid);
      setMicroGoals(refreshed);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMicroGoalAdd = async (description: string, deadline: string) => {
    if (!user) return;
    await createMicroGoal(user.uid, { description, deadline });
    const refreshed = await getTodaysMicroGoals(user.uid);
    setMicroGoals(refreshed);
  };

  const handleMicroGoalDelete = async (microGoalId: string) => {
    if (!user) return;
    try {
      await deleteMicroGoal(user.uid, microGoalId);
      const refreshed = await getTodaysMicroGoals(user.uid);
      setMicroGoals(refreshed);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Calendar Export ---

  const handleCalendarExport = async (item: PlannedItem) => {
    await exportToCalendar({
      title: item.calendarTitle || item.title,
      notes: item.calendarNotes,
      startDate: item.calendarStartDate,
      endDate: item.calendarEndDate,
    });
  };

  // --- Planned Item Press ---

  const handlePlannedItemPress = (item: PlannedItem) => {
    switch (item.type) {
      case 'habit': {
        const habit = item.sourceData.habit;
        if (habit) handleHabitTap(habit);
        break;
      }
      case 'micro_goal': {
        const mg = item.sourceData.microGoal;
        if (mg && item.status === 'pending') handleMicroGoalComplete(mg.id);
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
  };

  // --- Add to Today ---

  const handleAddTodayChallenge = async (challenge: TomorrowChallenge) => {
    if (!user) return;
    try {
      const todayStr = getTodayString();
      await createChallenge(user.uid, {
        name: challenge.name,
        category_id: challenge.category_id,
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
  };

  const handleToggleTodayHabit = async (habitId: string) => {
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
  };

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

  const homeData: HomeData = {
    activeChallenges,
    extendedChallenges,
    habits,
    categories,
    team,
    teamSummary,
    weeklyCounts,
    habitStreaks,
    funFact,
    pendingInvites,
    buddyChallenges,
    activeProgram,
    todaysProgramDay,
    programDayNumber,
    programCheckedIn,
    microGoals,
    goals,
    showReflectionBanner,
    reflectedToday,
    todaysGrade,
    willpowerStats,
    goalFollowThrough,
    totalHabitsCompleted: userProfile?.totalHabitsCompleted ?? 0,
    whyStatement: userProfile?.why_statement || null,
    hasCompletedWhyDiscovery: userProfile?.has_completed_why_discovery === true,
    plannedHabitIds,
  };

  const homeCallbacks: HomeCallbacks = {
    onNavigate: (screen: string, params?: any) => {
      if (screen === '__funFactModal') {
        setFunFactModalVisible(true);
        return;
      }
      if (screen === '__progressTab') {
        navigation.getParent()?.navigate('Goals');
        return;
      }
      navigation.navigate(screen as any, params);
    },
    onHabitTap: handleHabitTap,
    onMicroGoalComplete: handleMicroGoalComplete,
    onMicroGoalDelete: handleMicroGoalDelete,
    onMicroGoalAdd: handleMicroGoalAdd,
    onMicroGoalPressMore: () => navigation.navigate('CreateMicroGoal' as any),
    getCatColor,
    onGoalTap: (goalId: string) => navigation.navigate('GoalDashboard' as any, { goalId }),
    onCalendarExport: handleCalendarExport,
    onPlannedItemPress: handlePlannedItemPress,
    onAddTodayChallenge: handleAddTodayChallenge,
    onToggleTodayHabit: handleToggleTodayHabit,
  };

  const homeRefs: HomeRefs = {
    challengeBtnRef,
    habitsAddRef,
    habitAreaRef,
  };

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
                  refs={homeRefs}
                />
              );
            })}
          </React.Fragment>
        ))}

      <HabitCompletionModal
        visible={!!completingHabit}
        habitName={completingHabit?.name || ''}
        onSubmit={handleHabitComplete}
        onCancel={() => setCompletingHabit(null)}
      />
      {isMyStep && (
        <WalkthroughOverlay
          visible
          spotlightLayout={currentStepConfig?.target ? spotlightLayout : undefined}
          stepText={currentStepConfig?.text || ''}
          stepNumber={currentStep}
          totalSteps={WALKTHROUGH_STEPS.length}
          isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
          onNext={nextStep}
          onSkip={skipWalkthrough}
        />
      )}
      </ScrollView>
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
          navigation.navigate('GoalOnboardingFlow');
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
      <PointsAlertModal
        visible={pointsAlertVisible}
        title={pointsAlertTitle}
        message={pointsAlertMessage}
        onDismiss={() => setPointsAlertVisible(false)}
      />
      <LevelUpPopup
        visible={levelUpVisible}
        level={levelUpLevel}
        title={levelUpTitle}
        onContinue={() => setLevelUpVisible(false)}
      />
      <CleanSweepPopup
        visible={showCleanSweep}
        bonusPoints={cleanSweepBonus}
        onComplete={() => setShowCleanSweep(false)}
      />
      <FunFactModal
        visible={funFactModalVisible}
        funFact={funFact}
        onClose={() => setFunFactModalVisible(false)}
      />
      <ComebackModal
        visible={comebackVisible}
        goal={comebackGoal}
        onDismiss={() => setComebackVisible(false)}
        navigation={navigation}
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

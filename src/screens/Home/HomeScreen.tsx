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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { Challenge, PracticeInstance } from '../../types';
import { getActiveChallenges, getActiveExtendedChallenges, createChallenge, activateScheduledChallenges, expireStaleDailyChallenges } from '../../services/challenges';
import { getActiveHabits, completePractice, fetchAllNudgeLogs, getWeeklyCompletionCountsFromLogs, getHabitsStreaksFromLogs, getWeeklyCompletionCounts, updateHabit, ensureCuratedPractices } from '../../services/practices';
import { reconcileHabitReminders, syncHabitReminder, cancelHabitReminder } from '../../services/habitReminders';
import { registerForPushNotifications } from '../../services/notifications';
import { FirstRepReminderModal } from '../../components/home/FirstRepReminderModal';
import { HabitStreakInfo } from '../../types';
import { getWillpowerStats } from '../../services/willpower';
import { HabitDifficulty, PracticeCompletionInput } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { getPractice } from '../../data/practices';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { PointsPopup } from '../../components/common/PointsPopup';
import { PointsIntroModal } from '../../components/common/PointsIntroModal';
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
import { getTodayString, toLocalDateString } from '../../utils/date';
import { hasReflectedToday, getReflection } from '../../services/reflections';
import { markPointsIntroSeen, markChallengesUnlockSeen, incrementAppOpenCount, markReminderPromptSeen } from '../../services/users';
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

  const [homeTab, setHomeTab] = useState<'practices' | 'craving'>('practices');

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [extendedChallenges, setExtendedChallenges] = useState<Challenge[]>([]);
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [completingHabit, setCompletingHabit] = useState<PracticeInstance | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [completedTodayIds, setCompletedTodayIds] = useState<string[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [celebrationBonus, setCelebrationBonus] = useState<string | null>(null);
  const [showReflectionBanner, setShowReflectionBanner] = useState(false);
  const [reflectedToday, setReflectedToday] = useState(false);
  const [todaysGrade, setTodaysGrade] = useState<ReflectionGrade | undefined>();
  const [willpowerStats, setWillpowerStats] = useState<WillpowerStatsData | null>(null);
  // Comeback flow (fired by the "Comeback check-in" rule — see DEFAULT_RULES).
  // Which variant shows depends on whether the user has proof points.
  const [storyReminderProofPoint, setStoryReminderProofPoint] = useState<ProofPoint | null>(null);
  const [comebackProofChecked, setComebackProofChecked] = useState(false);

  // Habit tidbit state
  const [habitTidbit, setHabitTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [habitTidbitVisible, setHabitTidbitVisible] = useState(false);
  const [habitLearnMoreVisible, setHabitLearnMoreVisible] = useState(false);

  // Points intro modal (one-time, first habit completion)
  const [pointsIntroVisible, setPointsIntroVisible] = useState(false);

  // Challenges unlock modal (after 3 habit completions)
  const [challengesUnlockVisible, setChallengesUnlockVisible] = useState(false);
  const [reminderPromptVisible, setReminderPromptVisible] = useState(false);

  // Track app opens
  const appOpenTrackedRef = useRef(false);
  const remindersReconciledRef = useRef(false);
  const seedAttemptedRef = useRef(false);

  // Rule-driven surfaces (admin-configured modals/banners, evaluated on app open).
  // The modal is held while any bespoke modal is up so they never stack.
  const anyModalActive =
    pointsIntroVisible ||
    challengesUnlockVisible ||
    reminderPromptVisible ||
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

  // A modal rule marked component:'comeback' opens the bespoke comeback flow
  // in the rule-modal slot instead of the generic RuleModal.
  const comebackRule = ruleModalRule?.content.component === 'comeback' ? ruleModalRule : null;

  // Prefetch a proof point while the rule modal waits to show: with one, the
  // StoryReminder variant renders; without (or on error), the comeback flow.
  useEffect(() => {
    if (!comebackRule || !user || comebackProofChecked) return;
    (async () => {
      try {
        setStoryReminderProofPoint(await getRandomProofPoint(user.uid));
      } catch {}
      setComebackProofChecked(true);
    })();
  }, [comebackRule, user, comebackProofChecked]);

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

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationVisible(false);
    // Tidbit follows the celebration; alerts fire once the whole chain ends.
    if (habitTidbit) {
      setHabitTidbitVisible(true);
      return;
    }
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [habitTidbit, pendingAlert]);

  // The habit the first-rep reminder attaches to: the onboarding starting
  // point when present, else the first practice on the home.
  const reminderTargetHabit = useMemo(
    () => habits.find((h) => h.practice_id === userProfile?.starting_practice_id) ?? habits[0],
    [habits, userProfile?.starting_practice_id]
  );

  const handleReminderPickTime = useCallback(
    async (time: string) => {
      setReminderPromptVisible(false);
      if (!user) return;
      try {
        await markReminderPromptSeen(user.uid);
        // Permission ask rides the goodwill of the first rep — this also
        // registers the push token the journey rules send to.
        await registerForPushNotifications(user.uid);
        if (reminderTargetHabit) {
          await updateHabit(user.uid, reminderTargetHabit.id, {
            reminder: { time, enabled: true },
          });
          await syncHabitReminder(user.uid, reminderTargetHabit.id, reminderTargetHabit.reminder);
        }
        await refreshProfile();
      } catch (err) {
        console.warn('Failed to set first-rep reminder:', err);
      }
    },
    [user, reminderTargetHabit, refreshProfile]
  );

  const handleReminderDismiss = useCallback(() => {
    setReminderPromptVisible(false);
    if (!user) return;
    markReminderPromptSeen(user.uid)
      .then(() => refreshProfile())
      .catch(() => {});
  }, [user, refreshProfile]);

  const handleHabitTidbitDismiss = useCallback(() => {
    setHabitTidbitVisible(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

  const handleHabitLearnMore = useCallback(() => {
    if (user && habitTidbit) {
      recordLearnMoreTap(user.uid, habitTidbit.id).catch(() => {});
    }
    setHabitTidbitVisible(false);
    setHabitLearnMoreVisible(true);
  }, [user, habitTidbit]);

  const handleHabitLearnMoreClose = useCallback(() => {
    setHabitLearnMoreVisible(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);



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
        setWeeklyCounts(getWeeklyCompletionCountsFromLogs(cachedNudgeLogs));
        // Habit ids logged today — powers the hero counter + card "Done today" state.
        const todayStr = getTodayString();
        setCompletedTodayIds(
          cachedNudgeLogs.filter((l) => l.date === todayStr).map((l) => l.reference_id)
        );
        if (habitList.length > 0) {
          setHabitStreaks(getHabitsStreaksFromLogs(cachedNudgeLogs, habitList.map(h => h.id)));
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


  // Post-first-rep reminder prompt: once, right after the first-ever
  // completion, when no other modal is up — the moment they're most willing
  // to commit to tomorrow's rep (and to grant notification permission).
  useEffect(() => {
    if (!userProfile || reminderPromptVisible) return;
    if (userProfile.has_seen_reminder_prompt) return;
    if ((userProfile.totalHabitsCompleted ?? 0) < 1) return;
    // The Debrief owns the post-first-practice moment — this RN Modal would
    // render on top of it. It shows once the Debrief is done (flag flips).
    if (!userProfile.has_seen_debrief) return;
    if (habits.length === 0 || anyModalActive) return;
    const timer = setTimeout(() => setReminderPromptVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [userProfile, habits, anyModalActive, reminderPromptVisible]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleHabitTap = useCallback(
    (habit: PracticeInstance) => {
      // Curated practices with a briefing run the forward Ready → Go → Capture
      // flow (hosted in this stack, so it returns to Home when done). Everything
      // else keeps the quick retroactive "log it" modal.
      const practice = getPractice(habit.practice_id);
      if (practice?.ready) {
        navigation.navigate('PracticeSession', {
          practiceId: practice.id,
          habitId: habit.id,
          habitName: habit.name,
        });
        return;
      }
      setCompletingHabit(habit);
    },
    [navigation]
  );

  const handleHabitComplete = async (input: PracticeCompletionInput) => {
    if (!user || !completingHabit) return;
    const { difficulty } = input;
    // Log + XP all happen in the shared completePractice path. A failure here
    // propagates to the capture flow, which re-arms its Log button and shows
    // the error — the follow-up celebration work below stays best-effort.
    const { pointsEarned, streakBefore, firstTry, willpower: updateResult } = await completePractice(
      user.uid,
      { id: completingHabit.id, name: completingHabit.name },
      input
    );
    try {
      const bonusLabel = firstTry ? 'First time trying this practice — XP doubled' : null;

      // Optimistically flip the card to "Done today" (loadData reconciles on next focus).
      const completedId = completingHabit.id;
      setCompletedTodayIds((prev) => (prev.includes(completedId) ? prev : [...prev, completedId]));

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
    onSetWeeklyGoal: handleSetWeeklyGoal,
  }), [onNavigate, handleHabitTap, handleSetWeeklyGoal]);


  return (
    <View style={styles.screen}>
      {/* ── Home tab strip ── */}
      <View style={tabStyles.strip}>
        {(['practices', 'craving'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={tabStyles.tab}
            onPress={() => setHomeTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[tabStyles.label, homeTab === tab && tabStyles.labelActive]}>
              {TAB_LABELS[tab]}
            </Text>
            {homeTab === tab && <View style={tabStyles.indicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Practices tab (existing content — layout unchanged) ── */}
      <View style={[styles.tabPanel, homeTab !== 'practices' && styles.tabHidden]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <RuleBanner rule={ruleBannerRule} onDismiss={dismissRuleBanner} />

          {/* Post-first-practice Debrief fallback — shows until the one-time
              Debrief sequence has been viewed (see DebriefScreen) */}
          {!userProfile?.has_seen_debrief && homeData.totalHabitsCompleted > 0 && (
            <TouchableOpacity
              style={debriefStyles.card}
              onPress={() => navigation.navigate('Debrief')}
              activeOpacity={0.85}
            >
              <View style={debriefStyles.iconWrap}>
                <Ionicons name="flash" size={18} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={debriefStyles.title}>See what just happened in your brain</Text>
                <Text style={debriefStyles.sub}>Your first practice did more than you think — 1 min</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}

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
        </ScrollView>
      </View>

      {/* ── Craving Crusher tab ── */}
      <View style={[styles.tabPanel, homeTab !== 'craving' && styles.tabHidden]}>
        <CravingCrusherTab onPress={() => navigation.navigate('CravingCrusher')} />
      </View>

      <HabitCompletionModal
        visible={!!completingHabit}
        habitName={completingHabit?.name || ''}
        practiceId={completingHabit?.practice_id}
        actionPlan={completingHabit?.action_plan}
        onSubmit={handleHabitComplete}
        onCancel={() => setCompletingHabit(null)}
      />
      <HabitCelebrationModal
        visible={celebrationVisible}
        pointsEarned={earnedPoints}
        streakDays={celebrationStreak}
        bonusLabel={celebrationBonus}
        onDismiss={handleCelebrationDismiss}
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
          // Quick-log path for the first-ever completion: chain into the
          // one-time Debrief once this native modal has fully torn down
          // (navigating during its dismissal drops the action on iOS).
          if (!userProfile?.has_seen_debrief && (userProfile?.totalHabitsCompleted ?? 0) > 0) {
            setTimeout(() => navigation.navigate('Debrief'), 300);
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
      <FirstRepReminderModal
        visible={reminderPromptVisible}
        practiceName={reminderTargetHabit?.name ?? 'your practice'}
        onPickTime={handleReminderPickTime}
        onDismiss={handleReminderDismiss}
      />
      {/* The "Comeback check-in" rule fires the bespoke comeback/story flow in
          the rule-modal slot; every other modal rule gets the generic RuleModal.
          Visibility waits on the proof-point check so the right variant shows. */}
      {comebackRule && !storyReminderProofPoint && (
      <ComebackModal
        visible={ruleModalVisible && comebackProofChecked}
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
      {comebackRule && storyReminderProofPoint && (
      <StoryReminderModal
        visible={ruleModalVisible && comebackProofChecked}
        proofPoint={storyReminderProofPoint}
        onSubmit={async (reflection) => {
          dismissRuleModal();
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

const TAB_LABELS = {
  practices: 'Practices',
  craving: 'Craving Crusher',
} as const;

const tabStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
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
  tabHidden: { display: 'none' },
});

const debriefStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    // The hero below pulls itself up by Spacing.lg to escape the scroll
    // padding — this margin is what it consumes, keeping the card clear.
    marginBottom: Spacing.lg + Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  sub: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
});

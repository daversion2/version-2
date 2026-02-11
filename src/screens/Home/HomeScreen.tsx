import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Challenge, Nudge, Category } from '../../types';
import { getActiveChallenge } from '../../services/challenges';
import { getActiveHabits, logHabitCompletion, getWeeklyCompletionCounts, getHabitsStreaks } from '../../services/habits';
import { HabitStreakInfo } from '../../types';
import { getUserCategories } from '../../services/categories';
import {
  calculateHabitPoints,
  updateWillpowerStats,
  getWillpowerStats,
  getStreakMultiplier,
} from '../../services/willpower';
import { HabitDifficulty } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { useWalkthrough } from '../../context/WalkthroughContext';
import { WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay, SpotlightLayout } from '../../components/walkthrough/WalkthroughOverlay';
import { PointsPopup } from '../../components/common/PointsPopup';
import { PointsAlertModal } from '../../components/common/PointsAlertModal';
import { LevelUpPopup } from '../../components/common/LevelUpPopup';
import { shouldShowPointsAlert } from '../../services/alertPreferences';

type Props = NativeStackScreenProps<any, 'HomeScreen'>;

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();

  const challengeBtnRef = useRef<View>(null);
  const habitsAddRef = useRef<View>(null);
  const habitAreaRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [spotlightLayout, setSpotlightLayout] = useState<SpotlightLayout | null>(null);

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completingHabit, setCompletingHabit] = useState<Nudge | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreakInfo>>({});
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [pointsAlertVisible, setPointsAlertVisible] = useState(false);
  const [pointsAlertTitle, setPointsAlertTitle] = useState('');
  const [pointsAlertMessage, setPointsAlertMessage] = useState('');
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState('');

  const handlePopupComplete = useCallback(() => {
    setShowPointsPopup(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'HomeScreen';

  const getCatColor = useCallback((catName: string) => {
    const cat = categories.find((c) => c.name === catName);
    return cat?.color || Colors.gray;
  }, [categories]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [challenge, habitList, cats] = await Promise.all([
        getActiveChallenge(user.uid),
        getActiveHabits(user.uid),
        getUserCategories(user.uid),
      ]);
      setActiveChallenge(challenge);
      setHabits(habitList);
      setCategories(cats);
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
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

      // Calculate and award willpower points
      const difficultyNum = difficulty === 'easy' ? 1 : 2;
      const stats = await getWillpowerStats(user.uid);
      const pointsEarned = calculateHabitPoints(difficultyNum, stats.currentStreak);
      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      setCompletingHabit(null);

      // Build points message with multiplier info
      const multiplier = getStreakMultiplier(stats.currentStreak);
      let pointsMessage = `You earned ${pointsEarned} Willpower Point${pointsEarned !== 1 ? 's' : ''}!`;
      if (multiplier > 1) {
        pointsMessage += `\n(${multiplier}x streak bonus applied)`;
      }

      // Show points popup animation first
      setEarnedPoints(pointsEarned);
      setShowPointsPopup(true);

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
      <Text style={styles.greeting}>{getGreeting()}</Text>

      {/* Challenge Section */}
      <Text style={styles.sectionTitle}>Today's Challenge</Text>

      {activeChallenge ? (
        <Card
          style={styles.challengeCard}
          onPress={() => navigation.navigate('CompleteChallenge', { challenge: activeChallenge })}
        >
          <View style={styles.challengeHeader}>
            <Text style={styles.challengeName}>{activeChallenge.name}</Text>
            <View style={styles.diffBadge}>
              <Text style={styles.diffText}>{activeChallenge.difficulty_expected}</Text>
            </View>
          </View>
          {activeChallenge.description ? (
            <Text style={styles.challengeDesc}>{activeChallenge.description}</Text>
          ) : null}
          {activeChallenge.deadline ? (
            <View style={{ marginTop: Spacing.sm }}>
              <CountdownTimer deadline={activeChallenge.deadline} variant="compact" />
            </View>
          ) : null}
          <Text style={styles.tapHint}>Tap to complete</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.noChallenge}>No active challenge</Text>
          <View ref={challengeBtnRef} collapsable={false}>
            <Button
              title="Start Today's Challenge"
              onPress={() => navigation.navigate('StartChallenge')}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </Card>
      )}

      {/* Habits Section */}
      <View style={styles.habitsHeader}>
        <Text style={styles.sectionTitle}>Habits</Text>
        <View ref={habitsAddRef} collapsable={false}>
          <TouchableOpacity onPress={() => navigation.navigate('ManageHabits')}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {habits.length === 0 ? (
        <View ref={habitAreaRef} collapsable={false}>
          <Card>
            <Text style={styles.noChallenge}>No habits yet</Text>
            <Button
              title="Add a Habit"
              onPress={() => navigation.navigate('ManageHabits')}
              variant="outline"
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>
      ) : (
        habits.map((habit, index) => {
          const done = weeklyCounts[habit.id] || 0;
          const target = habit.target_count_per_week;
          const isComplete = done >= target;
          const streak = habitStreaks[habit.id]?.currentStreak || 0;
          return (
            <View
              key={habit.id}
              ref={index === 0 ? habitAreaRef : undefined}
              collapsable={false}
            >
              <Card style={styles.habitCard} onPress={() => handleHabitTap(habit)}>
                <View style={styles.habitRow}>
                  <Ionicons
                    name={isComplete ? 'checkmark-circle' : 'radio-button-off'}
                    size={24}
                    color={isComplete ? Colors.secondary : Colors.primary}
                  />
                  <View style={styles.habitInfo}>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      {streak > 1 && (
                        <View style={styles.streakBadge}>
                          <Ionicons name="flame" size={14} color={Colors.secondary} />
                          <Text style={styles.streakText}>{streak}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.habitMeta}>
                      <View style={[styles.catBadge, { backgroundColor: getCatColor(habit.category_id) + '20' }]}>
                        <Text style={[styles.catBadgeText, { color: getCatColor(habit.category_id) }]}>
                          {habit.category_id}
                        </Text>
                      </View>
                      <Text style={styles.progressText}>
                        {done} / {target} this week
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="stats-chart" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          );
        })
      )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  greeting: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  challengeCard: { borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  diffBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  challengeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  tapHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },
  noChallenge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  habitCard: { marginBottom: Spacing.sm },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  habitInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  streakText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  reportBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  progressText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  catBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  catBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
});

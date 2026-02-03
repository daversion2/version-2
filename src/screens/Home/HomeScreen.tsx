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
import { getActiveHabits, logHabitCompletion, getWeeklyCompletionCounts } from '../../services/habits';
import { getUserCategories } from '../../services/categories';
import { HabitDifficulty } from '../../types';
import { showAlert } from '../../utils/alert';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { useWalkthrough } from '../../context/WalkthroughContext';
import { WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay, SpotlightLayout } from '../../components/walkthrough/WalkthroughOverlay';

type Props = NativeStackScreenProps<any, 'HomeScreen'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();

  const challengeBtnRef = useRef<View>(null);
  const habitsAddRef = useRef<View>(null);
  const habitAreaRef = useRef<View>(null);
  const [spotlightLayout, setSpotlightLayout] = useState<SpotlightLayout | null>(null);

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completingHabit, setCompletingHabit] = useState<Nudge | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});

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

    const timer = setTimeout(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setSpotlightLayout({ x, y, width, height });
        }
      });
    }, 500);
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

  const handleHabitComplete = async (difficulty: HabitDifficulty) => {
    if (!user || !completingHabit) return;
    try {
      await logHabitCompletion(user.uid, completingHabit.id, difficulty);
      setCompletingHabit(null);
      showAlert('Logged', 'Habit completed.');
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Challenge Section */}
      <Text style={styles.sectionTitle}>Today's Challenge</Text>

      {activeChallenge ? (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CompleteChallenge', { challenge: activeChallenge })
          }
          activeOpacity={0.8}
        >
          <Card style={styles.challengeCard}>
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
        </TouchableOpacity>
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
          return (
            <View
              key={habit.id}
              ref={index === 0 ? habitAreaRef : undefined}
              collapsable={false}
            >
              <TouchableOpacity
                onPress={() => handleHabitTap(habit)}
                activeOpacity={0.7}
              >
                <Card style={styles.habitCard}>
                  <View style={styles.habitRow}>
                    <Ionicons
                      name={isComplete ? 'checkmark-circle' : 'radio-button-off'}
                      size={24}
                      color={isComplete ? Colors.secondary : Colors.primary}
                    />
                    <View style={styles.habitInfo}>
                      <Text style={styles.habitName}>{habit.name}</Text>
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
                  </View>
                </Card>
              </TouchableOpacity>
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
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
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

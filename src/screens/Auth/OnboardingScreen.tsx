import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingComplete } from '../../services/users';
import { createHabit, logHabitCompletion } from '../../services/habits';
import { HABIT_LIBRARY } from '../../data/habitLibrary';
import { db } from '../../services/firebase';

const { width } = Dimensions.get('window');

const TIMER_DURATION = 60;

import { MANTRA_EXAMPLES } from '../../data/mantras';

// ============================================================================
// COMPONENT
// ============================================================================

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Navigation
  const [step, setStep] = useState(1);

  // Screen 3: Timer
  const [timerSeconds, setTimerSeconds] = useState(TIMER_DURATION);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerProgress = useRef(new Animated.Value(1)).current;

  // Expandable science sections
  const [showWelcomeScience, setShowWelcomeScience] = useState(false);
  const [showSettleScience, setShowSettleScience] = useState(false);
  const [showMantraScience, setShowMantraScience] = useState(false);

  // Screen 5: Mantra
  const [mantra, setMantra] = useState('');

  // Screen 6: Habit Selection
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  // Screen 7: Saving
  const [saving, setSaving] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted) return;
    if (timerSeconds <= 0) {
      setTimerStarted(false);
      return;
    }
    const id = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timerStarted, timerSeconds]);

  // Animate timer progress
  useEffect(() => {
    if (!timerStarted) return;
    Animated.timing(timerProgress, {
      toValue: 0,
      duration: timerSeconds * 1000,
      useNativeDriver: false,
    }).start();
  }, [timerStarted]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToStep = (s: number) => {
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    if (step > 1) goToStep(step - 1);
  };

  // ============================================================================
  // SKIP ONBOARDING
  // ============================================================================

  const handleSkipOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  // ============================================================================
  // COMPLETION LOGIC (Screen 7)
  // ============================================================================

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const morningMeditation = HABIT_LIBRARY.find((h) => h.id === 'morning-meditation')!;

      // 1. Create meditation habit
      const meditationHabitId = await createHabit(user.uid, {
        name: 'Meditation',
        target_count_per_week: 5,
        action_plan: morningMeditation.action_plan,
      });

      // 2. Log today as Day 1 completion
      await logHabitCompletion(user.uid, meditationHabitId, 'easy');

      // 3. Create the selected additional habit
      if (selectedHabitId) {
        const selectedHabit = HABIT_LIBRARY.find((h) => h.id === selectedHabitId)!;
        await createHabit(user.uid, {
          name: selectedHabit.name,
          target_count_per_week: selectedHabit.suggested_target_per_week,
          action_plan: selectedHabit.action_plan,
        });
      }

      // 4. Save onboarding data to user doc
      const mantraObj = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        text: mantra,
        created_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), {
        redirect_mantra: mantra,
        mantras: [mantraObj],
        active_mantra_id: mantraObj.id,
      }, { merge: true });

      // 5. Mark onboarding complete
      await markOnboardingComplete(user.uid, true);

      // 6. Refresh profile to trigger navigation
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
      setSaving(false);
    }
  };

  // ============================================================================
  // SCREEN 1 — WELCOME
  // ============================================================================

  const renderScreen1 = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Welcome to{'\n'}Neuro Nudge</Text>
        <Text style={styles.welcomeSubtitle}>
          We're going to start with a short, 60-second exercise. You'll sit quietly and observe your thoughts — that's it.
        </Text>
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setShowWelcomeScience(!showWelcomeScience)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleTextLight}>See why this works</Text>
          <Ionicons
            name={showWelcomeScience ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.white}
            style={{ opacity: 0.8 }}
          />
        </TouchableOpacity>
        {showWelcomeScience && (
          <Text style={styles.welcomeWhyBody}>
            Your brain doesn't need long to shift. A 2026 Harvard study found measurable brainwave changes in beginners within 2–3 minutes of their first meditation. The trick isn't emptying your mind — it's watching it.
          </Text>
        )}
      </View>
      <Button
        title="Let's go →"
        onPress={() => goToStep(2)}
        style={styles.welcomeButton}
      />
    </View>
  );

  // ============================================================================
  // SCREEN 2 — SETTLE
  // ============================================================================

  const renderScreen2 = () => (
    <View style={styles.stageContent}>
      <View style={styles.intentionBox}>
        <Text style={styles.intentionTitle}>Your only job</Text>
        <Text style={styles.intentionBody}>
          Sit still. Notice what comes up.{'\n'}
          Don't try to fix, control, or quiet anything.{'\n'}
          Just observe.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.expandToggleDark}
        onPress={() => setShowSettleScience(!showSettleScience)}
        activeOpacity={0.7}
      >
        <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
        <Text style={styles.expandToggleText}>Why this works</Text>
        <Ionicons
          name={showSettleScience ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {showSettleScience && (
        <View style={styles.expandedContent}>
          <Text style={styles.expandedText}>
            When you stop doing, your brain's default mode network kicks in — surfacing the thought patterns that run on autopilot all day. This 60 seconds makes them visible.
          </Text>
        </View>
      )}
    </View>
  );

  // ============================================================================
  // SCREEN 3 — 60-SECOND SIT
  // ============================================================================

  const renderScreen3 = () => {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const timerDone = timerSeconds === 0 && timerStarted === false;

    const borderColor = timerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.lightGray, Colors.primary],
    });

    if (!timerStarted && !timerDone) {
      // Pre-start state
      return (
        <View style={[styles.stageContent, styles.timerCenter]}>
          <Text style={styles.timerPreLabel}>When you tap the button, a 60-second timer will begin.</Text>
          <View style={styles.timerRing}>
            <Text style={styles.timerDisplay}>1:00</Text>
          </View>
          <Text style={styles.timerPreSubtext}>
            Put the phone down. Close your eyes if you like.{'\n'}The app will wait for you.
          </Text>
        </View>
      );
    }

    // Active timer or complete
    return (
      <View style={[styles.stageContent, styles.timerCenter]}>
        <Text style={styles.timerLabel}>
          {timerDone ? "Time's up. Take a breath." : 'Sit quietly. Notice your thoughts.'}
        </Text>
        <Animated.View style={[styles.timerRing, { borderColor }]}>
          <Text style={styles.timerDisplay}>{timerDone ? '✓' : display}</Text>
        </Animated.View>
        <Text style={styles.timerSubtext}>
          {timerDone
            ? ''
            : 'The app will continue automatically.'}
        </Text>
      </View>
    );
  };

  // ============================================================================
  // SCREEN 4 — VALIDATION BRIDGE
  // ============================================================================

  const renderScreen4 = () => (
    <View style={[styles.stageContent, styles.bridgeCenter]}>
      <Text style={styles.bridgeHeadline}>
        There's a lot going on in there, right?
      </Text>
      <Text style={styles.bridgeBody}>
        That's normal — your brain generates thousands of thoughts a day, and many of them are negative. Left unchecked, they quietly shape your decisions, motivation, and habits.
      </Text>
      <Text style={styles.bridgeKickerHeadline}>
        That's why we use a redirect mantra
      </Text>
      <Text style={styles.bridgeKicker}>
        A short phrase you repeat when negativity shows up. Your brain can only hold one thought at a time. Give it the mantra, and the negative thought has nowhere to go.
      </Text>
    </View>
  );

  // ============================================================================
  // SCREEN 5 — MANTRA SELECTION
  // ============================================================================

  const renderScreen5 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Pick your redirect mantra
      </Text>
      <Text style={styles.mantraSubtext}>
        A short phrase you'll repeat when your mind drifts. Write your own or tap one below.
      </Text>
      <TextInput
        style={styles.mantraInput}
        value={mantra}
        onChangeText={setMantra}
        placeholder="Type your mantra..."
        placeholderTextColor={Colors.gray}
        maxLength={100}
        returnKeyType="done"
      />
      <View style={styles.mantraExamples}>
        {MANTRA_EXAMPLES.map((example) => (
          <TouchableOpacity
            key={example}
            style={[styles.mantraChip, mantra === example && styles.mantraChipSelected]}
            onPress={() => setMantra(example)}
            activeOpacity={0.7}
          >
            <Text style={[styles.mantraChipText, mantra === example && styles.mantraChipTextSelected]}>
              {example}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.howToCard}>
        <Ionicons name="repeat-outline" size={18} color={Colors.secondary} />
        <Text style={styles.scienceText}>
          Catch a negative thought, repeat your mantra silently — over and over — until it passes.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.expandToggleDark}
        onPress={() => setShowMantraScience(!showMantraScience)}
        activeOpacity={0.7}
      >
        <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
        <Text style={styles.expandToggleText}>Why mantras work</Text>
        <Ionicons
          name={showMantraScience ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {showMantraScience && (
        <View style={styles.expandedContent}>
          <Text style={styles.expandedText}>
            Self-directed speech activates your prefrontal cortex — the brain region responsible for focus and self-control. A personal mantra interrupts autopilot thinking and gives your brain a clear instruction.
          </Text>
        </View>
      )}
    </View>
  );

  // ============================================================================
  // SCREEN 6 — HABIT SELECTION
  // ============================================================================

  const renderScreen6 = () => {
    const availableHabits = HABIT_LIBRARY.filter((h) => h.id !== 'morning-meditation');

    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          You've already completed your first meditation. It's now locked in as your foundation habit.
        </Text>

        {/* Locked meditation row */}
        <View style={styles.lockedHabitRow}>
          <View style={styles.lockedHabitIcon}>
            <Ionicons name="lock-closed" size={18} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedHabitName}>Meditation</Text>
            <Text style={styles.lockedHabitMeta}>5x/week · Your foundation habit</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
        </View>

        {/* Additional habit selection */}
        <Text style={styles.habitSectionLabel}>+ ONE MORE HABIT</Text>
        <Text style={styles.habitSectionBody}>
          Start with just one. You can always add more later.
        </Text>

        {availableHabits.map((habit) => {
          const isSelected = selectedHabitId === habit.id;
          return (
            <TouchableOpacity
              key={habit.id}
              style={[styles.habitRow, isSelected && styles.habitRowSelected]}
              onPress={() => setSelectedHabitId(habit.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitRowName, isSelected && styles.habitRowNameSelected]}>
                  {habit.name}
                </Text>
                <Text style={styles.habitRowMeta}>
                  {habit.suggested_target_per_week}x/week
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ============================================================================
  // SCREEN 7 — REVEAL
  // ============================================================================

  const renderScreen7 = () => {
    const selectedHabit = HABIT_LIBRARY.find((h) => h.id === selectedHabitId);

    return (
      <View style={styles.revealContainer}>
        <Text style={styles.revealTitle}>Your starting point</Text>

        {/* Mantra anchor card */}
        <View style={styles.mantraCard}>
          <Text style={styles.mantraCardLabel}>YOUR REDIRECT MANTRA</Text>
          <Text style={styles.mantraCardText}>"{mantra}"</Text>
        </View>

        {/* Habit rows */}
        <View style={styles.revealHabitRow}>
          <View style={styles.revealHabitBadge}>
            <Ionicons name="checkmark" size={16} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.revealHabitName}>Meditation</Text>
            <Text style={styles.revealHabitMeta}>5x/week · Day 1 complete</Text>
          </View>
        </View>

        {selectedHabit && (
          <View style={styles.revealHabitRow}>
            <View style={[styles.revealHabitBadge, { backgroundColor: Colors.secondary }]}>
              <Ionicons name="add" size={16} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.revealHabitName}>{selectedHabit.name}</Text>
              <Text style={styles.revealHabitMeta}>
                {selectedHabit.suggested_target_per_week}x/week · Starts today
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // PROGRESS DOTS (Screens 2-6 only)
  // ============================================================================

  const renderDots = () => {
    const totalDots = 5; // Screens 2-6
    const currentDot = step - 1; // step 2 = dot 1, step 6 = dot 5

    return (
      <View style={styles.dotsRow}>
        {Array.from({ length: totalDots }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i + 1 <= currentDot && styles.dotActive,
              i + 1 === currentDot && styles.dotCurrent,
            ]}
          />
        ))}
      </View>
    );
  };

  // ============================================================================
  // BOTTOM BUTTONS
  // ============================================================================

  const renderBottomNav = () => {
    // Screen 1: handled in renderScreen1
    if (step === 1) return null;

    // Screen 2: "I'm ready"
    if (step === 2) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button title="I'm ready" onPress={() => goToStep(3)} style={styles.nextButton} />
        </View>
      );
    }

    // Screen 3: Timer
    if (step === 3) {
      const timerDone = timerSeconds === 0 && !timerStarted;
      return (
        <View>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            {!timerStarted && !timerDone ? (
              <Button
                title="Start the minute"
                onPress={() => setTimerStarted(true)}
                style={styles.nextButton}
              />
            ) : timerDone ? (
              <Button
                title="Continue →"
                onPress={() => goToStep(4)}
                style={styles.nextButton}
              />
            ) : (
              <View style={styles.nextButton} />
            )}
          </View>
          <TouchableOpacity
            onPress={handleSkipOnboarding}
            style={styles.skipOnboardingButton}
            disabled={saving}
          >
            <Text style={styles.skipOnboardingText}>Just take me to the app</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Screen 4: Validation bridge
    if (step === 4) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button
            title="Give me a mantra →"
            onPress={() => goToStep(5)}
            style={styles.nextButton}
          />
        </View>
      );
    }

    // Screen 5: Mantra
    if (step === 5) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button
            title="This is my redirect →"
            onPress={() => goToStep(6)}
            disabled={!mantra.trim()}
            style={styles.nextButton}
          />
        </View>
      );
    }

    // Screen 6: Habit selection
    if (step === 6) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button
            title="This is my starting point →"
            onPress={() => goToStep(7)}
            disabled={!selectedHabitId}
            style={styles.nextButton}
          />
        </View>
      );
    }

    // Screen 7: Reveal
    if (step === 7) {
      return (
        <View style={styles.navBarCenter}>
          <Button
            title="Keep moving forward →"
            onPress={handleComplete}
            loading={saving}
            disabled={saving}
            style={styles.fullWidthButton}
          />
        </View>
      );
    }

    return null;
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Screen 1: Full-screen welcome (no chrome)
  if (step === 1) return renderScreen1();

  // Screen 7: Full-screen reveal (no dots)
  if (step === 7) {
    return (
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingTop: Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {renderScreen7()}
        </ScrollView>
        {renderBottomNav()}
      </View>
    );
  }

  // Screens 2-6: Standard layout with dots
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerBar}>
        {renderDots()}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 2 && renderScreen2()}
        {step === 3 && renderScreen3()}
        {step === 4 && renderScreen4()}
        {step === 5 && renderScreen5()}
        {step === 6 && renderScreen6()}
      </ScrollView>

      {renderBottomNav()}
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Layout
  screen: { flex: 1, backgroundColor: Colors.white },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // Header / Dots
  headerBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },
  dotActive: { backgroundColor: Colors.primary, opacity: 0.4 },
  dotCurrent: { opacity: 1, width: 16 },

  // Nav Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  navBarCenter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  nextButton: { minWidth: 140 },
  fullWidthButton: { width: width - Spacing.lg * 2 },
  skipOnboardingButton: { alignItems: 'center', paddingVertical: Spacing.md, paddingBottom: Spacing.lg },
  skipOnboardingText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textDecorationLine: 'underline' },

  // Shared content
  stageContent: { flex: 1 },
  stageIntro: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },

  // Screen 1: Welcome
  welcomeContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeButton: { width: width - Spacing.lg * 2, marginBottom: Spacing.xxl },
  welcomeTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  welcomeWhyBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 22,
    marginTop: Spacing.md,
  },

  // Expandable toggle (light bg — used on Screens 2, 5)
  expandToggleDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  expandToggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  // Expandable toggle (dark bg — used on Screen 1 welcome)
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  expandToggleTextLight: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.8,
  },
  // Expanded content area
  expandedContent: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  expandedText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },

  // Screen 2: Settle
  intentionBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  intentionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  intentionBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
  },

  // Screen 3: Timer
  timerCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl },
  timerPreLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  timerPreSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 20,
  },
  timerLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  timerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDisplay: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
    color: Colors.primary,
  },
  timerSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  // Screen 4: Validation bridge
  bridgeCenter: {
    justifyContent: 'center',
    paddingTop: Spacing.xl,
  },
  bridgeHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 34,
    marginBottom: Spacing.xl,
  },
  bridgeBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  bridgeKickerHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    lineHeight: 26,
    marginBottom: Spacing.xs,
  },
  bridgeKicker: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
    lineHeight: 24,
  },

  // Screen 5: Mantra
  howToCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  scienceText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  mantraSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  mantraInput: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  mantraExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  mantraChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  mantraChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  mantraChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  mantraChipTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },

  // Screen 6: Habit selection
  lockedHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  lockedHabitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedHabitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  lockedHabitMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  habitSectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  habitSectionBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  habitRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  habitRowName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  habitRowNameSelected: {
    color: Colors.primary,
  },
  habitRowMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Screen 7: Reveal
  revealContainer: { alignItems: 'center' },
  revealTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  mantraCard: {
    width: '100%',
    backgroundColor: Colors.primary + '10',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mantraCardLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  mantraCardText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 30,
  },
  revealHabitRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  revealHabitBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealHabitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  revealHabitMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
});

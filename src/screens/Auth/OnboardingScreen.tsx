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
  ActivityIndicator,
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

import {
  OnboardingConfig,
  OnboardingStep,
  DEFAULT_ONBOARDING_CONFIG,
  STEP_CONTENT_DEFAULTS,
  getOnboardingConfigWithTimeout,
} from '../../services/onboardingConfig';

// ============================================================================
// COMPONENT
// ============================================================================

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Admin-configurable flow (config/onboarding doc, defaults as fallback).
  // The flow is the enabled steps in order; Welcome is always first and
  // Reveal always last (the config sanitizer guarantees this).
  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_ONBOARDING_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = config.steps.filter((s) => s.enabled);
  const currentStep: OnboardingStep | undefined =
    steps[Math.min(stepIndex, steps.length - 1)];

  // Step contents used outside their own renderer (completion, reveal)
  const habitStep = config.steps.find((s) => s.type === 'habit_picker');
  const habitContent = habitStep?.content ?? STEP_CONTENT_DEFAULTS.habit_picker;
  const habitStepEnabled = habitStep?.enabled === true;
  const timerContent =
    config.steps.find((s) => s.type === 'timer')?.content ?? STEP_CONTENT_DEFAULTS.timer;

  // Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(STEP_CONTENT_DEFAULTS.timer.seconds);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getOnboardingConfigWithTimeout().then((cfg) => {
      setConfig(cfg);
      const timer = cfg.steps.find((s) => s.type === 'timer');
      setTimerSeconds(timer?.content.seconds ?? STEP_CONTENT_DEFAULTS.timer.seconds);
      setConfigLoaded(true);
    });
  }, []);

  // Expandable science sections, keyed by step id (text pages are dynamic)
  const [scienceOpen, setScienceOpen] = useState<Record<string, boolean>>({});
  const toggleScience = (stepId: string) =>
    setScienceOpen((prev) => ({ ...prev, [stepId]: !prev[stepId] }));

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

  const goToIndex = (i: number) => {
    setStepIndex(Math.max(0, Math.min(i, steps.length - 1)));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goNext = () => goToIndex(stepIndex + 1);

  const handleBack = () => {
    if (stepIndex > 0) goToIndex(stepIndex - 1);
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
      // 1+2. Foundation habit (created + Day 1 logged) — only when the
      // habit step is part of the flow
      if (habitStepEnabled) {
        // Fall back to the default foundation habit if the configured id is bad
        const foundationLibraryHabit =
          HABIT_LIBRARY.find((h) => h.id === habitContent.foundation_habit_id) ??
          HABIT_LIBRARY.find((h) => h.id === 'morning-meditation')!;

        const foundationHabitId = await createHabit(user.uid, {
          name: habitContent.foundation_habit_name,
          target_count_per_week: habitContent.foundation_target_per_week,
          action_plan: foundationLibraryHabit.action_plan,
        });
        await logHabitCompletion(user.uid, foundationHabitId, 'easy');

        // 3. Create the selected additional habit
        if (selectedHabitId) {
          const selectedHabit = HABIT_LIBRARY.find((h) => h.id === selectedHabitId)!;
          await createHabit(user.uid, {
            name: selectedHabit.name,
            target_count_per_week: selectedHabit.suggested_target_per_week,
            action_plan: selectedHabit.action_plan,
          });
        }
      }

      // 4. Save the mantra — only if one was collected (mantra step in flow)
      if (mantra.trim()) {
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
      }

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

  const renderWelcome = (step: OnboardingStep) => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>{step.content.title}</Text>
        <Text style={styles.welcomeSubtitle}>{step.content.subtitle}</Text>
        {!!step.content.science && (
          <TouchableOpacity
            style={styles.expandToggle}
            onPress={() => toggleScience(step.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandToggleTextLight}>See why this works</Text>
            <Ionicons
              name={scienceOpen[step.id] ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.white}
              style={{ opacity: 0.8 }}
            />
          </TouchableOpacity>
        )}
        {scienceOpen[step.id] && !!step.content.science && (
          <Text style={styles.welcomeWhyBody}>{step.content.science}</Text>
        )}
      </View>
      <Button
        title={step.next_button}
        onPress={goNext}
        style={styles.welcomeButton}
      />
    </View>
  );

  // ============================================================================
  // SCREEN 2 — SETTLE
  // ============================================================================

  const renderScienceToggle = (step: OnboardingStep, label = 'Why this works') =>
    !!step.content.science && (
      <>
        <TouchableOpacity
          style={styles.expandToggleDark}
          onPress={() => toggleScience(step.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
          <Text style={styles.expandToggleText}>{label}</Text>
          <Ionicons
            name={scienceOpen[step.id] ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.primary}
          />
        </TouchableOpacity>
        {scienceOpen[step.id] && (
          <View style={styles.expandedContent}>
            <Text style={styles.expandedText}>{step.content.science}</Text>
          </View>
        )}
      </>
    );

  const renderSettle = (step: OnboardingStep) => (
    <View style={styles.stageContent}>
      <View style={styles.intentionBox}>
        <Text style={styles.intentionTitle}>{step.content.box_title}</Text>
        <Text style={styles.intentionBody}>{step.content.box_body}</Text>
      </View>
      {renderScienceToggle(step)}
    </View>
  );

  // Generic admin-added info page: bridge-style headline + body + optional science
  const renderTextPage = (step: OnboardingStep) => (
    <View style={styles.stageContent}>
      <Text style={styles.bridgeHeadline}>{step.content.headline}</Text>
      <Text style={styles.bridgeBody}>{step.content.body}</Text>
      {renderScienceToggle(step)}
    </View>
  );

  // ============================================================================
  // SCREEN 3 — 60-SECOND SIT
  // ============================================================================

  const renderTimer = (step: OnboardingStep) => {
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
      const preMinutes = Math.floor(step.content.seconds / 60);
      const preSeconds = step.content.seconds % 60;
      return (
        <View style={[styles.stageContent, styles.timerCenter]}>
          <Text style={styles.timerPreLabel}>{step.content.pre_label}</Text>
          <View style={styles.timerRing}>
            <Text style={styles.timerDisplay}>{`${preMinutes}:${String(preSeconds).padStart(2, '0')}`}</Text>
          </View>
          <Text style={styles.timerPreSubtext}>{step.content.pre_subtext}</Text>
        </View>
      );
    }

    // Active timer or complete
    return (
      <View style={[styles.stageContent, styles.timerCenter]}>
        <Text style={styles.timerLabel}>
          {timerDone ? step.content.done_label : step.content.active_label}
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

  const renderBridge = (step: OnboardingStep) => (
    <View style={[styles.stageContent, styles.bridgeCenter]}>
      <Text style={styles.bridgeHeadline}>{step.content.headline}</Text>
      <Text style={styles.bridgeBody}>{step.content.body}</Text>
      <Text style={styles.bridgeKickerHeadline}>{step.content.kicker_headline}</Text>
      <Text style={styles.bridgeKicker}>{step.content.kicker_body}</Text>
    </View>
  );

  // ============================================================================
  // SCREEN 5 — MANTRA SELECTION
  // ============================================================================

  const renderMantraPicker = (step: OnboardingStep) => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{step.content.intro}</Text>
      <Text style={styles.mantraSubtext}>{step.content.subtext}</Text>
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
        {(step.content.examples as string[]).map((example) => (
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
        <Text style={styles.scienceText}>{step.content.howto}</Text>
      </View>
      {renderScienceToggle(step, 'Why mantras work')}
    </View>
  );

  // ============================================================================
  // SCREEN 6 — HABIT SELECTION
  // ============================================================================

  const renderHabitPicker = (step: OnboardingStep) => {
    const offered = (step.content.offered_habit_ids as string[]) ?? [];
    const availableHabits = HABIT_LIBRARY.filter(
      (h) =>
        h.id !== step.content.foundation_habit_id &&
        (offered.length === 0 || offered.includes(h.id))
    );

    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>{step.content.intro}</Text>

        {/* Locked foundation habit row */}
        <View style={styles.lockedHabitRow}>
          <View style={styles.lockedHabitIcon}>
            <Ionicons name="lock-closed" size={18} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedHabitName}>{step.content.foundation_habit_name}</Text>
            <Text style={styles.lockedHabitMeta}>
              {step.content.foundation_target_per_week}x/week · Your foundation habit
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
        </View>

        {/* Additional habit selection */}
        <Text style={styles.habitSectionLabel}>+ ONE MORE HABIT</Text>
        <Text style={styles.habitSectionBody}>{step.content.section_body}</Text>

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

  const renderReveal = (step: OnboardingStep) => {
    const selectedHabit = habitStepEnabled
      ? HABIT_LIBRARY.find((h) => h.id === selectedHabitId)
      : undefined;

    return (
      <View style={styles.revealContainer}>
        <Text style={styles.revealTitle}>{step.content.title}</Text>

        {/* Mantra anchor card — only if a mantra was collected */}
        {!!mantra.trim() && (
          <View style={styles.mantraCard}>
            <Text style={styles.mantraCardLabel}>YOUR REDIRECT MANTRA</Text>
            <Text style={styles.mantraCardText}>"{mantra}"</Text>
          </View>
        )}

        {/* Habit rows — only if the habit step was part of the flow */}
        {habitStepEnabled && (
          <View style={styles.revealHabitRow}>
            <View style={styles.revealHabitBadge}>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.revealHabitName}>{habitContent.foundation_habit_name}</Text>
              <Text style={styles.revealHabitMeta}>
                {habitContent.foundation_target_per_week}x/week · Day 1 complete
              </Text>
            </View>
          </View>
        )}

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
    const totalDots = steps.length - 2; // middle steps (between welcome and reveal)
    const currentDot = stepIndex; // index 1 = dot 1, ...

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
    if (!currentStep || currentStep.type === 'welcome') return null;

    // Reveal: completion button only
    if (currentStep.type === 'reveal') {
      return (
        <View style={styles.navBarCenter}>
          <Button
            title={currentStep.next_button}
            onPress={handleComplete}
            loading={saving}
            disabled={saving}
            style={styles.fullWidthButton}
          />
        </View>
      );
    }

    const backButton = (
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    );

    // Timer: start → (running, no button) → continue, plus the skip link
    if (currentStep.type === 'timer') {
      const timerDone = timerSeconds === 0 && !timerStarted;
      return (
        <View>
          <View style={styles.navBar}>
            {backButton}
            {!timerStarted && !timerDone ? (
              <Button
                title={currentStep.content.start_button}
                onPress={() => setTimerStarted(true)}
                style={styles.nextButton}
              />
            ) : timerDone ? (
              <Button title={currentStep.next_button} onPress={goNext} style={styles.nextButton} />
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

    // All other middle steps: back + next, with per-type gating
    const nextDisabled =
      currentStep.type === 'mantra_picker'
        ? !mantra.trim()
        : currentStep.type === 'habit_picker'
          ? !selectedHabitId
          : false;

    return (
      <View style={styles.navBar}>
        {backButton}
        <Button
          title={currentStep.next_button}
          onPress={goNext}
          disabled={nextDisabled}
          style={styles.nextButton}
        />
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Hold rendering until the (timeout-guarded) config fetch settles so the
  // user never sees default copy swap to admin copy mid-read
  if (!configLoaded || !currentStep) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Welcome: full-screen layout (no chrome)
  if (currentStep.type === 'welcome') return renderWelcome(currentStep);

  // Reveal: full-screen layout (no dots)
  if (currentStep.type === 'reveal') {
    return (
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingTop: Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {renderReveal(currentStep)}
        </ScrollView>
        {renderBottomNav()}
      </View>
    );
  }

  // Middle steps: standard layout with dots
  const renderCurrentStep = () => {
    switch (currentStep.type) {
      case 'settle':
        return renderSettle(currentStep);
      case 'timer':
        return renderTimer(currentStep);
      case 'bridge':
        return renderBridge(currentStep);
      case 'text_page':
        return renderTextPage(currentStep);
      case 'mantra_picker':
        return renderMantraPicker(currentStep);
      case 'habit_picker':
        return renderHabitPicker(currentStep);
      default:
        return null;
    }
  };

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
        {renderCurrentStep()}
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

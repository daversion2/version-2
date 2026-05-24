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

// ============================================================================
// PATTERN DATA
// ============================================================================

const PATTERN_TILES = [
  { id: 'racing-thoughts', label: 'Racing thoughts', icon: 'flash-outline' as const },
  { id: 'restlessness', label: 'Restlessness', icon: 'body-outline' as const },
  { id: 'anxiety', label: 'Worry or anxiety', icon: 'cloud-outline' as const },
  { id: 'self-criticism', label: 'Self-criticism', icon: 'chatbox-ellipses-outline' as const },
  { id: 'distraction', label: 'Distraction', icon: 'navigate-outline' as const },
  { id: 'something-else', label: 'Something else', icon: 'ellipsis-horizontal-outline' as const },
];

const PATTERN_RESPONSES: Record<string, { headline: string; body: string; patternLabel: string }> = {
  'racing-thoughts': {
    headline: 'Your mind likes to stay busy.',
    body: "Racing thoughts are your brain's default mode network firing on all cylinders. Meditation doesn't stop the thoughts — it teaches you to notice them without getting swept away. Over time, the volume turns down on its own.",
    patternLabel: 'Overactive mind',
  },
  restlessness: {
    headline: 'Your body is telling you something.',
    body: "Restlessness during stillness is your nervous system adjusting. It's used to constant input. The discomfort you felt is actually the gap between stimulus and response — the exact space where growth happens.",
    patternLabel: 'Restless energy',
  },
  anxiety: {
    headline: "You carry more than you realize.",
    body: "When you stop moving, worry often surfaces because it's been running in the background all along. Meditation doesn't create the anxiety — it reveals it. And what you can see, you can work with.",
    patternLabel: 'Background worry',
  },
  'self-criticism': {
    headline: 'That voice is loud, but it\'s not the truth.',
    body: "The inner critic often shows up loudest in quiet moments. It's a pattern your brain learned early — probably as a way to protect you. Meditation helps you hear it without believing it.",
    patternLabel: 'Inner critic',
  },
  distraction: {
    headline: 'Your attention has been trained to scatter.',
    body: "Constant notifications, scrolling, and multitasking have wired your brain to seek novelty. The fact that you noticed yourself getting distracted is already progress — that's awareness, and awareness is the foundation.",
    patternLabel: 'Scattered focus',
  },
};

const MANTRA_EXAMPLES = [
  'I am not my thoughts',
  'Progress, not perfection',
  'One step at a time',
  'I choose calm over chaos',
  'I am enough, right now',
  'Breathe in strength, breathe out doubt',
  'I trust the process',
  'Small steps, big changes',
  'I am building something real',
  'This moment is mine',
];

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

  // Screen 4: Reflection
  const [reflectionText, setReflectionText] = useState('');

  // Screen 5: Pattern
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [patternConfirmed, setPatternConfirmed] = useState(false);
  const [customPatternText, setCustomPatternText] = useState('');
  const [subStep, setSubStep] = useState<'tiles' | 'response' | 'escape'>('tiles');

  // Screen 6: Mantra
  const [mantra, setMantra] = useState('');

  // Screen 7: Habit Selection
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  // Screen 8: Saving
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
    if (step === 5 && subStep === 'response') {
      setSubStep('tiles');
      return;
    }
    if (step === 5 && subStep === 'escape') {
      setSubStep('response');
      return;
    }
    if (step === 6) {
      setSubStep('tiles');
      goToStep(5);
      return;
    }
    if (step > 1) goToStep(step - 1);
  };

  // ============================================================================
  // COMPLETION LOGIC (Screen 8)
  // ============================================================================

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const morningMeditation = HABIT_LIBRARY.find((h) => h.id === 'morning-meditation')!;

      // 1. Create meditation habit
      const meditationHabitId = await createHabit(user.uid, {
        name: 'Meditation',
        category_id: 'Mind',
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
          category_id: selectedHabit.category_id,
          target_count_per_week: selectedHabit.suggested_target_per_week,
          action_plan: selectedHabit.action_plan,
        });
      }

      // 4. Save onboarding data to user doc
      const userData: Record<string, string> = { redirect_mantra: mantra };
      if (selectedPattern) userData.onboarding_pattern = selectedPattern;
      if (reflectionText.trim()) userData.onboarding_reflection = reflectionText.trim();
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

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
          Before we set anything up, let's start with something real.{'\n\n'}
          You're going to sit quietly for 60 seconds.{'\n'}
          No instructions. No guidance. Just you.
        </Text>
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
      <View style={styles.neuroCallout}>
        <View style={styles.neuroCalloutHeader}>
          <Ionicons name="bulb-outline" size={20} color={Colors.primary} />
          <Text style={styles.neuroCalloutLabel}>NEUROSCIENCE</Text>
        </View>
        <Text style={styles.neuroCalloutText}>
          Your brain's default mode network activates the moment you stop doing. That's when your real thought patterns surface — the ones that run on autopilot all day. This 60-second sit is designed to make them visible.
        </Text>
      </View>

      <View style={styles.intentionBox}>
        <Text style={styles.intentionTitle}>Your only job</Text>
        <Text style={styles.intentionBody}>
          Sit still. Notice what comes up.{'\n'}
          Don't try to fix, control, or quiet anything.{'\n'}
          Just watch.
        </Text>
      </View>
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
  // SCREEN 4 — REFLECT
  // ============================================================================

  const renderScreen4 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        What came up for you during that minute?
      </Text>
      <Text style={styles.reflectSubtext}>
        Thoughts, feelings, distractions, physical sensations — anything you noticed.
      </Text>
      <TextInput
        style={styles.multilineInput}
        value={reflectionText}
        onChangeText={setReflectionText}
        placeholder="There's no wrong answer..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={5}
        maxLength={500}
        textAlignVertical="top"
      />
    </View>
  );

  // ============================================================================
  // SCREEN 5 — PATTERN RECOGNITION
  // ============================================================================

  const renderScreen5 = () => {
    // Sub-step: Tiles
    if (subStep === 'tiles') {
      return (
        <View style={styles.stageContent}>
          <Text style={styles.stageIntro}>
            Did any of these show up during your sit?
          </Text>
          <Text style={styles.patternSubtext}>
            Most people recognize at least one. Tap what resonates.
          </Text>
          <View style={styles.patternGrid}>
            {PATTERN_TILES.map((tile) => {
              const isSelected = selectedPattern === tile.id;
              return (
                <TouchableOpacity
                  key={tile.id}
                  style={[styles.patternTile, isSelected && styles.patternTileSelected]}
                  onPress={() => setSelectedPattern(tile.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tile.icon}
                    size={28}
                    color={isSelected ? Colors.primary : Colors.gray}
                  />
                  <Text style={[styles.patternTileLabel, isSelected && styles.patternTileLabelSelected]}>
                    {tile.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    // Sub-step: Response (5b)
    if (subStep === 'response') {
      if (selectedPattern === 'something-else') {
        return (
          <View style={styles.stageContent}>
            <Text style={styles.stageIntro}>Tell us what you noticed.</Text>
            <TextInput
              style={styles.multilineInput}
              value={customPatternText}
              onChangeText={setCustomPatternText}
              placeholder="What came up for you?"
              placeholderTextColor={Colors.gray}
              multiline
              numberOfLines={4}
              maxLength={300}
              textAlignVertical="top"
            />
          </View>
        );
      }

      const response = PATTERN_RESPONSES[selectedPattern!];
      if (!response) return null;

      return (
        <View style={styles.stageContent}>
          <Text style={styles.responseHeadline}>{response.headline}</Text>
          <Text style={styles.responseBody}>{response.body}</Text>
          <View style={styles.responseBadge}>
            <Text style={styles.responseBadgeText}>Your pattern: {response.patternLabel}</Text>
          </View>
        </View>
      );
    }

    // Sub-step: Escape hatch (freeform after "This doesn't quite fit")
    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>No worries — tell us what feels more accurate.</Text>
        <TextInput
          style={styles.multilineInput}
          value={customPatternText}
          onChangeText={setCustomPatternText}
          placeholder="What did you actually notice?"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={4}
          maxLength={300}
          textAlignVertical="top"
        />
      </View>
    );
  };

  // ============================================================================
  // SCREEN 6 — MANTRA SELECTION
  // ============================================================================

  const renderScreen6 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Pick a redirect mantra — a short phrase you'll say to yourself when your mind drifts.
      </Text>
      <View style={styles.scienceCard}>
        <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
        <Text style={styles.scienceText}>
          Research shows that self-directed speech activates your prefrontal cortex — the part of your brain responsible for focus and self-control. A short, personal mantra interrupts autopilot thinking and gives your brain a clear instruction to follow.
        </Text>
      </View>
      <View style={styles.howToCard}>
        <Ionicons name="repeat-outline" size={18} color={Colors.secondary} />
        <Text style={styles.scienceText}>
          When you notice a negative thought pattern arising, use your mantra to cut it off. Repeat it to yourself to redirect your focus.
        </Text>
      </View>
      <Text style={styles.mantraSubtext}>
        You can write your own or tap one below to start.
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
    </View>
  );

  // ============================================================================
  // SCREEN 7 — HABIT SELECTION
  // ============================================================================

  const renderScreen7 = () => {
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
          Research is clear — fewer habits to start increase the probability of lasting change. Pick one additional habit. You can build from here.
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
                  {habit.suggested_target_per_week}x/week · {habit.category_id}
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
  // SCREEN 8 — REVEAL
  // ============================================================================

  const renderScreen8 = () => {
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
  // PROGRESS DOTS (Screens 2-7 only)
  // ============================================================================

  const renderDots = () => {
    const totalDots = 6; // Screens 2-7
    const currentDot = step - 1; // step 2 = dot 1, step 7 = dot 6

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
              title="Here's what came up →"
              onPress={() => goToStep(4)}
              style={styles.nextButton}
            />
          ) : (
            <View style={styles.nextButton} />
          )}
        </View>
      );
    }

    // Screen 4: Reflect (Skip + Continue)
    if (step === 4) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => goToStep(5)} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Button
              title="Continue →"
              onPress={() => goToStep(5)}
              style={styles.nextButton}
            />
          </View>
        </View>
      );
    }

    // Screen 5: Pattern
    if (step === 5) {
      if (subStep === 'tiles') {
        return (
          <View style={styles.navBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity onPress={() => goToStep(6)} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              {selectedPattern && (
                <Button
                  title="That's it →"
                  onPress={() => setSubStep('response')}
                  style={styles.nextButton}
                />
              )}
            </View>
          </View>
        );
      }
      if (subStep === 'response') {
        if (selectedPattern === 'something-else') {
          return (
            <View style={styles.navBar}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.navRight}>
                <TouchableOpacity onPress={() => goToStep(6)} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                <Button
                  title="Continue →"
                  onPress={() => goToStep(6)}
                  style={styles.nextButton}
                />
              </View>
            </View>
          );
        }
        return (
          <View style={styles.navBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity
                onPress={() => setSubStep('escape')}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>This doesn't quite fit</Text>
              </TouchableOpacity>
              <Button
                title="That's me →"
                onPress={() => {
                  setPatternConfirmed(true);
                  goToStep(6);
                }}
                style={styles.nextButton}
              />
            </View>
          </View>
        );
      }
      // escape sub-step
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => goToStep(6)} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Button
              title="Continue →"
              onPress={() => goToStep(6)}
              style={styles.nextButton}
            />
          </View>
        </View>
      );
    }

    // Screen 6: Mantra
    if (step === 6) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button
            title="This is my redirect →"
            onPress={() => goToStep(7)}
            disabled={!mantra.trim()}
            style={styles.nextButton}
          />
        </View>
      );
    }

    // Screen 7: Habit selection
    if (step === 7) {
      return (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Button
            title="This is my starting point →"
            onPress={() => goToStep(8)}
            disabled={!selectedHabitId}
            style={styles.nextButton}
          />
        </View>
      );
    }

    // Screen 8: Reveal
    if (step === 8) {
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

  // Screen 8: Full-screen reveal (no dots)
  if (step === 8) {
    return (
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingTop: Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {renderScreen8()}
        </ScrollView>
        {renderBottomNav()}
      </View>
    );
  }

  // Screens 2-7: Standard layout with dots
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
        {step === 7 && renderScreen7()}
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
  navRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  nextButton: { minWidth: 140 },
  fullWidthButton: { width: width - Spacing.lg * 2 },
  skipButton: { paddingVertical: Spacing.sm },
  skipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },

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

  // Screen 2: Settle
  neuroCallout: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  neuroCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  neuroCalloutLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1,
  },
  neuroCalloutText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
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

  // Screen 4: Reflect
  reflectSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  multilineInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Screen 5: Patterns
  patternSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  patternTile: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  patternTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  patternTileLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    textAlign: 'center',
  },
  patternTileLabelSelected: {
    color: Colors.primary,
  },
  responseHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  responseBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  responseBadge: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  responseBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },

  // Screen 6: Mantra
  scienceCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
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

  // Screen 7: Habit selection
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

  // Screen 8: Reveal
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

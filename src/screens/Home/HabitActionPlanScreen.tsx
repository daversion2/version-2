import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { updateHabit } from '../../services/habits';
import { HabitActionPlan } from '../../types';

type Props = HomeScreenProps<'HabitActionPlan'>;

const QUESTIONS: {
  key: keyof HabitActionPlan;
  question: string;
  placeholder: string;
  scienceNote: string;
}[] = [
  {
    key: 'cue',
    question: 'When and where will you do this?',
    placeholder: 'e.g. Right after my morning coffee, at the kitchen table',
    scienceNote: 'Writing this down makes you 2–3× more likely to follow through — this is called an "implementation intention."',
  },
  {
    key: 'environment_change',
    question: 'What\'s one thing you can change about your environment to make this easier?',
    placeholder: 'e.g. Put my journal on my nightstand the night before',
    scienceNote: 'Reducing friction and adding visible cues dramatically boosts habit completion rates.',
  },
  {
    key: 'obstacle_plan',
    question: 'What\'s your most likely obstacle, and what will you do when it shows up?',
    placeholder: 'e.g. If I\'m too tired after work, I\'ll do just 5 minutes instead of skipping',
    scienceNote: 'Pre-planning for obstacles (the WOOP method) significantly improves follow-through when life gets hard.',
  },
  {
    key: 'minimum_version',
    question: 'What\'s the smallest version of this habit you can do on a really hard day?',
    placeholder: 'e.g. Even just put on my shoes and step outside',
    scienceNote: 'A fallback habit prevents all-or-nothing thinking and protects your streak when motivation is low.',
  },
  {
    key: 'accountability_person',
    question: 'Who can you tell about this habit for accountability?',
    placeholder: 'e.g. I\'ll update my partner every Sunday on how the week went',
    scienceNote: 'Sharing your goal with a specific person raises follow-through rates by ~65%.',
  },
];

export const HabitActionPlanScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId, prefilled, afterSaveRoute } = route.params;
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<HabitActionPlan>(prefilled ?? {});
  const [saving, setSaving] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const currentValue = (answers[current.key] as string) ?? '';
  const progress = (step + 1) / QUESTIONS.length;

  const updateAnswer = (text: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: text }));
  };

  const goNext = () => {
    if (isLast) {
      handleSave();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    // Clear this answer and advance
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[current.key];
      return next;
    });
    if (isLast) {
      handleSave();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Only persist non-empty answers
      const plan: HabitActionPlan = {};
      (Object.keys(answers) as (keyof HabitActionPlan)[]).forEach((k) => {
        const v = answers[k];
        if (v && v.trim()) plan[k] = v.trim();
      });
      await updateHabit(user.uid, habitId, { action_plan: plan });
      if (afterSaveRoute) {
        (navigation as { navigate: (screen: string) => void }).navigate(afterSaveRoute);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAll = () => {
    if (afterSaveRoute) {
      (navigation as { navigate: (screen: string) => void }).navigate(afterSaveRoute);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step counter */}
        <Text style={styles.stepCount}>
          Question {step + 1} of {QUESTIONS.length}
        </Text>

        {/* Question */}
        <Text style={styles.question}>{current.question}</Text>

        {/* Science note */}
        <View style={styles.scienceCard}>
          <Text style={styles.scienceNote}>💡 {current.scienceNote}</Text>
        </View>

        {/* Text input */}
        <TextInput
          style={styles.textInput}
          value={currentValue}
          onChangeText={updateAnswer}
          placeholder={current.placeholder}
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Skip this question */}
        <TouchableOpacity onPress={skip} style={styles.skipQuestion}>
          <Text style={styles.skipQuestionText}>Skip this question →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.nextBtnText}>{isLast ? 'Save Plan' : 'Next'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkipAll} style={styles.skipAll}>
          <Text style={styles.skipAllText}>Skip — I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  stepCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  question: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.md,
  },
  scienceCard: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scienceNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 120,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  skipQuestion: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  skipQuestionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  skipAll: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  skipAllText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

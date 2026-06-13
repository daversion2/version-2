import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { ProgressBar } from '../../Tools/components/ProgressBar';
import { StepTransition } from '../../Tools/components/StepTransition';
import { ReflectionPromptStep } from './ReflectionPromptStep';
import { ReflectionPrompt } from '../../../services/challengeReflectionConfig';

interface ChallengeReflectionFlowProps {
  visible: boolean;
  prompts: ReflectionPrompt[];
  accentColor?: string;
  /** Prefill answers when re-opening to edit a reflection already captured. */
  initialAnswers?: Record<string, string>;
  onComplete: (joinedNote: string, answers: Record<string, string>) => void;
  onCancel: () => void;
}

/** Build the reflection_note string: drop blank answers, keep prompt + answer. */
export const buildReflectionNote = (
  prompts: ReflectionPrompt[],
  answers: Record<string, string>
): string =>
  prompts
    .map((p) => ({ q: p.prompt, a: (answers[p.id] || '').trim() }))
    .filter((e) => e.a.length > 0)
    .map((e) => `${e.q}\n${e.a}`)
    .join('\n\n')
    .trim();

/**
 * Conversational post-challenge reflection — a full-screen Modal overlay that
 * walks the user through the admin-configured prompts one per screen, then
 * hands a single joined note back to the host (CompleteChallengeScreen). All
 * prompts are optional; the host's Submit works with or without a reflection.
 */
export const ChallengeReflectionFlow: React.FC<ChallengeReflectionFlowProps> = ({
  visible,
  prompts,
  accentColor = Colors.success,
  initialAnswers,
  onComplete,
  onCancel,
}) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Reset to the start whenever the flow is (re)opened.
  useEffect(() => {
    if (visible) {
      setIndex(0);
      setDirection('forward');
      setAnswers(initialAnswers ?? {});
    }
  }, [visible]);

  const total = prompts.length;
  const current = prompts[index];
  const isLast = index === total - 1;
  const canContinue = !!current && (answers[current.id] || '').trim().length > 0;

  const finish = (nextAnswers: Record<string, string>) => {
    onComplete(buildReflectionNote(prompts, nextAnswers), nextAnswers);
  };

  const goNext = () => {
    if (isLast) {
      finish(answers);
      return;
    }
    setDirection('forward');
    setIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (index <= 0) return;
    setDirection('backward');
    setIndex((prev) => prev - 1);
  };

  const updateAnswer = (value: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  if (!current) return null;

  const progress = total > 0 ? (index + 1) / total : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        <ProgressBar progress={progress} color={accentColor} />

        {/* Header */}
        <View style={styles.header}>
          {index > 0 ? (
            <TouchableOpacity onPress={goBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={22} color={Colors.dark} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Step content */}
        <View style={styles.stepContainer}>
          <StepTransition stepKey={current.id} direction={direction}>
            <ReflectionPromptStep
              prompt={current}
              value={answers[current.id] || ''}
              onChange={updateAnswer}
              color={accentColor}
            />
          </StepTransition>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {!canContinue && (
            <TouchableOpacity onPress={goNext} style={styles.skipButton}>
              <Text style={styles.skipText}>{isLast ? 'Skip & finish' : 'Skip'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: accentColor },
              !canContinue && styles.continueButtonDisabled,
            ]}
            onPress={goNext}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>{isLast ? 'Done' : 'Next'}</Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: '#FAFBFC',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

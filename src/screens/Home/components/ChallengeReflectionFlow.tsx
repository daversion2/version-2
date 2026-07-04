import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { Colors } from '../../../constants/theme';
import { StepFlowShell } from '../../../components/common/StepFlowShell';
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
 * The flow chrome lives in <StepFlowShell>, shared with the practice Capture.
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

  const goNext = () => {
    if (isLast) {
      onComplete(buildReflectionNote(prompts, answers), answers);
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
      <StepFlowShell
        progress={progress}
        stepKey={current.id}
        direction={direction}
        accentColor={accentColor}
        canGoBack={index > 0}
        onBack={goBack}
        onCancel={onCancel}
        canContinue={canContinue}
        allowSkip
        nextLabel={isLast ? 'Done' : 'Next'}
        skipLabel={isLast ? 'Skip & finish' : 'Skip'}
        isLast={isLast}
        onNext={goNext}
      >
        <ReflectionPromptStep
          prompt={current}
          value={answers[current.id] || ''}
          onChange={updateAnswer}
          color={accentColor}
        />
      </StepFlowShell>
    </Modal>
  );
};

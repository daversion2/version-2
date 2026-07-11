import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { Colors } from '../../../constants/theme';
import { StepFlowShell } from '../../../components/common/StepFlowShell';
import { MindReflectionStep } from './MindReflectionStep';
import { buildMindReflectionNote } from '../../../data/mindTags';

interface ChallengeReflectionFlowProps {
  visible: boolean;
  accentColor?: string;
  /** Prefill when re-opening to edit a reflection already captured. */
  initialText?: string;
  initialTags?: string[];
  onComplete: (joinedNote: string, text: string, tags: string[]) => void;
  onCancel: () => void;
}

/**
 * Post-challenge reflection — a full-screen Modal overlay asking the single
 * mind-noticing question (tags + free text), then handing the joined note plus
 * the structured pieces back to the host (CompleteChallengeScreen). Entirely
 * optional; the host's Submit works with or without a reflection. The flow
 * chrome lives in <StepFlowShell>, shared with the practice Capture.
 */
export const ChallengeReflectionFlow: React.FC<ChallengeReflectionFlowProps> = ({
  visible,
  accentColor = Colors.success,
  initialText,
  initialTags,
  onComplete,
  onCancel,
}) => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Reset to the prefill whenever the flow is (re)opened.
  useEffect(() => {
    if (visible) {
      setText(initialText ?? '');
      setTags(initialTags ?? []);
    }
  }, [visible]);

  const toggleTag = (id: string) => {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const canContinue = text.trim().length > 0 || tags.length > 0;

  const finish = () => {
    onComplete(buildMindReflectionNote(text, tags), text.trim(), tags);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
    >
      <StepFlowShell
        progress={1}
        stepKey="mind-reflection"
        direction="forward"
        accentColor={accentColor}
        canGoBack={false}
        onBack={() => {}}
        onCancel={onCancel}
        canContinue={canContinue}
        allowSkip
        nextLabel="Done"
        skipLabel="Skip & finish"
        isLast
        onNext={finish}
      >
        <MindReflectionStep
          text={text}
          onChangeText={setText}
          selectedTags={tags}
          onToggleTag={toggleTag}
          color={accentColor}
        />
      </StepFlowShell>
    </Modal>
  );
};

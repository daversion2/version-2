import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { StepFlowShell } from '../common/StepFlowShell';
import { MindReflectionStep } from '../../screens/Home/components/MindReflectionStep';
import { buildMindReflectionNote } from '../../data/mindTags';
import { MindPattern, buildMindPatternText } from '../../services/mindPatterns';
import { showAlert } from '../../utils/alert';

export interface ReflectionInput {
  notes?: string;
  reflection?: Record<string, string>;
  mindTags?: string[];
}

interface Props {
  visible: boolean;
  /** Practice name, shown in the flow header. */
  practiceName: string;
  accentColor?: string;
  /** Recent-reps pattern for this practice — rendered as context above the question. */
  mindPattern?: MindPattern | null;
  /** Persist the reflection onto the already-written log. */
  onSave: (input: ReflectionInput) => Promise<void> | void;
  /** Leave without reflecting — the rep is already logged either way. */
  onSkip: () => void;
}

/**
 * The mind-noticing reflection, asked AFTER the rep is logged and celebrated.
 *
 * It used to be the last step of the Capture flow, sitting between the user and
 * their reward — so it read as a toll and got skipped. Running it here makes it
 * genuinely optional: nothing is withheld if you close it, and the log already
 * exists, so saving is a patch (see saveLogReflection).
 */
export const PracticeReflectionSheet: React.FC<Props> = ({
  visible,
  practiceName,
  accentColor = Colors.primary,
  mindPattern,
  onSave,
  onSkip,
}) => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset on OPEN so the exit animation still shows the user's last input.
  useEffect(() => {
    if (visible) {
      setText('');
      setTags([]);
      setSaving(false);
    }
  }, [visible]);

  const trimmed = text.trim();
  const hasAnswer = trimmed.length > 0 || tags.length > 0;

  const handleNext = async () => {
    // Nothing entered → the primary button is disabled, so this is the skip link.
    if (!hasAnswer) {
      onSkip();
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        notes: buildMindReflectionNote(text, tags) || undefined,
        reflection: trimmed ? { noticing: trimmed } : undefined,
        mindTags: tags.length ? tags : undefined,
      });
    } catch (err) {
      setSaving(false);
      console.warn('Failed to save practice reflection:', err);
      showAlert(
        "Couldn't save your reflection",
        'Your practice is already logged. Check your connection and try again.'
      );
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onSkip}>
      <StepFlowShell
        progress={1}
        stepKey="reflection"
        direction="forward"
        accentColor={accentColor}
        title={practiceName}
        canGoBack={false}
        onBack={onSkip}
        onCancel={onSkip}
        canContinue={hasAnswer && !saving}
        // While saving, canContinue drops to false — without this the skip link
        // would pop in under a button the user just pressed.
        allowSkip={!saving}
        nextLabel="Save reflection"
        skipLabel="Skip for now"
        isLast
        onNext={handleNext}
      >
        <MindReflectionStep
          text={text}
          onChangeText={setText}
          selectedTags={tags}
          onToggleTag={(id) =>
            setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
          }
          color={accentColor}
          header={
            mindPattern ? (
              <View style={[styles.patternBlock, { borderLeftColor: accentColor }]}>
                <View style={styles.patternHeader}>
                  <Ionicons name="eye-outline" size={15} color={accentColor} />
                  <Text style={[styles.patternLabel, { color: accentColor }]}>Your pattern</Text>
                </View>
                <Text style={styles.patternText}>{buildMindPatternText(mindPattern)}</Text>
              </View>
            ) : null
          }
        />
      </StepFlowShell>
    </Modal>
  );
};

const styles = StyleSheet.create({
  patternBlock: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  patternLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patternText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
});

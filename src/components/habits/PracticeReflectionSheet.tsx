import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { StepFlowShell } from '../common/StepFlowShell';
import { TacticStep } from '../../screens/Home/components/TacticStep';
import { TACTIC_PROMPT, buildTacticNote } from '../../data/overrideTactics';
import { TacticPattern, buildTacticPatternText } from '../../services/tacticPatterns';
import { showAlert } from '../../utils/alert';

export interface ReflectionInput {
  notes?: string;
  tactics?: string[];
}

interface Props {
  visible: boolean;
  /** Practice name, shown in the flow header. */
  practiceName: string;
  accentColor?: string;
  /**
   * Resistance the user just rated this rep, on the 3-point scale. Only the
   * hardest-rep copy varies on it — the CALLER decides whether to open this
   * sheet at all (see the note below on easy reps).
   */
  resistance?: number | null;
  /**
   * What has been working on this habit's recent hard reps. Rendered above the
   * question as their own evidence — absent until enough hard reps exist.
   */
  tacticPattern?: TacticPattern | null;
  /** Persist the reflection onto the already-written log. */
  onSave: (input: ReflectionInput) => Promise<void> | void;
  /** Leave without reflecting — the rep is already logged either way. */
  onSkip: () => void;
}

/**
 * "What helped you get started?" — asked AFTER the rep is logged and celebrated.
 *
 * It used to be the last step of the Capture flow, sitting between the user and
 * their reward — so it read as a toll and got skipped. Running it here makes it
 * genuinely optional: nothing is withheld if you close it, and the log already
 * exists, so saving is a patch (see saveLogReflection).
 *
 * ONE QUESTION, ONE SCREEN. This was briefly two steps, the first being the
 * mind-noticing reflection ("what did you notice your mind doing?"). That was
 * retired from the practice flow: two full screens landed on the user at the
 * exact moment they were most drained, re-creating the toll this sheet was
 * moved after the celebration to avoid. The mind-noticing question still runs
 * on the challenge reflection, which is a separate and still-reachable flow.
 *
 * ONLY ON HARD REPS. The caller opens this only when resistance cleared
 * TACTIC_GATE_RESISTANCE — an easy rep has nothing to ask about, so no reflect
 * action is offered at all rather than opening a sheet with a dead question.
 */
export const PracticeReflectionSheet: React.FC<Props> = ({
  visible,
  practiceName,
  accentColor = Colors.primary,
  resistance,
  tacticPattern,
  onSave,
  onSkip,
}) => {
  const [tactics, setTactics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset on OPEN so the exit animation still shows the user's last input.
  useEffect(() => {
    if (visible) {
      setTactics([]);
      setSaving(false);
    }
  }, [visible]);

  const hasAnswer = tactics.length > 0;

  const handleNext = async () => {
    // Nothing selected → the primary button is disabled, so this is the skip link.
    if (!hasAnswer) {
      onSkip();
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ notes: buildTacticNote(tactics) || undefined, tactics });
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
        stepKey="tactics"
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
        <TacticStep
          selected={tactics}
          onToggle={(id) =>
            setTactics((prev) =>
              prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
            )
          }
          color={accentColor}
          // Echo how hard they just said it was, so the question lands as a
          // response rather than a generic prompt.
          prompt={resistance === 3 ? `You nearly didn’t. ${TACTIC_PROMPT}` : TACTIC_PROMPT}
          header={
            tacticPattern ? (
              <View style={[styles.patternBlock, { borderLeftColor: accentColor }]}>
                <View style={styles.patternHeader}>
                  <Ionicons name="flash-outline" size={15} color={accentColor} />
                  <Text style={[styles.patternLabel, { color: accentColor }]}>
                    What works for you
                  </Text>
                </View>
                <Text style={styles.patternText}>{buildTacticPatternText(tacticPattern)}</Text>
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

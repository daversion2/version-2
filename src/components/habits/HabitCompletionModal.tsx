import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HabitActionPlan, PracticeCompletionInput } from '../../types';
import { formatHabitPlanLine } from '../../utils/habitPlan';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { PracticeTimer } from './PracticeTimer';
import { PracticeCaptureForm } from './PracticeCaptureForm';

interface Props {
  visible: boolean;
  habitName: string;
  /** Catalog id, when this is a curated practice — drives tracking + the targeted reflection. */
  practiceId?: string;
  actionPlan?: HabitActionPlan;
  onSubmit: (input: PracticeCompletionInput) => void;
  onCancel: () => void;
}

/**
 * Retroactive "Log it" sheet for a practice rep. Time-in-stillness practices
 * (meditation, breathwork) open to a countdown timer first, then the user reflects
 * + logs; everything else opens straight to the Capture form. The Capture beat
 * itself lives in <PracticeCaptureForm>, shared with the forward PracticeSession flow.
 */
export const HabitCompletionModal: React.FC<Props> = ({
  visible,
  habitName,
  practiceId,
  actionPlan,
  onSubmit,
  onCancel,
}) => {
  const planLine = formatHabitPlanLine(actionPlan);
  const practice = getPractice(practiceId);

  const usesTimer = !!practice?.timer;
  const accent =
    PRACTICE_GROUPS.find((g) => g.id === practice?.group)?.color ?? Colors.primary;
  const defaultMinutes =
    (practice?.tracking?.find((t) => t.key === 'duration_min')?.default as number) ?? 10;

  const [phase, setPhase] = useState<'timer' | 'form'>('form');
  // Minutes measured by the timer, carried into the form as a seed (null = untimed).
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  // Bumped on each open to force a fresh <PracticeCaptureForm> (resets its state).
  const [openKey, setOpenKey] = useState(0);

  // Reset on OPEN, not on close. Resetting on submit/cancel would collapse the
  // sheet while it's still fading out — the user briefly sees the bare default
  // state. Resetting when it opens keeps the fade-out showing their last input
  // and guarantees a clean slate next time.
  useEffect(() => {
    if (visible) {
      setPhase(usesTimer ? 'timer' : 'form');
      setTimerMinutes(null);
      setOpenKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Timer finished (or ended early) → carry the measured minutes into the form.
  const handleTimerDone = (minutes: number) => {
    setTimerMinutes(minutes);
    setPhase('form');
  };

  // "I already did it" — skip timing, go straight to logging.
  const handleTimerSkip = () => setPhase('form');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        {/* Backdrop sits BEHIND the card as an absolute sibling — not an ancestor
            of the ScrollView — so it can dismiss on outside-tap without stealing
            the scroll gesture. */}
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{habitName}</Text>
            {!!planLine && <Text style={styles.planRecap}>{planLine}</Text>}

            {phase === 'timer' ? (
              // Gate on `visible` so dismissing the sheet unmounts the timer at
              // once — that fires its cleanup (stop the chime, release keep-awake)
              // immediately rather than after the modal's fade-out.
              visible ? (
                <PracticeTimer
                  accentColor={accent}
                  defaultMinutes={defaultMinutes}
                  onDone={handleTimerDone}
                  onSkip={handleTimerSkip}
                />
              ) : null
            ) : (
              <PracticeCaptureForm
                key={openKey}
                practiceId={practiceId}
                initialMetrics={timerMinutes != null ? { duration_min: timerMinutes } : undefined}
                initialExpanded={timerMinutes != null}
                onSubmit={onSubmit}
                onCancel={onCancel}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
  },
  planRecap: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

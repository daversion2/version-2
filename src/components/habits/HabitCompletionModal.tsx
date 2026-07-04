import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HabitActionPlan, PracticeCompletionInput } from '../../types';
import { formatHabitPlanLine } from '../../utils/habitPlan';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { PracticeTimer } from './PracticeTimer';
import { PracticeCaptureFlow } from './PracticeCaptureFlow';

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
 * Retroactive "Log it" flow for a practice rep — a full-screen modal, matching
 * the forward PracticeSession and post-challenge reflection experiences.
 * Time-in-stillness practices (meditation, breathwork) open to a countdown
 * timer first, then the user reflects + logs; everything else opens straight
 * to the Capture flow. The Capture beat itself lives in <PracticeCaptureFlow>,
 * shared with the forward PracticeSession flow.
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
  // Minutes measured by the timer, carried into the flow as a seed (null = untimed).
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  // Bumped on each open to force a fresh <PracticeCaptureFlow> (resets its state).
  const [openKey, setOpenKey] = useState(0);

  // Reset on OPEN, not on close. Resetting on submit/cancel would collapse the
  // flow while it's still animating out — the user briefly sees the bare default
  // state. Resetting when it opens keeps the exit showing their last input
  // and guarantees a clean slate next time.
  useEffect(() => {
    if (visible) {
      setPhase(usesTimer ? 'timer' : 'form');
      setTimerMinutes(null);
      setOpenKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Timer finished (or ended early) → carry the measured minutes into the flow.
  const handleTimerDone = (minutes: number) => {
    setTimerMinutes(minutes);
    setPhase('form');
  };

  // "I already did it" — skip timing, go straight to logging.
  const handleTimerSkip = () => setPhase('form');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      {phase === 'timer' ? (
        <SafeAreaView style={styles.timerScreen}>
          <View style={styles.timerHeader}>
            <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
              <Ionicons name="close" size={22} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.timerBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{habitName}</Text>
            {!!planLine && <Text style={styles.planRecap}>{planLine}</Text>}
            {/* Gate on `visible` so dismissing the modal unmounts the timer at
                once — that fires its cleanup (stop the chime, release keep-awake)
                immediately rather than after the modal's slide-out. */}
            {visible ? (
              <PracticeTimer
                accentColor={accent}
                defaultMinutes={defaultMinutes}
                onDone={handleTimerDone}
                onSkip={handleTimerSkip}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      ) : (
        <PracticeCaptureFlow
          key={openKey}
          practiceId={practiceId}
          title={habitName}
          accentColor={accent}
          initialMetrics={timerMinutes != null ? { duration_min: timerMinutes } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  timerScreen: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  timerBody: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
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

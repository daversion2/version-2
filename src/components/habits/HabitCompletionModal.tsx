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
import { resolveTemplateFields } from '../../data/habitTemplates';

interface Props {
  visible: boolean;
  habitName: string;
  /** Catalog id, when this habit has a definition — drives tracking + the targeted reflection. */
  practiceId?: string;
  /**
   * Preset template id for a CUSTOM habit (data/habitTemplates.ts). Custom habits
   * have no catalog entry, so their template is resolved from this instead.
   */
  templateId?: string;
  /**
   * The amounts this user committed to, keyed by tracking-field key. The capture
   * sheet opens its commitment field on this rather than the catalog default, so
   * hitting your own promise is one tap and falling short is a deliberate drag.
   */
  metricGoals?: Record<string, number>;
  actionPlan?: HabitActionPlan;
  /**
   * "I already did it" — never offer the timer, and collapse the capture
   * questions onto one screen. Set by the card's Log it action.
   */
  logOnly?: boolean;
  /**
   * Day to open the capture on (YYYY-MM-DD). Defaults to today. On the
   * `logOnly` path the user can still change it unless `lockDate` is set.
   */
  initialDate?: string;
  /** File the rep under `initialDate` with no day selector. */
  lockDate?: boolean;
  onSubmit: (input: PracticeCompletionInput) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Retroactive "Log it" flow for a practice — a full-screen modal, matching the
 * forward PracticeSession and post-challenge reflection experiences.
 *
 * Two ways in. `logOnly` (the card's Log it action) goes straight to a single
 * compact capture screen: the practice is already done, so a timer and a
 * step-per-question wizard are pure friction. Otherwise this is the Start path
 * for practices with no briefing content, where time-in-stillness practices
 * (meditation, breathwork) still open to a countdown first. The Capture beat
 * itself lives in <PracticeCaptureFlow>, shared with PracticeSession.
 */
export const HabitCompletionModal: React.FC<Props> = ({
  visible,
  habitName,
  practiceId,
  templateId,
  metricGoals,
  actionPlan,
  logOnly = false,
  initialDate,
  lockDate = false,
  onSubmit,
  onCancel,
}) => {
  const planLine = formatHabitPlanLine(actionPlan);
  const practice = getPractice(practiceId);
  // Curated habits take their template from the catalog; custom habits from the
  // preset they were created with. Undefined here means "no override" and lets
  // the capture flow fall back to the catalog lookup.
  const customTracking = practice ? undefined : resolveTemplateFields({ template_id: templateId });

  const usesTimer = !!practice?.timer && !logOnly;
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
          tracking={customTracking?.length ? customTracking : undefined}
          metricGoals={metricGoals}
          title={habitName}
          accentColor={accent}
          compact={logOnly}
          initialDate={initialDate}
          lockDate={lockDate}
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

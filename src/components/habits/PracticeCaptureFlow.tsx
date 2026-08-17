import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Slider } from '../common/Slider';
import { StepFlowShell } from '../common/StepFlowShell';
import { AppMessage } from '../../screens/Tools/components/AppMessage';
import { PracticeCompletionInput } from '../../types';
import { getPractice, TrackingField } from '../../data/practices';
import { showAlert } from '../../utils/alert';
import {
  getTodayString,
  getEditableDates,
  formatRelativeDay,
  formatDayHeader,
  isToday,
} from '../../utils/date';

interface Props {
  /** Catalog id, when this is a curated practice — drives the tracking steps. */
  practiceId?: string;
  /** Shown centered in the flow header (the habit/practice name). */
  title?: string;
  accentColor?: string;
  /** Metrics to seed the flow with — e.g. `{ duration_min }` measured by a timer. */
  initialMetrics?: Record<string, number | string>;
  /**
   * Collapse every question onto ONE screen. Used by the retroactive "Log it"
   * path, where the rep is already done and the stepped pacing is pure friction.
   * The forward PracticeSession keeps the one-question-per-screen version — you
   * just finished something hard and the ceremony is earned there.
   */
  compact?: boolean;
  /**
   * Day the rep is filed under (YYYY-MM-DD). Defaults to today. When
   * `lockDate` is false the user can change it from here.
   */
  initialDate?: string;
  /**
   * Hide the day selector and file the rep under `initialDate` no matter what.
   * Set when the caller already established the day — e.g. logging from a
   * specific day's detail screen, where a second date control would just be a
   * way to contradict the screen you're standing on.
   */
  lockDate?: boolean;
  onSubmit: (input: PracticeCompletionInput) => void | Promise<void>;
  onCancel: () => void;
}

type Step =
  | { kind: 'difficulty'; key: 'difficulty' }
  | { kind: 'tracking'; key: string; field: TrackingField }
  | { kind: 'all'; key: 'all' };

/**
 * The "Capture" beat of a practice rep — difficulty (the only required answer)
 * plus any per-practice tracking, rendered through <StepFlowShell>. Hosted
 * full-screen by both the forward PracticeSession flow and the retroactive
 * HabitCompletionModal.
 *
 * The mind-noticing reflection deliberately does NOT live here: it used to be
 * the final step before the "Log it" button, which made it a toll on the way to
 * the reward and trained users to skip it. It now runs after the celebration
 * (<PracticeReflectionSheet>), patching the log via saveLogReflection().
 */
export const PracticeCaptureFlow: React.FC<Props> = ({
  practiceId,
  title,
  accentColor = Colors.primary,
  initialMetrics,
  compact = false,
  initialDate,
  lockDate = false,
  onSubmit,
  onCancel,
}) => {
  const practice = getPractice(practiceId);
  const tracking = practice?.tracking ?? [];

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [selected, setSelected] = useState<'easy' | 'challenging' | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number | string>>(initialMetrics ?? {});
  const [date, setDate] = useState(initialDate ?? getTodayString());
  const submittedRef = useRef(false);

  // The day picker only makes sense on the retroactive path: the forward
  // session flow means you just finished, so there is nothing to choose.
  const showDatePicker = compact && !lockDate;
  const editableDates = useMemo(() => getEditableDates(), []);

  const steps: Step[] = useMemo(() => {
    if (compact) return [{ kind: 'all', key: 'all' }];
    const list: Step[] = [{ kind: 'difficulty', key: 'difficulty' }];
    tracking.forEach((field) =>
      list.push({ kind: 'tracking', key: `track_${field.key}`, field })
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId, compact]);

  const current = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const canContinue = (() => {
    switch (current.kind) {
      case 'difficulty':
      case 'all':
        return !!selected;
      case 'tracking':
        return metrics[current.field.key] !== undefined;
    }
  })();

  const handleSubmit = async () => {
    if (!selected || submittedRef.current) return;
    submittedRef.current = true;

    try {
      await onSubmit({
        difficulty: selected,
        // Only sent when it isn't today — completePractice treats a present
        // `date` as an explicit backdate and takes its streak-safe path.
        date: isToday(date) ? undefined : date,
        metrics: Object.keys(metrics).length ? metrics : undefined,
      });
    } catch (err) {
      // Re-arm the Log button — without this a failed save (e.g. offline)
      // leaves the user stranded with a dead button and no feedback
      submittedRef.current = false;
      console.warn('Practice log failed:', err);
      showAlert(
        "Couldn't save your practice",
        'Check your connection and tap "Log it" to try again.'
      );
    }
  };

  const goNext = () => {
    if (isLast) {
      handleSubmit();
      return;
    }
    setDirection('forward');
    setIndex(index + 1);
  };

  const goBack = () => {
    if (index <= 0) return;
    setDirection('backward');
    setIndex(index - 1);
  };

  // Toggle setter for choice chips (tap again to clear).
  const setMetric = (key: string, value: number | string) => {
    setMetrics((prev) => {
      if (prev[key] === value) {
        const { [key]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  // Plain setter for sliders (dragging to the same value must not clear it).
  const setMetricValue = (key: string, value: number) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const renderTrackingField = (field: TrackingField) => {
    const currentValue = metrics[field.key];

    // Numeric fields (duration / number) → slider.
    if (field.type !== 'choice') {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const touched = typeof currentValue === 'number';
      const shown = touched ? (currentValue as number) : field.default ?? Math.round((min + max) / 2);
      return (
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldValueBig, !touched && styles.fieldValueMuted]}>
            {shown}
            {field.unit ? ` ${field.unit}` : ''}
          </Text>
          <Slider
            value={shown}
            min={min}
            max={max}
            step={step}
            onChange={(v) => setMetricValue(field.key, v)}
          />
        </View>
      );
    }

    // Choice fields → chips.
    return (
      <View style={styles.chipRow}>
        {(field.options ?? []).map((o) => {
          const active = currentValue === o.value;
          return (
            <TouchableOpacity
              key={String(o.value)}
              style={[styles.chip, active && { borderColor: accentColor, backgroundColor: accentColor }]}
              onPress={() => setMetric(field.key, o.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderDifficulty = () => (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.option, selected === 'easy' && styles.optionActiveEasy]}
        onPress={() => setSelected('easy')}
        activeOpacity={0.8}
      >
        <Text style={[styles.optionNum, selected === 'easy' && styles.optionTextActive]}>1</Text>
        <Text style={[styles.optionLabel, selected === 'easy' && styles.optionTextActive]}>
          Easy day
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, selected === 'challenging' && styles.optionActiveChallenging]}
        onPress={() => setSelected('challenging')}
        activeOpacity={0.8}
      >
        <Text style={[styles.optionNum, selected === 'challenging' && styles.optionTextActive]}>
          2
        </Text>
        <Text style={[styles.optionLabel, selected === 'challenging' && styles.optionTextActive]}>
          Challenging today
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Day selector — "when did you do it?", answered before anything else so the
  // rest of the screen is understood to be about that day.
  const renderDatePicker = () => (
    <View style={styles.dateBlock}>
      <Text style={styles.dateLabel}>When did you do it?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {editableDates.map((d) => {
          const active = d === date;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dateChip, active && { borderColor: accentColor, backgroundColor: accentColor }]}
              onPress={() => setDate(d)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                {formatRelativeDay(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Standing on a specific day already (e.g. the day detail screen) — state the
  // day so the rep can't be mis-filed, but don't offer to change it.
  const renderLockedDate = () => (
    <View style={styles.lockedDate}>
      <Text style={[styles.lockedDateText, { color: accentColor }]}>
        Logging for {formatDayHeader(date)}
      </Text>
    </View>
  );

  const renderStep = () => {
    // Compact ("Log it") — every question on one screen, difficulty first.
    if (current.kind === 'all') {
      return (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={120}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {showDatePicker ? renderDatePicker() : !isToday(date) ? renderLockedDate() : null}

            <AppMessage message="How hard was it to push through?" color={accentColor} delay={0} />

            {renderDifficulty()}

            {tracking.map((field) => (
              <View key={field.key} style={styles.compactField}>
                <Text style={styles.compactLabel}>{field.label}</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
                {renderTrackingField(field)}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    const message =
      current.kind === 'difficulty' ? 'How hard was it to push through?' : current.field.label;

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppMessage message={message} color={accentColor} delay={400} />

          {current.kind === 'tracking' && (
            <Text style={styles.optionalBadge}>Optional — skip if it doesn't apply</Text>
          )}

          {current.kind === 'difficulty' ? renderDifficulty() : renderTrackingField(current.field)}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <StepFlowShell
      progress={(Math.min(index, steps.length - 1) + 1) / steps.length}
      stepKey={current.key}
      direction={direction}
      accentColor={accentColor}
      title={title}
      canGoBack={index > 0}
      onBack={goBack}
      onCancel={onCancel}
      canContinue={canContinue}
      allowSkip={current.kind === 'tracking'}
      // Restate the day on the commit button when it isn't today — the chip is
      // scrolled off by the time you reach the button, and mis-filing a rep is
      // the one mistake this screen can make.
      nextLabel={isLast ? (isToday(date) ? 'Log it' : `Log for ${formatRelativeDay(date)}`) : 'Next'}
      skipLabel={isLast ? 'Skip & log it' : 'Skip'}
      isLast={isLast}
      onNext={goNext}
    >
      {renderStep()}
    </StepFlowShell>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  optionalBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },

  dateBlock: { marginBottom: Spacing.lg },
  dateLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  dateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  dateChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  dateChipTextActive: { color: Colors.white },

  lockedDate: { marginBottom: Spacing.lg },
  lockedDateText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },

  compactField: {
    marginTop: Spacing.xl,
  },
  compactLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: 2,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActiveEasy: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  optionActiveChallenging: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  optionNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  optionLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: Spacing.xs },
  optionTextActive: { color: Colors.white },

  fieldBlock: { marginTop: Spacing.sm },
  fieldValueBig: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  fieldValueMuted: { color: Colors.gray },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  chipTextActive: { color: Colors.white },
});

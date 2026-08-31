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
import { RESISTANCE_LEVELS, resistanceToDifficulty } from '../../constants/resistance';
import { showAlert } from '../../utils/alert';
import {
  getTodayString,
  getEditableDates,
  formatRelativeDay,
  formatDayHeader,
  isToday,
} from '../../utils/date';

interface Props {
  /** Catalog id, when this habit has a definition — drives the tracking steps. */
  practiceId?: string;
  /**
   * Explicit template, overriding whatever `practiceId` would resolve. This is
   * what lets a CUSTOM habit carry a template: custom habits have no catalog
   * entry, so their preset template (see data/habitTemplates.ts) is passed in
   * directly rather than looked up.
   */
  tracking?: TrackingField[];
  /**
   * Committed amounts keyed by tracking-field key. A field with a goal opens on
   * it instead of the catalog default — the number you promised, not a generic
   * suggestion.
   */
  metricGoals?: Record<string, number>;
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
  tracking: trackingOverride,
  metricGoals,
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
  // An explicit template wins over the catalog lookup — that is how custom
  // habits (which have no catalog entry) get one.
  const tracking = trackingOverride ?? practice?.tracking ?? [];

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [resistance, setResistance] = useState<number | null>(null);
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
  }, [practiceId, compact, tracking]);

  const current = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const canContinue = (() => {
    switch (current.kind) {
      case 'difficulty':
      case 'all':
        return resistance !== null;
      case 'tracking':
        return metrics[current.field.key] !== undefined;
    }
  })();

  const handleSubmit = async () => {
    if (resistance === null || submittedRef.current) return;
    submittedRef.current = true;

    try {
      await onSubmit({
        resistance,
        // Written alongside so streaks and the existing analytics keep working
        // without knowing about the scale. See constants/resistance.ts.
        difficulty: resistanceToDifficulty(resistance),
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

    // Numeric fields (duration / number / scale) → slider. A 'scale' is just a
    // small-range number with named endpoints, which is what makes a grade
    // ("how well did I stick to it?") trend like any other metric.
    if (field.type !== 'choice') {
      const isScale = field.type === 'scale';
      const min = field.min ?? (isScale ? 1 : 0);
      const max = field.max ?? (isScale ? 5 : 100);
      const step = field.step ?? 1;
      const touched = typeof currentValue === 'number';
      // Your committed amount wins over the catalog default: the point of
      // setting 80 oz is that the sheet opens on 80 oz.
      const fallback = metricGoals?.[field.key] ?? field.default ?? Math.round((min + max) / 2);
      const shown = touched ? (currentValue as number) : fallback;
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
          {isScale && !!field.labels && (
            <View style={styles.scaleEnds}>
              <Text style={styles.scaleEndText}>{field.labels.low}</Text>
              <Text style={styles.scaleEndText}>{field.labels.high}</Text>
            </View>
          )}
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

  /**
   * The one question every check-in asks. A 1–10 slider rather than the old
   * easy/challenging pair: two values can't draw a curve, and the falling curve
   * is the whole point of the product.
   *
   * Untouched state shows a muted midpoint and leaves `resistance` null, so the
   * Log button stays disabled until they actually answer — a defaulted rating
   * would quietly poison the trend.
   */
  /**
   * The one question every check-in asks. Three levels rather than a 1–10
   * slider: nobody reliably distinguishes a 6 from a 7, so the extra resolution
   * was noise dressed as data. The weekly averages on Progress keep fractional
   * resolution regardless.
   *
   * Nothing is preselected — an unanswered rating leaves the Log button
   * disabled, because a defaulted answer would quietly poison the trend this
   * exists to draw.
   */
  const renderResistance = () => (
    <View style={styles.levelList}>
      {RESISTANCE_LEVELS.map((level) => {
        const active = resistance === level.value;
        return (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.levelRow,
              active && { borderColor: accentColor, backgroundColor: accentColor + '12' },
            ]}
            onPress={() => setResistance(level.value)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${level.label}. ${level.sublabel}`}
          >
            <View
              style={[
                styles.levelNum,
                active && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
            >
              <Text style={[styles.levelNumText, active && styles.levelNumTextActive]}>
                {level.value}
              </Text>
            </View>
            <View style={styles.levelText}>
              <Text style={[styles.levelLabel, active && { color: accentColor }]}>
                {level.label}
              </Text>
              <Text style={styles.levelSub}>{level.sublabel}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
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

            <AppMessage message="How hard was it?" color={accentColor} delay={0} />

            {renderResistance()}

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
      current.kind === 'difficulty' ? 'How hard was it?' : current.field.label;

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

          {current.kind === 'difficulty' ? renderResistance() : renderTrackingField(current.field)}
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
  levelList: { gap: Spacing.sm, marginTop: Spacing.sm },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  levelNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  levelNumTextActive: { color: Colors.white },
  levelText: { flex: 1, gap: 2 },
  levelLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  levelSub: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  scaleEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  scaleEndText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },

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

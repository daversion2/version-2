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
import { MindReflectionStep } from '../../screens/Home/components/MindReflectionStep';
import { buildMindReflectionNote } from '../../data/mindTags';
import { PracticeCompletionInput } from '../../types';
import { getPractice, TrackingField } from '../../data/practices';

interface Props {
  /** Catalog id, when this is a curated practice — drives the tracking steps. */
  practiceId?: string;
  /** Shown centered in the flow header (the habit/practice name). */
  title?: string;
  accentColor?: string;
  /** Metrics to seed the flow with — e.g. `{ duration_min }` measured by a timer. */
  initialMetrics?: Record<string, number | string>;
  onSubmit: (input: PracticeCompletionInput) => void;
  onCancel: () => void;
}

type Step =
  | { kind: 'difficulty'; key: 'difficulty' }
  | { kind: 'tracking'; key: string; field: TrackingField }
  | { kind: 'reflection'; key: 'reflection' };

/**
 * The "Capture" beat of a practice rep — difficulty (the only required step,
 * so a quick log is still two taps), per-practice tracking, then the SAME
 * single mind-noticing reflection the post-challenge flow asks, rendered
 * through the same <StepFlowShell> + <MindReflectionStep>. The answer is
 * joined into the log's notes and stored structured (`reflection` text +
 * `mindTags`); any noticing — tags or text — counts as hitting the hard
 * moment for the daily summary. Hosted full-screen by both the forward
 * PracticeSession flow and the retroactive HabitCompletionModal.
 */
export const PracticeCaptureFlow: React.FC<Props> = ({
  practiceId,
  title,
  accentColor = Colors.primary,
  initialMetrics,
  onSubmit,
  onCancel,
}) => {
  const practice = getPractice(practiceId);
  const tracking = practice?.tracking ?? [];

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [selected, setSelected] = useState<'easy' | 'challenging' | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number | string>>(initialMetrics ?? {});
  const [reflectionText, setReflectionText] = useState('');
  const [mindTags, setMindTags] = useState<string[]>([]);
  const submittedRef = useRef(false);

  const steps: Step[] = useMemo(() => {
    const list: Step[] = [{ kind: 'difficulty', key: 'difficulty' }];
    tracking.forEach((field) =>
      list.push({ kind: 'tracking', key: `track_${field.key}`, field })
    );
    list.push({ kind: 'reflection', key: 'reflection' });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId]);

  const current = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const canContinue = (() => {
    switch (current.kind) {
      case 'difficulty':
        return !!selected;
      case 'tracking':
        return metrics[current.field.key] !== undefined;
      case 'reflection':
        return reflectionText.trim().length > 0 || mindTags.length > 0;
    }
  })();

  const handleSubmit = () => {
    if (!selected || submittedRef.current) return;
    submittedRef.current = true;

    const text = reflectionText.trim();
    const note = buildMindReflectionNote(reflectionText, mindTags);
    // Any noticing — a tag or written text — counts as hitting the hard
    // moment; this feeds the daily summary's "pushed through the hard moment"
    // count.
    const hitHardMoment = text || mindTags.length ? true : undefined;

    onSubmit({
      difficulty: selected,
      notes: note || undefined,
      metrics: Object.keys(metrics).length ? metrics : undefined,
      hitHardMoment,
      reflection: text ? { noticing: text } : undefined,
      mindTags: mindTags.length ? mindTags : undefined,
    });
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

  const renderStep = () => {
    // The reflection renders the exact same step component as the
    // post-challenge flow — question bubble, mind tags, free text.
    if (current.kind === 'reflection') {
      return (
        <MindReflectionStep
          text={reflectionText}
          onChangeText={setReflectionText}
          selectedTags={mindTags}
          onToggleTag={(id) =>
            setMindTags((prev) =>
              prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
            )
          }
          color={accentColor}
        />
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

          {current.kind === 'difficulty' ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.option, selected === 'easy' && styles.optionActiveEasy]}
                onPress={() => setSelected('easy')}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionNum, selected === 'easy' && styles.optionTextActive]}>
                  1
                </Text>
                <Text style={[styles.optionLabel, selected === 'easy' && styles.optionTextActive]}>
                  Easy day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.option, selected === 'challenging' && styles.optionActiveChallenging]}
                onPress={() => setSelected('challenging')}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.optionNum, selected === 'challenging' && styles.optionTextActive]}
                >
                  2
                </Text>
                <Text
                  style={[styles.optionLabel, selected === 'challenging' && styles.optionTextActive]}
                >
                  Challenging today
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            renderTrackingField(current.field)
          )}
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
      allowSkip={current.kind !== 'difficulty'}
      nextLabel={isLast ? 'Log it' : 'Next'}
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

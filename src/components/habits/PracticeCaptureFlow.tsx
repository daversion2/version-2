import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Slider } from '../common/Slider';
import { StepFlowShell } from '../common/StepFlowShell';
import { AppMessage } from '../../screens/Tools/components/AppMessage';
import { PracticeCompletionInput } from '../../types';
import { getPractice, TrackingField } from '../../data/practices';
import { OVERRIDE_TACTICS } from '../../data/overrideTactics';

interface Props {
  /** Catalog id, when this is a curated practice — drives tracking + the targeted reflection. */
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
  | { kind: 'gate'; key: 'gate' }
  | { kind: 'tactics'; key: 'tactics' }
  | { kind: 'notes'; key: 'notes' };

/**
 * The "Capture" beat of a practice rep, rendered as the same conversational
 * one-question-per-screen flow as the post-challenge reflection (shared
 * <StepFlowShell> chrome): difficulty → per-practice tracking → the override
 * reflection gate (anchored to the practice's signature urge) → tactics →
 * notes. Difficulty is the only required step; everything after is skippable,
 * so a quick log is still two taps. Hosted full-screen by both the forward
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
  const [hitHardMoment, setHitHardMoment] = useState<boolean | null>(null);
  const [tactics, setTactics] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const submittedRef = useRef(false);

  // The targeted gate question — anchored to this practice's signature urge.
  const gateQuestion = useMemo(() => {
    if (practice?.resistanceMoment) {
      return `When ${practice.resistanceMoment} — did you hit that moment?`;
    }
    return 'Was there a moment you wanted to quit?';
  }, [practice]);

  // The tactics step only exists once they've confirmed a hard moment, so the
  // step list (and the progress bar's total) is derived, not fixed.
  const steps: Step[] = useMemo(() => {
    const list: Step[] = [{ kind: 'difficulty', key: 'difficulty' }];
    tracking.forEach((field) =>
      list.push({ kind: 'tracking', key: `track_${field.key}`, field })
    );
    list.push({ kind: 'gate', key: 'gate' });
    if (hitHardMoment === true) list.push({ kind: 'tactics', key: 'tactics' });
    list.push({ kind: 'notes', key: 'notes' });
    return list;
  }, [tracking, hitHardMoment]);

  // Clamp: the step list shrinks when the gate answer is cleared.
  const safeIndex = Math.min(index, steps.length - 1);
  const current = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  // Focus the notes input after the prompt bubble has animated in.
  const notesRef = useRef<TextInput>(null);
  useEffect(() => {
    if (current?.kind !== 'notes') return;
    const timer = setTimeout(() => notesRef.current?.focus(), 800);
    return () => clearTimeout(timer);
  }, [current?.kind]);

  const canContinue = (() => {
    switch (current.kind) {
      case 'difficulty':
        return !!selected;
      case 'tracking':
        return metrics[current.field.key] !== undefined;
      case 'gate':
        return hitHardMoment !== null;
      case 'tactics':
        return tactics.length > 0;
      case 'notes':
        return notes.trim().length > 0;
    }
  })();

  const handleSubmit = () => {
    if (!selected || submittedRef.current) return;
    submittedRef.current = true;
    const trimmed = notes.trim();
    onSubmit({
      difficulty: selected,
      notes: trimmed || undefined,
      metrics: Object.keys(metrics).length ? metrics : undefined,
      hitHardMoment: hitHardMoment ?? undefined,
      tactics: tactics.length ? tactics : undefined,
    });
  };

  const goNext = () => {
    if (isLast) {
      handleSubmit();
      return;
    }
    setDirection('forward');
    setIndex(safeIndex + 1);
  };

  const goBack = () => {
    if (safeIndex <= 0) return;
    setDirection('backward');
    setIndex(safeIndex - 1);
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

  const toggleTactic = (id: string) => {
    setTactics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  // Answer the gate (tap again to clear); dropping back off "yes" discards any
  // tactics picked so a stale selection can't ride along in the log.
  const answerGate = (value: boolean) => {
    const next = hitHardMoment === value ? null : value;
    setHitHardMoment(next);
    if (next !== true) setTactics([]);
  };

  const message = (() => {
    switch (current.kind) {
      case 'difficulty':
        return 'How hard was it to push through?';
      case 'tracking':
        return current.field.label;
      case 'gate':
        return gateQuestion;
      case 'tactics':
        return 'What got you through it?';
      case 'notes':
        return hitHardMoment === true
          ? 'Anything specific you told yourself in that moment?'
          : 'Any notes on this rep?';
    }
  })();

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

  const renderStepInput = () => {
    switch (current.kind) {
      case 'difficulty':
        return (
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

      case 'tracking':
        return renderTrackingField(current.field);

      case 'gate':
        return (
          <View style={styles.gateRow}>
            <TouchableOpacity
              style={[styles.gateBtn, hitHardMoment === true && styles.gateBtnYes]}
              onPress={() => answerGate(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gateBtnText, hitHardMoment === true && styles.gateBtnTextActive]}>
                Yes, I did
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gateBtn, hitHardMoment === false && styles.gateBtnNo]}
              onPress={() => answerGate(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gateBtnText, hitHardMoment === false && styles.gateBtnTextActive]}>
                Not today
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'tactics':
        return (
          <View style={styles.chipRow}>
            {OVERRIDE_TACTICS.map((t) => {
              const active = tactics.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tacticChip, active && styles.tacticChipActive]}
                  onPress={() => toggleTactic(t.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={14}
                    color={active ? Colors.white : Colors.primary}
                  />
                  <Text style={[styles.tacticText, active && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'notes':
        return (
          <>
            <TextInput
              ref={notesRef}
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={hitHardMoment === true ? '"I told myself…"' : 'A quick line about how it went…'}
              placeholderTextColor={Colors.gray + '80'}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={280}
            />
            <Text style={styles.charCount}>{notes.length}/280</Text>
          </>
        );
    }
  };

  return (
    <StepFlowShell
      progress={(safeIndex + 1) / steps.length}
      stepKey={current.key}
      direction={direction}
      accentColor={accentColor}
      title={title}
      canGoBack={safeIndex > 0}
      onBack={goBack}
      onCancel={onCancel}
      canContinue={canContinue}
      allowSkip={current.kind !== 'difficulty'}
      nextLabel={isLast ? 'Log it' : 'Next'}
      skipLabel={isLast ? 'Skip & log it' : 'Skip'}
      isLast={isLast}
      onNext={goNext}
    >
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

          {current.kind !== 'difficulty' && (
            <Text style={styles.optionalBadge}>Optional — skip if it doesn't apply</Text>
          )}

          {renderStepInput()}
        </ScrollView>
      </KeyboardAvoidingView>
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

  gateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  gateBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  gateBtnYes: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  gateBtnNo: { borderColor: Colors.gray, backgroundColor: Colors.gray },
  gateBtnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  gateBtnTextActive: { color: Colors.white },

  tacticChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  tacticChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tacticText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.primary },

  notesInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 140,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});

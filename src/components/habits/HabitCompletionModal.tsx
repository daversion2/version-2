import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { Slider } from '../common/Slider';
import { HabitActionPlan, PracticeCompletionInput } from '../../types';
import { formatHabitPlanLine } from '../../utils/habitPlan';
import { getPractice, TrackingField } from '../../data/practices';
import { OVERRIDE_TACTICS } from '../../data/overrideTactics';

interface Props {
  visible: boolean;
  habitName: string;
  /** Catalog id, when this is a curated practice — drives tracking + the targeted reflection. */
  practiceId?: string;
  actionPlan?: HabitActionPlan;
  onSubmit: (input: PracticeCompletionInput) => void;
  onCancel: () => void;
}

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
  const tracking = practice?.tracking ?? [];

  const [selected, setSelected] = useState<'easy' | 'challenging' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number | string>>({});
  const [hitHardMoment, setHitHardMoment] = useState<boolean | null>(null);
  const [tactics, setTactics] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // The targeted gate question — anchored to this practice's signature urge.
  const gateQuestion = useMemo(() => {
    if (practice?.resistanceMoment) {
      return `When ${practice.resistanceMoment} — did you hit that moment?`;
    }
    return 'Was there a moment you wanted to quit?';
  }, [practice]);

  const resetState = () => {
    setSelected(null);
    setExpanded(false);
    setMetrics({});
    setHitHardMoment(null);
    setTactics([]);
    setNotes('');
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

  const handleSubmit = () => {
    if (!selected) return;
    const trimmed = notes.trim();
    onSubmit({
      difficulty: selected,
      notes: trimmed || undefined,
      metrics: Object.keys(metrics).length ? metrics : undefined,
      hitHardMoment: hitHardMoment ?? undefined,
      tactics: tactics.length ? tactics : undefined,
    });
    resetState();
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const renderTrackingField = (field: TrackingField) => {
    const current = metrics[field.key];

    // Numeric fields (duration / number) → slider.
    if (field.type !== 'choice') {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const touched = typeof current === 'number';
      const shown = touched ? (current as number) : field.default ?? Math.round((min + max) / 2);
      return (
        <View key={field.key} style={styles.fieldBlock}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={[styles.fieldValue, !touched && styles.fieldValueMuted]}>
              {shown}
              {field.unit ? ` ${field.unit}` : ''}
            </Text>
          </View>
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
    const chips = (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));
    return (
      <View key={field.key} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.chipRow}>
          {chips.map((c) => {
            const active = current === c.value;
            return (
              <TouchableOpacity
                key={String(c.value)}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setMetric(field.key, c.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        {/* Backdrop sits BEHIND the card as an absolute sibling — not an ancestor
            of the ScrollView — so it can dismiss on outside-tap without stealing
            the scroll gesture. */}
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{habitName}</Text>
            {!!planLine && <Text style={styles.planRecap}>{planLine}</Text>}

            <Text style={styles.subtitle}>How hard was it to push through?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.option, selected === 'easy' && styles.optionActiveEasy]}
                onPress={() => setSelected('easy')}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionNum, selected === 'easy' && styles.optionTextActive]}>1</Text>
                <Text style={[styles.optionLabel, selected === 'easy' && styles.optionTextActive]}>Easy day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.option, selected === 'challenging' && styles.optionActiveChallenging]}
                onPress={() => setSelected('challenging')}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionNum, selected === 'challenging' && styles.optionTextActive]}>2</Text>
                <Text style={[styles.optionLabel, selected === 'challenging' && styles.optionTextActive]}>
                  Challenging today
                </Text>
              </TouchableOpacity>
            </View>

            {!expanded ? (
              <TouchableOpacity
                style={styles.expandToggle}
                onPress={() => setExpanded(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.expandText}>Track &amp; reflect</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.depth}>
                {/* Detailed tracking (per-practice, optional) */}
                {tracking.length > 0 && (
                  <View style={styles.depthSection}>
                    {tracking.map(renderTrackingField)}
                  </View>
                )}

                {/* Override reflection */}
                <View style={styles.depthSection}>
                  <Text style={styles.gateQuestion}>{gateQuestion}</Text>
                  <View style={styles.gateRow}>
                    <TouchableOpacity
                      style={[styles.gateBtn, hitHardMoment === true && styles.gateBtnYes]}
                      onPress={() => setHitHardMoment(hitHardMoment === true ? null : true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gateBtnText, hitHardMoment === true && styles.gateBtnTextActive]}>
                        Yes, I did
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.gateBtn, hitHardMoment === false && styles.gateBtnNo]}
                      onPress={() => setHitHardMoment(hitHardMoment === false ? null : false)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gateBtnText, hitHardMoment === false && styles.gateBtnTextActive]}>
                        Not today
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {hitHardMoment === true && (
                    <>
                      <Text style={styles.fieldLabel}>What got you through it?</Text>
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
                    </>
                  )}

                  <TextInput
                    style={styles.notesInput}
                    placeholder={
                      hitHardMoment === true
                        ? 'Anything specific? "I told myself…"'
                        : 'Any notes on this rep?'
                    }
                    placeholderTextColor={Colors.gray}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    maxLength={280}
                  />
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <Button title="Log it" onPress={handleSubmit} disabled={!selected} style={{ flex: 1 }} />
              <Button title="Cancel" onPress={handleCancel} variant="outline" style={{ flex: 1 }} />
            </View>
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
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActiveEasy: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  optionActiveChallenging: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  optionNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  optionLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: Spacing.xs },
  optionTextActive: { color: Colors.white },

  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  expandText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },

  depth: { marginBottom: Spacing.md },
  depthSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  fieldBlock: { marginBottom: Spacing.md },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  fieldValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  fieldValueMuted: { color: Colors.gray },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
  chipTextActive: { color: Colors.white },

  gateQuestion: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  gateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  gateBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  },
  tacticChipActive: { backgroundColor: Colors.primary },
  tacticText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary },

  notesInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  HabitSchedule,
  WEEKDAY_LABELS,
  WEEK_DISPLAY_ORDER,
  Weekday,
} from '../../services/habitSchedule';

const MIN_TARGET = 1;
const MAX_TARGET = 7;

interface WeeklyGoalSheetProps {
  visible: boolean;
  /** Practice name, for the sheet copy. */
  practiceName: string;
  /** The schedule as it stands. See services/practices.habitSchedule(). */
  initialSchedule: HabitSchedule;
  /** Persist the chosen schedule. */
  onSave: (schedule: HabitSchedule) => void;
  onClose: () => void;
}

const COUNT_PRESETS: { label: string; value: number }[] = [
  { label: '3×', value: 3 },
  { label: '5×', value: 5 },
  { label: 'Daily', value: 7 },
];

const DAY_PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

/**
 * Bottom sheet for a practice's schedule.
 *
 * Two modes, because the two are genuinely different promises. "4× a week"
 * leaves the days to you and can only ever be judged at the end of the week;
 * "Mon, Wed & Fri" names them, which is what makes a missed day a fact rather
 * than a projection — and what lets the reminder fire only on days you actually
 * claimed. Writes through setHabitSchedule, which keeps the weekly target and
 * the days in agreement.
 */
export const WeeklyGoalSheet: React.FC<WeeklyGoalSheetProps> = ({
  visible,
  practiceName,
  initialSchedule,
  onSave,
  onClose,
}) => {
  const [mode, setMode] = useState<HabitSchedule['kind']>(initialSchedule.kind);
  const [target, setTarget] = useState(
    initialSchedule.kind === 'count' ? initialSchedule.target : 3
  );
  const [days, setDays] = useState<Weekday[]>(
    initialSchedule.kind === 'days' ? initialSchedule.days : []
  );

  // Re-seed when the sheet (re)opens for a (different) practice.
  useEffect(() => {
    if (!visible) return;
    setMode(initialSchedule.kind);
    setTarget(clamp(initialSchedule.kind === 'count' ? initialSchedule.target : 3));
    setDays(initialSchedule.kind === 'days' ? initialSchedule.days : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dec = () => setTarget((v) => clamp(v - 1));
  const inc = () => setTarget((v) => clamp(v + 1));

  const toggleDay = (day: Weekday) =>
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );

  // A day-scheduled habit with no days is a habit that is never due. Saving is
  // blocked rather than silently falling back to a count, which would discard
  // the mode the user just picked.
  const canSave = mode === 'count' || days.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(mode === 'days' ? { kind: 'days', days } : { kind: 'count', target: clamp(target) });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>
            When do you want to practice <Text style={styles.bold}>{practiceName}</Text>? You can
            change this anytime.
          </Text>

          {/* Mode switch */}
          <View style={styles.modeRow}>
            {(
              [
                { kind: 'count', label: 'Times a week' },
                { kind: 'days', label: 'Specific days' },
              ] as const
            ).map((option) => {
              const on = mode === option.kind;
              return (
                <TouchableOpacity
                  key={option.kind}
                  style={[styles.modeBtn, on && styles.modeBtnOn]}
                  onPress={() => setMode(option.kind)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.modeText, on && styles.modeTextOn]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'count' ? (
            <>
              {/* Stepper */}
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.step, target <= MIN_TARGET && styles.stepDisabled]}
                  onPress={dec}
                  disabled={target <= MIN_TARGET}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="remove"
                    size={26}
                    color={target <= MIN_TARGET ? Colors.border : Colors.primary}
                  />
                </TouchableOpacity>

                <View style={styles.valueBox}>
                  <Text style={styles.valueNum}>{target}</Text>
                  <Text style={styles.valueUnit}>
                    {target === 7 ? 'every day' : 'times / week'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.step, target >= MAX_TARGET && styles.stepDisabled]}
                  onPress={inc}
                  disabled={target >= MAX_TARGET}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add"
                    size={26}
                    color={target >= MAX_TARGET ? Colors.border : Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Presets */}
              <View style={styles.presets}>
                {COUNT_PRESETS.map((p) => {
                  const on = target === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.preset, on && styles.presetOn]}
                      onPress={() => setTarget(p.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modeNote}>
                Any days you like — the week is what counts.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.dayRow}>
                {WEEK_DISPLAY_ORDER.map((day) => {
                  const on = days.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                      onPress={() => toggleDay(day)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={WEEKDAY_LABELS[day]}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                        {WEEKDAY_LABELS[day][0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.presets}>
                {DAY_PRESETS.map((p) => {
                  const on =
                    p.days.length === days.length && p.days.every((d) => days.includes(d));
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[styles.preset, on && styles.presetOn]}
                      onPress={() => setDays(p.days)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modeNote}>
                {days.length === 0
                  ? 'Pick at least one day.'
                  : `${days.length} ${days.length === 1 ? 'day' : 'days'} a week. Missing one counts as a miss — and reminders only fire on these days.`}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>Save schedule</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const clamp = (n: number) => Math.min(Math.max(Math.round(n) || MIN_TARGET, MIN_TARGET), MAX_TARGET);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  bold: { fontFamily: Fonts.secondaryBold, color: Colors.dark },

  modeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: 4,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  modeBtnOn: { backgroundColor: Colors.white },
  modeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  modeTextOn: { color: Colors.primary },
  modeNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  step: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { borderColor: Colors.border },
  valueBox: { alignItems: 'center', minWidth: 110 },
  valueNum: { fontFamily: Fonts.primaryBold, fontSize: 44, color: Colors.dark, lineHeight: 48 },
  valueUnit: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2 },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.gray },
  dayChipTextOn: { color: Colors.white },

  presets: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  preset: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  presetTextOn: { color: Colors.white },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: Colors.border },
  saveText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

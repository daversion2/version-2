import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

const MIN_TARGET = 1;
const MAX_TARGET = 7;

interface WeeklyGoalSheetProps {
  visible: boolean;
  /** Practice name, for the sheet copy. */
  practiceName: string;
  /** Current weekly target (1–7). */
  initialTarget: number;
  /** Persist the chosen target. */
  onSave: (target: number) => void;
  onClose: () => void;
}

const PRESETS: { label: string; value: number }[] = [
  { label: '3×', value: 3 },
  { label: '5×', value: 5 },
  { label: 'Daily', value: 7 },
];

/**
 * Bottom sheet for setting a practice's weekly commitment (times per week). A
 * − / + stepper plus quick presets; writes back to PracticeInstance.target_count_per_week.
 */
export const WeeklyGoalSheet: React.FC<WeeklyGoalSheetProps> = ({
  visible,
  practiceName,
  initialTarget,
  onSave,
  onClose,
}) => {
  const [value, setValue] = useState(initialTarget);

  // Re-seed when the sheet (re)opens for a (different) practice.
  useEffect(() => {
    if (visible) setValue(clamp(initialTarget));
  }, [visible, initialTarget]);

  const dec = () => setValue((v) => clamp(v - 1));
  const inc = () => setValue((v) => clamp(v + 1));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Weekly goal</Text>
          <Text style={styles.subtitle}>
            How many times per week do you want to practice <Text style={styles.bold}>{practiceName}</Text>? You
            can change this anytime.
          </Text>

          {/* Stepper */}
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.step, value <= MIN_TARGET && styles.stepDisabled]}
              onPress={dec}
              disabled={value <= MIN_TARGET}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={26} color={value <= MIN_TARGET ? Colors.border : Colors.primary} />
            </TouchableOpacity>

            <View style={styles.valueBox}>
              <Text style={styles.valueNum}>{value}</Text>
              <Text style={styles.valueUnit}>{value === 7 ? 'every day' : 'times / week'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.step, value >= MAX_TARGET && styles.stepDisabled]}
              onPress={inc}
              disabled={value >= MAX_TARGET}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color={value >= MAX_TARGET ? Colors.border : Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Presets */}
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const on = value === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.preset, on && styles.presetOn]}
                  onPress={() => setValue(p.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              onSave(clamp(value));
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>Save goal</Text>
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

  presets: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
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
  saveText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

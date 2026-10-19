import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { formatRelativeDay, getEditableDates } from '../../utils/date';

export interface PastSessionInput {
  date: string;
  minutes: number;
  mode?: string;
}

interface Props {
  visible: boolean;
  accent: string;
  /** "Log a past workout" */
  title: string;
  minutes: { min: number; max: number; step: number; initial: number };
  /** Meditate's Sit / Breathe / NSDR. */
  modes?: { value: string; label: string }[];
  onSave: (input: PastSessionInput) => void;
  onCancel: () => void;
}

/**
 * "Log a past session" inside an app. Credit only comes through the app
 * (founder, 2026-10-18), so a session done without it — or forgotten — is
 * entered here: which day (within the week the rest of the app allows), how
 * long, and for Meditate which kind. Saving hands it to Today to be rated.
 */
export const PastSessionSheet: React.FC<Props> = ({ visible, accent, title, minutes, modes, onSave, onCancel }) => {
  const insets = useSafeAreaInsets();
  const days = getEditableDates();
  const [date, setDate] = useState(days[0]);
  const [mins, setMins] = useState(minutes.initial);
  const [mode, setMode] = useState(modes?.[0]?.value);

  useEffect(() => {
    if (visible) {
      setDate(getEditableDates()[0]);
      setMins(minutes.initial);
      setMode(modes?.[0]?.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const step = (dir: 1 | -1) =>
    setMins((m) => Math.min(minutes.max, Math.max(minutes.min, m + dir * minutes.step)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>When?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {days.map((d) => {
              const on = d === date;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                  onPress={() => setDate(d)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{formatRelativeDay(d)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!!modes?.length && (
            <>
              <Text style={styles.label}>What?</Text>
              <View style={styles.modes}>
                {modes.map((m) => {
                  const on = m.value === mode;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.chip, styles.modeChip, on && { backgroundColor: accent, borderColor: accent }]}
                      onPress={() => setMode(m.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>How long?</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => step(-1)} accessibilityLabel="Less time">
              <Text style={styles.stepGlyph}>−</Text>
            </TouchableOpacity>
            <Text style={styles.value}>{mins} min</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => step(1)} accessibilityLabel="More time">
              <Text style={styles.stepGlyph}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.save, { backgroundColor: accent }]}
            onPress={() => onSave({ date, minutes: mins, mode })}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>Save & rate it</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Next: “How hard was it to start?” on Today.</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.lg - 2,
    gap: Spacing.sm,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.xs },
  chips: { gap: Spacing.sm },
  modes: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChip: { flex: 1 },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  chipTextOn: { color: Colors.white },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm + 4,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  value: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  save: { height: 54, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  saveText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.white },
  hint: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, textAlign: 'center' },
});

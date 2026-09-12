import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { SchedulePicker } from '../common/SchedulePicker';
import {
  HabitSchedule,
  defaultScheduleForTarget,
  isScheduleValid,
} from '../../services/habitSchedule';

/**
 * A habit that never had a goal opens on the app-wide default rather than on
 * "0× a week" with the save button dead — a sheet whose first job is to make
 * the user fix a zero is a sheet that explains nothing. Nothing is written
 * until they press Save.
 */
const seed = (schedule: HabitSchedule): HabitSchedule =>
  isScheduleValid(schedule) ? schedule : defaultScheduleForTarget();

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

/**
 * Bottom sheet for a practice's schedule — the EDIT-AFTER-THE-FACT surface.
 *
 * The control inside is the same SchedulePicker that onboarding, the library
 * and the custom-habit form use, so changing a schedule a month later offers
 * exactly the promises that were available when the habit was created. Saving
 * goes through setHabitSchedule, which keeps the weekly target and the days in
 * agreement.
 */
export const WeeklyGoalSheet: React.FC<WeeklyGoalSheetProps> = ({
  visible,
  practiceName,
  initialSchedule,
  onSave,
  onClose,
}) => {
  const [schedule, setSchedule] = useState<HabitSchedule>(() => seed(initialSchedule));

  // Re-seed when the sheet (re)opens for a (different) practice.
  useEffect(() => {
    if (!visible) return;
    setSchedule(seed(initialSchedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // A habit with no days is a habit that is never due, and a target of zero is
  // no goal at all. Saving is blocked rather than silently falling back.
  const canSave = isScheduleValid(schedule);

  const handleSave = () => {
    if (!canSave) return;
    onSave(schedule);
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

          <SchedulePicker
            schedule={schedule}
            onChange={setSchedule}
            style={styles.picker}
            helper={
              schedule.kind === 'days'
                ? 'Missing one counts as a miss — and reminders only fire on these days.'
                : 'Any days you like — the week is what counts.'
            }
          />

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

  picker: { marginTop: Spacing.lg, marginBottom: Spacing.lg },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: Colors.border },
  saveText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

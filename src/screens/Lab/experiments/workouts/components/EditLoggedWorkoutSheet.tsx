import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { CompletionLog } from '../../../../../types';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../../../../../services/workoutEdit';
import { removeRating, updateRatedMinutes } from '../../../../../services/appRatingEdits';
import { withTimeout } from '../../../../../services/labWorkouts';
import { showAlert, showConfirm } from '../../../../../utils/alert';
import { NumberStepper } from './NumberStepper';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { ws } from './workoutsStyle';

const SAVE_MS = 15000;
const SHEET_GAP_MS = 400;
const FALLBACK_MINUTES = 45;

export const loggedMinutes = (log?: Pick<CompletionLog, 'metrics'>): number | undefined => {
  const value = log?.metrics?.duration_min;
  return typeof value === 'number' ? value : undefined;
};

/**
 * A workout logged with only a day and a length has no sets to correct: the
 * length, or deleting it. Its rating log is the whole record of it.
 */
export const EditLoggedWorkoutSheet: React.FC<{
  userId: string;
  log: CompletionLog | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ userId, log, onClose, onChanged }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const [minutes, setMinutes] = useState(FALLBACK_MINUTES);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (log) {
      setMinutes(loggedMinutes(log) ?? FALLBACK_MINUTES);
      setBusy(false);
    }
  }, [log]);

  const clamp = (n: number) => Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(n)));

  const save = async () => {
    if (!log) return;
    setBusy(true);
    try {
      await withTimeout(updateRatedMinutes(userId, log, minutes), SAVE_MS);
      onChanged();
      onClose();
    } catch {
      showAlert(
        t('workouts.editLogged.failTitle', 'Couldn’t save that'),
        t('workouts.editLogged.failMsg', 'Check your connection and try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await withTimeout(removeRating(userId, id), SAVE_MS);
      onChanged();
    } catch {
      showAlert(
        t('workouts.editLogged.deleteFailTitle', 'Couldn’t delete that workout'),
        t('workouts.editLogged.failMsg', 'Check your connection and try again.')
      );
    }
  };

  const askDelete = () => {
    if (!log) return;
    const { id } = log;
    onClose();
    setTimeout(
      () =>
        showConfirm(
          t('workouts.editLogged.deleteTitle', 'Delete this workout?'),
          t('workouts.editLogged.deleteMsg', 'It comes off your week, along with its rating and XP. This can’t be undone.'),
          () => remove(id),
          t('workouts.editLogged.delete', 'Delete')
        ),
      SHEET_GAP_MS
    );
  };

  return (
    <Modal visible={!!log} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}>
          <Copy id="workouts.editLogged.title" style={styles.title}>
            Edit workout
          </Copy>
          <Copy id="workouts.editLogged.sub" style={ws.muted}>
            Logged without details, so its length is all there is to change.
          </Copy>
          <NumberStepper
            label={t('workouts.editLogged.minutes', 'Minutes')}
            value={minutes}
            onDecrement={() => setMinutes((m) => clamp(m - 5))}
            onIncrement={() => setMinutes((m) => clamp(m + 5))}
            onSubmitValue={(n) => setMinutes(clamp(n))}
          />
          <TouchableOpacity
            style={[ws.primaryBtn, busy && ws.disabled]}
            onPress={save}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={Colors.white} /> : <Copy id="workouts.editLogged.save" style={ws.primaryBtnText}>
                Save
              </Copy>}
          </TouchableOpacity>
          <TouchableOpacity style={ws.textBtn} onPress={askDelete} disabled={busy} accessibilityRole="button">
            <Copy id="workouts.editLogged.deleteWorkout" style={ws.destructiveText}>
              Delete workout
            </Copy>
          </TouchableOpacity>
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
  title: { ...TextStyles.title2, color: Colors.dark },
});

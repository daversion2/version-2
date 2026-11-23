import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { CompletionLog } from '../../../../../types';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../../../../../services/workoutEdit';
import { removeRating, updateRatedMinutes } from '../../../../../services/workoutRatingEdits';
import { withTimeout } from '../../../../../services/labWorkouts';
import { showAlert, showConfirm } from '../../../../../utils/alert';
import { NumberStepper } from './NumberStepper';
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
      showAlert('Couldn’t save that', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await withTimeout(removeRating(userId, id), SAVE_MS);
      onChanged();
    } catch {
      showAlert('Couldn’t delete that workout', 'Check your connection and try again.');
    }
  };

  const askDelete = () => {
    if (!log) return;
    const { id } = log;
    onClose();
    setTimeout(
      () =>
        showConfirm(
          'Delete this workout?',
          'It comes off your week, along with its rating and XP. This can’t be undone.',
          () => remove(id),
          'Delete'
        ),
      SHEET_GAP_MS
    );
  };

  return (
    <Modal visible={!!log} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}>
          <Text style={styles.title}>Edit workout</Text>
          <Text style={ws.muted}>Logged without details, so its length is all there is to change.</Text>
          <NumberStepper
            label="Minutes"
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
            {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={ws.textBtn} onPress={askDelete} disabled={busy} accessibilityRole="button">
            <Text style={ws.destructiveText}>Delete workout</Text>
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

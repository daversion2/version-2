import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, View } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useCopy } from '../../context/CopyContext';

export interface LogToastContent {
  /** Changes on every log so a second toast restarts the timer. */
  key: number;
  points: number;
  /** "Cold exposure · 3 min · Med" */
  text: string;
  /** "Logged for Yesterday", for a backfilled check-in. */
  context?: string | null;
  /** Offer "Add a note" — after a Med or Hard rating. */
  canAddNote: boolean;
}

interface Props {
  toast: LogToastContent | null;
  onAddNote: () => void;
  onHide: () => void;
}

const SHOW_MS = 3200;
// Long enough to read and reach for the link.
const SHOW_WITH_NOTE_MS = 6000;

/**
 * The everyday "+N XP" after a check-in, in place of the full celebration —
 * which is now kept for milestones (a streak tier, the first check-in).
 */
export const LogToast: React.FC<Props> = ({ toast, onAddNote, onHide }) => {
  const t = useCopy();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(
      () =>
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onHide()),
      toast.canAddNote ? SHOW_WITH_NOTE_MS : SHOW_MS
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  if (!toast) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Text style={styles.points}>{t('today.toast.points', '+{points} XP', { points: toast.points })}</Text>
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {toast.text}
        </Text>
        {!!toast.context && <Text style={styles.context}>{toast.context}</Text>}
      </View>
      {toast.canAddNote && (
        <TouchableOpacity onPress={onAddNote} style={styles.noteBtn} accessibilityRole="button">
          <Text style={styles.noteText}>{t('today.toast.addNote', 'Add a note')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    backgroundColor: Colors.dark,
    borderRadius: BorderRadius.md + 2,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    minHeight: 56,
  },
  points: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.white },
  body: { flex: 1, paddingVertical: Spacing.sm + 2 },
  text: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
  context: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.border },
  noteBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm + 4 },
  noteText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.secondary },
});

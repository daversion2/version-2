import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { formatClock } from '../../../../../services/workoutMath';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

interface Props {
  remainingSec: number;
  totalSec: number;
  nextLabel: string;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

/** How much of the screen the sheet covers, so the set screen can scroll clear of it. */
export const REST_SHEET_HEIGHT = 250;

/**
 * The rest between rounds: a sheet along the bottom, not a blocking overlay —
 * resting is when you load the bar for the next set, so the weight and reps
 * above stay live. Logging the next set ends the rest on its own.
 */
export const RestSheet: React.FC<Props> = ({ remainingSec, totalSec, nextLabel, onAdjust, onSkip }) => {
  const insets = useSafeAreaInsets();
  const progress = totalSec > 0 ? Math.min(1, remainingSec / totalSec) : 0;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.sheet, { paddingBottom: Spacing.lg + insets.bottom }]}>
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.clock} accessibilityRole="timer">
          {formatClock(remainingSec)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[ws.muted, styles.next]}>Up next: {nextLabel}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(-15)} accessibilityLabel="15 seconds less">
            <Text style={styles.adjustText}>−15s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ws.primaryBtn, styles.skip]} onPress={onSkip}>
            <Text style={ws.primaryBtnText}>Skip rest</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(15)} accessibilityLabel="15 seconds more">
            <Text style={styles.adjustText}>+15s</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray,
  },
  clock: { fontFamily: Fonts.primaryBold, fontSize: 56, color: WORKOUTS_ACCENT, fontVariant: ['tabular-nums'] },
  track: { width: '100%', height: 6, borderRadius: 3, backgroundColor: WORKOUTS_TINT, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: WORKOUTS_ACCENT },
  next: { textAlign: 'center', marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'stretch' },
  adjust: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  adjustText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  skip: { flex: 1 },
});

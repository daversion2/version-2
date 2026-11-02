import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { formatClock } from '../../../../../services/workoutMath';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

interface Props {
  remainingSec: number;
  totalSec: number;
  nextLabel: string;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  /** On the clock, skipping the rest starts the next round: "Start now". */
  skipLabel?: string;
}

/** How much of the screen the sheet covers, so the set screen can scroll clear of it. */
export const REST_SHEET_HEIGHT = 290;

/**
 * The rest between rounds: a sheet along the bottom, not a blocking overlay —
 * resting is when you load the bar for the next set, so the weight and reps
 * above stay live. Logging the next set ends the rest on its own.
 */
export const RestSheet: React.FC<Props> = ({ remainingSec, totalSec, nextLabel, onAdjust, onSkip, skipLabel }) => {
  const insets = useSafeAreaInsets();
  const progress = totalSec > 0 ? Math.min(1, remainingSec / totalSec) : 0;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.sheet, { paddingBottom: Spacing.lg + insets.bottom }]} accessibilityLabel="Rest">
        <View style={styles.grabber} />
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.clock} accessibilityRole="timer">
          {formatClock(remainingSec)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.next}>Up next: {nextLabel}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(-15)} accessibilityLabel="15 seconds less">
            <Text style={styles.adjustText}>−15 s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ws.primaryBtn, styles.skip]} onPress={onSkip}>
            <Text style={ws.primaryBtnText}>{skipLabel ?? 'Skip rest'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(15)} accessibilityLabel="15 seconds more">
            <Text style={styles.adjustText}>+15 s</Text>
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
    paddingTop: Spacing.sm,
    paddingHorizontal: 20,
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: Colors.dark,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.separator, marginBottom: Spacing.xs },
  label: { ...TextStyles.subhead, fontWeight: '600', color: Colors.gray },
  clock: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 72,
    lineHeight: 80,
    fontWeight: '300',
    color: Colors.dark,
    fontVariant: ['tabular-nums'],
  },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: Colors.lightGray, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: WORKOUTS_ACCENT },
  next: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center', marginBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  adjust: {
    height: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: 26,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: { ...TextStyles.headline, color: Colors.dark },
  skip: { flex: 1, paddingHorizontal: Spacing.sm },
});

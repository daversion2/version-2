import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { formatClock } from '../../../../../services/workoutMath';
import { triggerTapHaptic } from '../../../../../utils/haptics';
import { NumberStepper } from './NumberStepper';
import { WORKOUTS_ACCENT } from './workoutsStyle';

interface Props {
  /** The seconds that will be logged. */
  seconds: number;
  /** What to aim for — buzzes once when the hold reaches it. */
  targetSec: number;
  onChange: (seconds: number) => void;
  onRunningChange?: (running: boolean) => void;
}

/**
 * A timed hold. Start counts up from zero against the target; Stop puts what
 * you actually held into the box. Or skip the timer and type it — you might
 * have timed it on the gym clock.
 */
export const HoldTimer: React.FC<Props> = ({ seconds, targetSec, onChange, onRunningChange }) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const buzzedRef = useRef(false);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(sec);
      if (!buzzedRef.current && sec >= targetSec) {
        buzzedRef.current = true;
        triggerTapHaptic();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [startedAt, targetSec]);

  const start = () => {
    buzzedRef.current = false;
    setElapsed(0);
    setStartedAt(Date.now());
    onRunningChange?.(true);
  };

  const stop = () => {
    const sec = startedAt === null ? elapsed : Math.floor((Date.now() - startedAt) / 1000);
    setStartedAt(null);
    onChange(Math.max(1, sec));
    onRunningChange?.(false);
  };

  if (startedAt !== null) {
    const reached = elapsed >= targetSec;
    return (
      <View style={styles.running}>
        <Text style={[styles.clock, reached && styles.clockReached]}>{formatClock(elapsed)}</Text>
        <Text style={styles.target}>{reached ? 'Target reached — keep going or stop' : `Target ${formatClock(targetSec)}`}</Text>
        <TouchableOpacity style={styles.stop} onPress={stop} accessibilityRole="button">
          <Ionicons name="stop" size={18} color={Colors.white} />
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.idle}>
      <NumberStepper
        label="Seconds"
        value={seconds}
        suffix={formatClock(seconds)}
        onDecrement={() => onChange(Math.max(1, seconds - 5))}
        onIncrement={() => onChange(seconds + 5)}
        onSubmitValue={(v) => onChange(Math.max(1, Math.round(v)))}
      />
      <TouchableOpacity style={styles.start} onPress={start} accessibilityRole="button">
        <Ionicons name="play" size={16} color={WORKOUTS_ACCENT} />
        <Text style={styles.startText}>Start timer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  idle: { gap: Spacing.sm },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: WORKOUTS_ACCENT,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  running: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.lightGray,
  },
  clock: { fontFamily: Fonts.primaryBold, fontSize: 56, color: Colors.dark, fontVariant: ['tabular-nums'] },
  clockReached: { color: WORKOUTS_ACCENT },
  target: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
  },
  stopText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

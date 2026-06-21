import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface StopwatchProps {
  onComplete: (seconds: number) => void;
  accentColor?: string;
  startLabel?: string;
  stopLabel?: string;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Count-up timer for "stay as long as you can" baseline tests. Tap to start;
 * tap again to stop, which fires onComplete(elapsedSeconds). Reusable — also the
 * seed for future Meditation/Breathwork session screens.
 */
export const Stopwatch: React.FC<StopwatchProps> = ({
  onComplete,
  accentColor = Colors.primary,
  startLabel = 'Start',
  stopLabel = "I stopped",
}) => {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const handlePress = () => {
    if (!running) {
      setRunning(true);
    } else {
      setRunning(false);
      onComplete(elapsedRef.current);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: running ? accentColor : Colors.border }]}>
        <Text style={[styles.time, { color: accentColor }]}>{fmt(elapsed)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: accentColor }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>{running ? stopLabel : startLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.xl,
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
  },
  btn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    minWidth: 200,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});

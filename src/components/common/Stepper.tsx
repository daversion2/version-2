import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, TextStyles } from '../../constants/theme';
import { triggerTapHaptic } from '../../utils/haptics';

/**
 * − value + with round 44pt buttons: session length, weekly goals, weight and
 * reps. The value can't leave [min, max]; a button at its limit greys out.
 */
export const Stepper: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** How the value reads, e.g. (n) => `${n} min`. */
  format?: (value: number) => string;
  /** What's being changed, for VoiceOver: "Session length". */
  accessibilityLabel: string;
}> = ({ value, onChange, min, max, step = 1, format = String, accessibilityLabel }) => {
  const set = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    if (clamped === value) return;
    triggerTapHaptic();
    onChange(clamped);
  };
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? value + step : value - step)}
    >
      <TouchableOpacity style={styles.button} onPress={() => set(value - step)} disabled={atMin}>
        <Text style={[styles.sign, atMin && styles.signOff]}>−</Text>
      </TouchableOpacity>
      <Text style={styles.value}>{format(value)}</Text>
      <TouchableOpacity style={styles.button} onPress={() => set(value + step)} disabled={atMax}>
        <Text style={[styles.sign, atMax && styles.signOff]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: { fontSize: 22, lineHeight: 26, color: Colors.primary },
  signOff: { color: Colors.separator },
  value: { ...TextStyles.headline, minWidth: 80, textAlign: 'center', color: Colors.dark },
});

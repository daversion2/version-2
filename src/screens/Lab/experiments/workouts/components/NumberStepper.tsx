import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { formatNumber } from '../../../../../services/workoutMath';
import { WORKOUTS_ACCENT } from './workoutsStyle';

interface Props {
  label: string;
  /** In display units. */
  value: number;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Typing a number. Absent = the value is stepper-only. */
  onSubmitValue?: (value: number) => void;
  allowDecimal?: boolean;
  size?: 'large' | 'small';
}

/**
 * − value +, where the value can also be typed: nobody should tap "+" 27
 * times to get from an empty bar to 135.
 */
export const NumberStepper: React.FC<Props> = ({
  label,
  value,
  suffix,
  onDecrement,
  onIncrement,
  onSubmitValue,
  allowDecimal = false,
  size = 'large',
}) => {
  const [text, setText] = useState(formatNumber(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(formatNumber(value));
  }, [value, editing]);

  const parse = (t: string) => (allowDecimal ? parseFloat(t.replace(',', '.')) : parseInt(t, 10));

  // Applied on every keystroke, not on blur: tapping "Log set" with the
  // keyboard still up doesn't blur the field, and must log what was typed.
  const onChangeText = (t: string) => {
    setText(t);
    const parsed = parse(t);
    if (Number.isFinite(parsed) && parsed >= 0) onSubmitValue?.(parsed);
  };

  // Leaving the field shows the value actually held — an emptied box snaps back.
  const endEditing = () => {
    setEditing(false);
    setText(formatNumber(value));
  };

  const large = size === 'large';

  return (
    <View style={[styles.wrap, !large && styles.wrapSmall]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, !large && styles.btnSmall]}
          onPress={onDecrement}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={6}
        >
          <Ionicons name="remove" size={large ? 22 : 18} color={WORKOUTS_ACCENT} />
        </TouchableOpacity>
        <View style={styles.valueBox}>
          {onSubmitValue ? (
            <TextInput
              style={[styles.value, !large && styles.valueSmall]}
              value={text}
              onChangeText={onChangeText}
              onFocus={() => setEditing(true)}
              onBlur={endEditing}
              keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
              returnKeyType="done"
              selectTextOnFocus
              accessibilityLabel={label}
            />
          ) : (
            <Text style={[styles.value, !large && styles.valueSmall]}>{formatNumber(value)}</Text>
          )}
          {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.btn, !large && styles.btnSmall]}
          onPress={onIncrement}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={6}
        >
          <Ionicons name="add" size={large ? 22 : 18} color={WORKOUTS_ACCENT} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.lightGray,
  },
  wrapSmall: { flex: 0, paddingVertical: Spacing.sm, backgroundColor: 'transparent' },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.gray,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { width: 32, height: 32, borderRadius: 16 },
  valueBox: { minWidth: 64, alignItems: 'center' },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    minWidth: 64,
    paddingVertical: 0,
  },
  valueSmall: { fontSize: FontSizes.lg, minWidth: 44 },
  suffix: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});

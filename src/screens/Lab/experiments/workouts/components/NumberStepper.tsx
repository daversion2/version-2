import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, TextStyles } from '../../../../../constants/theme';
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
  /**
   * 'tile' (default): label above, on a grey tile. 'row': label on the left,
   * the controls on the right, for a row in a white panel (the set screen).
   */
  layout?: 'tile' | 'row';
  /** Row layout: draw the hairline under it. */
  separator?: boolean;
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
  layout = 'tile',
  separator,
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
  const row = layout === 'row';

  return (
    <View style={[row ? styles.wrapRow : styles.wrap, !row && !large && styles.wrapSmall, row && separator && styles.separator]}>
      <Text style={row ? styles.labelRow : styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, row && styles.btnRow, !large && styles.btnSmall]}
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
              style={[styles.value, row && styles.valueRow, !large && styles.valueSmall]}
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
            <Text style={[styles.value, row && styles.valueRow, !large && styles.valueSmall]}>{formatNumber(value)}</Text>
          )}
          {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.btn, row && styles.btnRow, !large && styles.btnSmall]}
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
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingRight: Spacing.sm,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  label: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray },
  labelRow: { ...TextStyles.body, color: Colors.dark, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: { backgroundColor: Colors.lightGray },
  btnSmall: { width: 32, height: 32, borderRadius: 16 },
  valueBox: { minWidth: 72, alignItems: 'center' },
  value: {
    ...TextStyles.title2,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
    minWidth: 64,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  valueRow: { minWidth: 84 },
  valueSmall: { ...TextStyles.headline, minWidth: 44 },
  suffix: { ...TextStyles.footnote, color: Colors.gray },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  /** "workouts", "sessions" — what is being counted. */
  noun: string;
  value: number;
  accent: string;
  onChange: (next: number) => void;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * An app's weekly goal (services/appCheckins.ts): how many days a week it
 * asks for. Drives the "1 of 3 this week" on Today and the weekly review.
 */
export const WeeklyGoalPicker: React.FC<Props> = ({ noun, value, accent, onChange }) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      {DAYS.map((n) => {
        const on = n === value;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${n} ${noun} a week`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <Text style={styles.caption}>
      {value} {noun} a week
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  chipTextOn: { color: Colors.white },
  caption: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});

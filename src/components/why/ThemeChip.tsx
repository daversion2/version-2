import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface ThemeChipProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export const ThemeChip: React.FC<ThemeChipProps> = ({ text, selected, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Text style={[styles.text, selected && styles.textSelected]}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  text: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  textSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
});

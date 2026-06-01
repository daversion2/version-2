import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface RatingSelectorRowProps {
  max: 5 | 10;
  value: number | null;
  onChange: (value: number) => void;
}

export const RatingSelectorRow: React.FC<RatingSelectorRowProps> = ({ max, value, onChange }) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => {
        const num = i + 1;
        const isActive = value === num;
        return (
          <TouchableOpacity
            key={num}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onChange(num)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{num}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  chipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});

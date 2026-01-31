import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface DifficultySelectorProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  value,
  onChange,
  label = 'Difficulty',
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          style={[styles.circle, value === n && styles.selected]}
          onPress={() => onChange(n)}
        >
          <Text style={[styles.num, value === n && styles.selectedText]}>
            {n}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.sm },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  num: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  selectedText: { color: Colors.white },
});

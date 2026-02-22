import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  value: number;
  onChange: (days: number) => void;
}

const PRESET_DURATIONS = [3, 7, 14, 21, 30];

export const DurationSelector: React.FC<Props> = ({ value, onChange }) => (
  <View style={styles.container}>
    <Text style={styles.label}>How many days?</Text>
    <View style={styles.row}>
      {PRESET_DURATIONS.map((days) => (
        <TouchableOpacity
          key={days}
          style={[styles.chip, value === days && styles.selected]}
          onPress={() => onChange(days)}
        >
          <Text style={[styles.chipText, value === days && styles.selectedText]}>
            {days}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <View style={styles.infoBox}>
      <Text style={styles.infoText}>
        You'll check in each day to mark your progress. Every day completed earns you points!
      </Text>
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
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  selectedText: {
    color: Colors.white,
  },
  infoBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
});

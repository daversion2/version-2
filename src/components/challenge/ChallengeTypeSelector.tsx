import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ChallengeType } from '../../types';

interface Props {
  value: ChallengeType;
  onChange: (type: ChallengeType) => void;
}

export const ChallengeTypeSelector: React.FC<Props> = ({ value, onChange }) => (
  <View style={styles.container}>
    <Text style={styles.label}>Challenge Type</Text>
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.option, value === 'daily' && styles.selected]}
        onPress={() => onChange('daily')}
      >
        <Text style={[styles.optionTitle, value === 'daily' && styles.selectedText]}>
          Daily
        </Text>
        <Text style={[styles.optionSubtitle, value === 'daily' && styles.selectedSubtext]}>
          (1 day)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, value === 'extended' && styles.selected]}
        onPress={() => onChange('extended')}
      >
        <Text style={[styles.optionTitle, value === 'extended' && styles.selectedText]}>
          Extended
        </Text>
        <Text style={[styles.optionSubtitle, value === 'extended' && styles.selectedSubtext]}>
          (Multi-day)
        </Text>
      </TouchableOpacity>
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
    gap: Spacing.md,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  optionSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  selectedText: {
    color: Colors.white,
  },
  selectedSubtext: {
    color: Colors.white,
    opacity: 0.8,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface SingleSelectFieldProps {
  label: string;
  options: string[];
  selectedOption: string | null;
  onChange: (selected: string) => void;
  helperText?: string;
}

export const SingleSelectField: React.FC<SingleSelectFieldProps> = ({
  label,
  options,
  selectedOption,
  onChange,
  helperText,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      <View style={styles.optionsList}>
        {options.map((option) => {
          const selected = selectedOption === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(option)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? Colors.primary : Colors.gray}
              />
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  helperText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  optionsList: {
    gap: Spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
});

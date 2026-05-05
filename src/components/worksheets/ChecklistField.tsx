import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface ChecklistFieldProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  helperText?: string;
}

export const ChecklistField: React.FC<ChecklistFieldProps> = ({
  label,
  options,
  selectedOptions,
  onChange,
  helperText,
}) => {
  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((o) => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      <View style={styles.optionsList}>
        {options.map((option) => {
          const selected = selectedOptions.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => toggleOption(option)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
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

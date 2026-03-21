import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface SuggestedHabit {
  name: string;
  category: string;
  target_count_per_week: number;
}

interface Props {
  habits: SuggestedHabit[];
  selectedIndices: number[];
  onToggle: (index: number) => void;
  programColor: string;
}

export const HabitConversionList: React.FC<Props> = ({
  habits,
  selectedIndices,
  onToggle,
  programColor,
}) => {
  return (
    <View style={styles.container}>
      {habits.map((habit, index) => {
        const isSelected = selectedIndices.includes(index);
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.habitRow,
              isSelected && { backgroundColor: programColor + '08', borderColor: programColor },
            ]}
            onPress={() => onToggle(index)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              isSelected && { backgroundColor: programColor, borderColor: programColor },
            ]}>
              {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.habitMeta}>
                {habit.target_count_per_week}x per week · {habit.category}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfo: {
    flex: 1,
    gap: 2,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

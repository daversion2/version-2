import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ReflectionGrade } from '../../types';

const GRADES: { grade: ReflectionGrade; label: string; color: string }[] = [
  { grade: 'A', label: 'Crushed it', color: '#2E7D32' },
  { grade: 'B', label: 'Solid day', color: '#558B2F' },
  { grade: 'C', label: 'Average', color: '#F9A825' },
  { grade: 'D', label: 'Below avg', color: '#EF6C00' },
  { grade: 'F', label: 'Rough day', color: '#C62828' },
];

interface GradeSelectorProps {
  value: ReflectionGrade | null;
  onChange: (grade: ReflectionGrade) => void;
}

export const GradeSelector: React.FC<GradeSelectorProps> = ({ value, onChange }) => (
  <View style={styles.container}>
    <Text style={styles.label}>How did you do today? *</Text>
    <View style={styles.row}>
      {GRADES.map(({ grade, label, color }) => {
        const isSelected = value === grade;
        return (
          <TouchableOpacity
            key={grade}
            style={[
              styles.gradeButton,
              { borderColor: color },
              isSelected && { backgroundColor: color },
            ]}
            onPress={() => onChange(grade)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.gradeLetter,
                { color: isSelected ? Colors.white : color },
              ]}
            >
              {grade}
            </Text>
            <Text
              style={[
                styles.gradeLabel,
                { color: isSelected ? Colors.white : Colors.gray },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export const GRADE_COLORS: Record<ReflectionGrade, string> = {
  A: '#2E7D32',
  B: '#558B2F',
  C: '#F9A825',
  D: '#EF6C00',
  F: '#C62828',
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gradeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  gradeLetter: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
  },
  gradeLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    marginTop: 2,
  },
});

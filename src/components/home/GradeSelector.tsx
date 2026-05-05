import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ReflectionGrade } from '../../types';

const ALIGNMENT_OPTIONS: { grade: ReflectionGrade; label: string; icon: string; color: string }[] = [
  { grade: 'A', label: 'Fully\naligned', icon: 'compass', color: '#2E7D32' },
  { grade: 'B', label: 'Mostly\naligned', icon: 'compass-outline', color: '#558B2F' },
  { grade: 'C', label: 'Mixed\nday', icon: 'swap-horizontal', color: '#F9A825' },
  { grade: 'D', label: 'Drifted', icon: 'trending-down', color: '#EF6C00' },
  { grade: 'F', label: 'Off\ntrack', icon: 'close-circle-outline', color: '#C62828' },
];

interface GradeSelectorProps {
  value: ReflectionGrade | null;
  onChange: (grade: ReflectionGrade) => void;
}

export const GradeSelector: React.FC<GradeSelectorProps> = ({ value, onChange }) => (
  <View style={styles.container}>
    <Text style={styles.label}>How aligned were you with your purpose today? *</Text>
    <View style={styles.row}>
      {ALIGNMENT_OPTIONS.map(({ grade, label, icon, color }) => {
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
            <Ionicons
              name={icon as any}
              size={22}
              color={isSelected ? Colors.white : color}
            />
            <Text
              style={[
                styles.gradeLabel,
                { color: isSelected ? Colors.white : Colors.gray },
              ]}
              numberOfLines={2}
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

export const GRADE_LABELS: Record<ReflectionGrade, string> = {
  A: 'Fully aligned',
  B: 'Mostly aligned',
  C: 'Mixed day',
  D: 'Drifted',
  F: 'Off track',
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
  gradeLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
});

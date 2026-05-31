import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface GoalSummarySectionProps {
  icon: string;
  label: string;
  value: string;
  onEdit: () => void;
}

export const GoalSummarySection: React.FC<GoalSummarySectionProps> = ({
  icon,
  label,
  value,
  onEdit,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onEdit} activeOpacity={0.6}>
      <Ionicons name={icon as any} size={20} color={Colors.primary} />
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginTop: 2,
  },
});

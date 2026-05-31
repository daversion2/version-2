import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface MeasurementTypeCardProps {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export const MeasurementTypeCard: React.FC<MeasurementTypeCardProps> = ({
  icon,
  label,
  description,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={24}
        color={selected ? Colors.primary : Colors.gray}
      />
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <Text style={[styles.description, selected && styles.descriptionSelected]}>{description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.primary,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  descriptionSelected: {
    color: Colors.primary,
  },
});

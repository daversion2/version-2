import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ArenaId } from '../../types';
import { ARENAS } from '../../constants/arenas';

interface ArenaPickerProps {
  selectedArenaId?: ArenaId | null;
  onChange: (id: ArenaId | null) => void;
  required?: boolean;
  label?: string;
}

/**
 * Single-select picker for the override-training arena. Each rep trains exactly
 * one arena, so this is single-select (unlike the multi-select GoalTagPicker).
 * "required" is enforced only in the UI — the underlying field stays optional.
 */
export const ArenaPicker: React.FC<ArenaPickerProps> = ({
  selectedArenaId,
  onChange,
  required = false,
  label,
}) => {
  const heading = label ?? (required ? 'Which override are you training?' : 'Arena');

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{heading}</Text>
        {required && <Text style={styles.requiredIndicator}>Required</Text>}
      </View>
      <View style={styles.chipRow}>
        {ARENAS.map((arena) => {
          const selected = selectedArenaId === arena.id;
          return (
            <TouchableOpacity
              key={arena.id}
              style={[
                styles.chip,
                { borderColor: arena.color },
                selected && { backgroundColor: arena.color },
              ]}
              onPress={() => onChange(selected ? null : arena.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={arena.icon as any}
                size={14}
                color={selected ? Colors.white : arena.color}
              />
              <Text style={[styles.chipText, { color: selected ? Colors.white : arena.color }]}>
                {arena.name}
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
    marginTop: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  requiredIndicator: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
  },
});

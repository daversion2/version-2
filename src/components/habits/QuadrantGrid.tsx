import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Quadrant } from '../../types';

const QUADRANTS: { key: Quadrant; label: string; synonyms: string }[] = [
  { key: 'stressed', label: 'Stressed', synonyms: 'Anxious · Frustrated' },
  { key: 'energized', label: 'Energized', synonyms: 'Focused · Motivated' },
  { key: 'depleted', label: 'Depleted', synonyms: 'Empty · Low' },
  { key: 'calm', label: 'Calm', synonyms: 'Content · Peaceful' },
];

interface Props {
  prompt: string;
  selected: Quadrant | null;
  onSelect: (q: Quadrant) => void;
}

export const QuadrantGrid: React.FC<Props> = ({ prompt, selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={styles.grid}>
        {QUADRANTS.map((q) => {
          const isSelected = selected === q.key;
          return (
            <TouchableOpacity
              key={q.key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onSelect(q.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.label, isSelected && styles.textSelected]}>
                {q.label}
              </Text>
              <Text style={[styles.synonyms, isSelected && styles.textSelected]}>
                {q.synonyms}
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
  prompt: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  synonyms: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  textSelected: {
    color: Colors.white,
  },
});

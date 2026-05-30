import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';

export const MantraSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  if (!data.activeMantra) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => callbacks.onNavigate('MantraScreen')}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>YOUR REDIRECT MANTRA</Text>
      <Text style={styles.mantraText}>"{data.activeMantra}"</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  mantraText: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    fontStyle: 'italic',
  },
});

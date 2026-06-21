import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface OverrideScoreCardProps {
  score: number;
}

/**
 * The headline proof metric: how many times the user overrode the stop signal
 * this week across all arenas. Always weekly (independent of the time filter).
 */
export const OverrideScoreCard: React.FC<OverrideScoreCardProps> = ({ score }) => (
  <View style={styles.card}>
    <View style={styles.iconWrap}>
      <Ionicons name="flash" size={22} color={Colors.white} />
    </View>
    <View style={styles.textWrap}>
      <Text style={styles.label}>Override Score</Text>
      <Text style={styles.sub}>Overrides across arenas this week</Text>
    </View>
    <Text style={styles.value}>{score}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.white,
  },
});

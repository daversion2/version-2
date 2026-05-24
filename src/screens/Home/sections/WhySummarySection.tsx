import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';

export const WhySummarySection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  // Hidden for now
  return null;
  const { whyStatement, hasCompletedWhyDiscovery } = data;

  if (hasCompletedWhyDiscovery && whyStatement) {
    // Completed state: show the Why statement, tappable to open WhyScreen
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => callbacks.onNavigate('WhyScreen')}
        activeOpacity={0.7}
      >
        <View style={styles.headerRow}>
          <Ionicons name="compass" size={20} color={Colors.primary} />
          <Text style={styles.headerLabel}>Your Why</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray} style={{ marginLeft: 'auto' }} />
        </View>
        <Text style={styles.whyStatement}>"{whyStatement}"</Text>
      </TouchableOpacity>
    );
  }

  // Not completed state: show CTA to start/resume discovery
  return (
    <TouchableOpacity
      style={styles.ctaCard}
      onPress={() => callbacks.onNavigate('WhyDiscoveryFlow')}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Ionicons name="compass-outline" size={20} color={Colors.primary} />
        <Text style={styles.headerLabel}>Discover Your Why</Text>
      </View>
      <Text style={styles.ctaBody}>
        Your Why is the foundation that makes everything else stick. Goals are more powerful when connected to your core purpose.
      </Text>
      <View style={styles.ctaButtonRow}>
        <Text style={styles.ctaButtonText}>Start Discovery</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
  },
  ctaCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '25',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  whyStatement: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  ctaBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  ctaButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});

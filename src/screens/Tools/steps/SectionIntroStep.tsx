import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { WorksheetSection } from '../../../types';

interface SectionIntroStepProps {
  section: WorksheetSection;
  sectionIndex: number;
  totalSections: number;
  color: string;
}

export const SectionIntroStep: React.FC<SectionIntroStepProps> = ({
  section,
  sectionIndex,
  totalSections,
  color,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        Part {sectionIndex + 1} of {totalSections}
      </Text>

      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={color} />
          <Text style={styles.cardTitle}>{section.title}</Text>
        </View>
        {section.description && (
          <Text style={styles.cardDescription}>{section.description}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  cardDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },
});

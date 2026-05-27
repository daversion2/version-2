import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { WorksheetTemplate } from '../../../types';

interface IntroStepProps {
  template: WorksheetTemplate;
}

export const IntroStep: React.FC<IntroStepProps> = ({ template }) => {
  const [tipsExpanded, setTipsExpanded] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.iconContainer, { backgroundColor: template.color + '18' }]}>
        <Ionicons
          name={template.icon as any}
          size={36}
          color={template.color}
        />
      </View>

      <Text style={styles.title}>{template.name}</Text>
      <Text style={styles.description}>{template.long_description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>~{template.estimated_minutes} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="flash-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>+2 willpower points</Text>
        </View>
      </View>

      <View style={styles.whenToUseCard}>
        <Text style={styles.whenToUseLabel}>Best used when</Text>
        <Text style={styles.whenToUseText}>{template.when_to_use}</Text>
      </View>

      {template.tips && template.tips.length > 0 && (
        <View style={styles.tipsContainer}>
          <TouchableOpacity
            style={styles.tipsToggle}
            onPress={() => setTipsExpanded(!tipsExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
            <Text style={styles.tipsToggleText}>Tips before you start</Text>
            <Ionicons
              name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {tipsExpanded && (
            <View style={styles.tipsList}>
              {template.tips.map((tip, i) => (
                <Text key={i} style={styles.tipText}>
                  {'\u2022'} {tip}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  whenToUseCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  whenToUseLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  whenToUseText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  tipsContainer: {
    marginTop: Spacing.sm,
  },
  tipsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tipsToggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  tipsList: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
});

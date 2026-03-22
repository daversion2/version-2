import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { DailySummaryCard } from '../../components/home/DailySummaryCard';
import { DailyReflection } from '../../types';
import { GRADE_COLORS } from '../../components/home/GradeSelector';

type Props = NativeStackScreenProps<any, 'ReflectionEntry'>;

export const ReflectionEntryScreen: React.FC<Props> = ({ route }) => {
  const reflection = route.params?.reflection as DailyReflection;

  if (!reflection) {
    return (
      <View style={styles.screen}>
        <Text style={styles.emptyText}>Reflection not found</Text>
      </View>
    );
  }

  const dateDisplay = new Date(reflection.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Date & Grade */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateDisplay}</Text>
        <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[reflection.grade] }]}>
          <Text style={styles.gradeText}>{reflection.grade}</Text>
        </View>
      </View>

      {/* Daily Summary */}
      {reflection.daily_summary && (
        <DailySummaryCard summary={reflection.daily_summary} />
      )}

      {/* Prompts */}
      {reflection.prompt_went_well && (
        <Card style={styles.promptCard}>
          <Text style={styles.promptLabel}>What went well</Text>
          <Text style={styles.promptText}>{reflection.prompt_went_well}</Text>
        </Card>
      )}

      {reflection.prompt_hardest && (
        <Card style={styles.promptCard}>
          <Text style={styles.promptLabel}>What was hardest</Text>
          <Text style={styles.promptText}>{reflection.prompt_hardest}</Text>
        </Card>
      )}

      {reflection.prompt_tomorrow && (
        <Card style={styles.promptCard}>
          <Text style={styles.promptLabel}>Plan for tomorrow</Text>
          <Text style={styles.promptText}>{reflection.prompt_tomorrow}</Text>
        </Card>
      )}

      {!reflection.prompt_went_well && !reflection.prompt_hardest && !reflection.prompt_tomorrow && (
        <Card>
          <Text style={styles.noPromptsText}>No written reflections for this day.</Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  gradeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  promptCard: {
    marginBottom: Spacing.md,
  },
  promptLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  promptText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
  noPromptsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});

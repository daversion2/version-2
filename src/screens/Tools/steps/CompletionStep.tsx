import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';

interface CompletionStepProps {
  templateName: string;
  pointsAwarded: number;
  moodBefore?: number;
  moodAfter?: number;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  templateName,
  pointsAwarded,
  moodBefore,
  moodAfter,
}) => {
  const moodDelta =
    moodBefore !== undefined && moodAfter !== undefined
      ? moodAfter - moodBefore
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={72} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Nice work.</Text>
      <Text style={styles.subtitle}>
        You just completed <Text style={styles.bold}>{templateName}</Text>.
        That takes real effort — and it compounds.
      </Text>

      {pointsAwarded > 0 && (
        <View style={styles.pointsBadge}>
          <Ionicons name="flash" size={14} color={Colors.secondary} />
          <Text style={styles.pointsText}>+{pointsAwarded} willpower points</Text>
        </View>
      )}

      {moodDelta !== null && moodDelta !== 0 && (
        <View style={styles.moodDeltaRow}>
          <Ionicons
            name={moodDelta > 0 ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={moodDelta > 0 ? '#2E7D32' : '#D32F2F'}
          />
          <Text
            style={[
              styles.moodDeltaText,
              { color: moodDelta > 0 ? '#2E7D32' : '#D32F2F' },
            ]}
          >
            Mood {moodDelta > 0 ? '+' : ''}{moodDelta} ({moodBefore} → {moodAfter})
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  bold: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.dark,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary + '15',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    marginBottom: Spacing.lg,
  },
  pointsText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  moodDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moodDeltaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { ReflectionGrade } from '../../types';
import { GRADE_COLORS } from './GradeSelector';

interface NightlyReflectionBannerProps {
  hasReflected: boolean;
  todaysGrade?: ReflectionGrade;
  onPress: () => void;
}

export const NightlyReflectionBanner: React.FC<NightlyReflectionBannerProps> = ({
  hasReflected,
  todaysGrade,
  onPress,
}) => {
  const isEvening = new Date().getHours() >= 20;

  // Already reflected — show compact "complete" badge
  if (hasReflected && todaysGrade) {
    return (
      <Card style={styles.completedCard} onPress={onPress}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
          <Text style={styles.completedText}>Reflection complete</Text>
          <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[todaysGrade] }]}>
            <Text style={styles.gradeText}>{todaysGrade}</Text>
          </View>
        </View>
      </Card>
    );
  }

  // After 8pm — prominent dark banner
  if (isEvening) {
    return (
      <Card style={styles.prominentCard} onPress={onPress}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="moon-outline" size={24} color={Colors.white} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.prominentTitle}>How did your day go?</Text>
            <Text style={styles.prominentSubtitle}>Take a moment to reflect</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.white + '80'} />
        </View>
      </Card>
    );
  }

  // Before 8pm — subtle card so there's always an entry point
  return (
    <Card style={styles.subtleCard} onPress={onPress}>
      <View style={styles.row}>
        <Ionicons name="journal-outline" size={20} color={Colors.primary} />
        <Text style={styles.subtleText}>Daily Reflection</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  prominentCard: {
    backgroundColor: '#1A3A40',
    marginBottom: Spacing.md,
  },
  subtleCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  completedCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  prominentTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  prominentSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white + 'AA',
    marginTop: 2,
  },
  subtleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  completedText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  gradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
});

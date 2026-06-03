import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';

interface PeriodBreakdownCardProps {
  habits: number;
  challenges: number;
}

export const PeriodBreakdownCard: React.FC<PeriodBreakdownCardProps> = ({
  habits,
  challenges,
}) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Completed</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
          <Text style={styles.value}>{habits}</Text>
          <Text style={styles.label}>Habits</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Ionicons name="flash" size={20} color={Colors.secondary} />
          <Text style={styles.value}>{challenges}</Text>
          <Text style={styles.label}>Challenges</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
});

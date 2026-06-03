import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface WeekOverWeekCardProps {
  thisWeek: number;
  lastWeek: number;
}

export const WeekOverWeekCard: React.FC<WeekOverWeekCardProps> = ({ thisWeek, lastWeek }) => {
  // Only render if this week is equal to or better than last week
  if (thisWeek < lastWeek) return null;

  const delta = thisWeek - lastWeek;
  const message = delta === 0
    ? 'Matching last week\'s pace'
    : `+${delta} more than last week`;

  return (
    <View style={styles.container}>
      <Ionicons name="trending-up" size={18} color="#34C759" />
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.count}>{thisWeek} this week</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F0FFF4',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  text: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#34C759',
    flex: 1,
  },
  count: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface Props {
  durationDays: number;
}

export const MilestonePreview: React.FC<Props> = ({ durationDays }) => {
  // Show max 10 circles, then indicate more with "..."
  const visibleDays = Math.min(durationDays, 10);
  const hasMore = durationDays > 10;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Preview:</Text>
      <View style={styles.row}>
        {Array.from({ length: visibleDays }, (_, i) => (
          <View key={i} style={styles.circle}>
            <Text style={styles.dayNumber}>{i + 1}</Text>
          </View>
        ))}
        {hasMore && (
          <Text style={styles.more}>+{durationDays - 10}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.sm },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  more: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
});

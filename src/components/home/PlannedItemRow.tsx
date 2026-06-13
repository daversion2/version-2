import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PlannedItem } from '../../types';
import { formatHabitPlanLine } from '../../utils/habitPlan';

interface PlannedItemRowProps {
  item: PlannedItem;
  onCalendarExport?: (item: PlannedItem) => void;
  onPress?: (item: PlannedItem) => void;
}

export const PlannedItemRow: React.FC<PlannedItemRowProps> = ({
  item,
  onCalendarExport,
  onPress,
}) => {
  const isCompleted = item.status === 'completed';
  const isExpired = item.status === 'expired';
  const isDimmed = isCompleted || isExpired;

  // Surface the habit's anchor + pairing as a pre-action cue while it's still pending.
  const planLine =
    !isDimmed && item.type === 'habit'
      ? formatHabitPlanLine(item.sourceData?.habit?.action_plan)
      : '';

  return (
    <TouchableOpacity
      style={[styles.container, isDimmed && styles.containerDimmed]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      {/* Status icon */}
      <Ionicons
        name={
          isCompleted
            ? 'checkmark-circle'
            : isExpired
            ? 'close-circle-outline'
            : (item.icon as any)
        }
        size={22}
        color={
          isCompleted
            ? '#2E7D32'
            : isExpired
            ? Colors.gray
            : item.iconColor
        }
      />

      {/* Content */}
      <View style={styles.body}>
        <Text
          style={[styles.title, isDimmed && styles.titleDimmed]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          {item.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}

        </View>

        {!!planLine && (
          <Text style={styles.planLine} numberOfLines={1}>
            {planLine}
          </Text>
        )}
      </View>

      {/* Calendar export button */}
      {!isCompleted && onCalendarExport && (
        <TouchableOpacity
          onPress={() => onCalendarExport(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.calendarButton}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={Colors.gray}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  containerDimmed: {
    opacity: 0.55,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  titleDimmed: {
    textDecorationLine: 'line-through',
    color: Colors.gray,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  planLine: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  calendarButton: {
    padding: Spacing.xs,
    marginTop: 2,
  },
});

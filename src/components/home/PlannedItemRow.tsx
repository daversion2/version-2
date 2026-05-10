import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PlannedItem } from '../../types';

interface PlannedItemRowProps {
  item: PlannedItem;
  onCalendarExport?: (item: PlannedItem) => void;
  onPress?: (item: PlannedItem) => void;
}

const formatTime = (deadline: string): string => {
  const [h, m] = deadline.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const PlannedItemRow: React.FC<PlannedItemRowProps> = ({
  item,
  onCalendarExport,
  onPress,
}) => {
  const isCompleted = item.status === 'completed';
  const isExpired = item.status === 'expired';
  const isDimmed = isCompleted || isExpired;

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

          {item.deadline && item.type === 'micro_goal' && (
            <View
              style={[
                styles.deadlinePill,
                {
                  backgroundColor: (isCompleted || isExpired
                    ? Colors.gray
                    : Colors.primary) + '15',
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={11}
                color={isCompleted || isExpired ? Colors.gray : Colors.primary}
              />
              <Text
                style={[
                  styles.deadlineText,
                  {
                    color: isCompleted || isExpired ? Colors.gray : Colors.primary,
                  },
                ]}
              >
                {formatTime(item.deadline)}
              </Text>
            </View>
          )}
        </View>
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
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  deadlineText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  calendarButton: {
    padding: Spacing.xs,
    marginTop: 2,
  },
});

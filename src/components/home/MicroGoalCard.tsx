import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MicroGoal } from '../../types';

interface MicroGoalCardProps {
  microGoal: MicroGoal;
  isExpired: boolean;
  onComplete: (microGoalId: string) => void;
  onDelete: (microGoalId: string) => void;
}

const formatTime = (deadline: string): string => {
  const [h, m] = deadline.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const getDeadlineColor = (deadline: string, isExpired: boolean): string => {
  if (isExpired) return Colors.gray;
  const now = new Date();
  const [h, m] = deadline.split(':').map(Number);
  const deadlineDate = new Date();
  deadlineDate.setHours(h, m, 0, 0);
  const minutesLeft = (deadlineDate.getTime() - now.getTime()) / 60000;
  if (minutesLeft <= 30) return Colors.secondary;
  return Colors.primary;
};

export const MicroGoalCard: React.FC<MicroGoalCardProps> = ({
  microGoal,
  isExpired: expired,
  onComplete,
  onDelete,
}) => {
  const isCompleted = microGoal.status === 'completed';
  const isActive = !isCompleted && !expired;

  const handlePress = () => {
    if (isActive || expired) {
      onComplete(microGoal.id);
    }
  };

  const handleLongPress = () => {
    if (!isCompleted) {
      Alert.alert(
        'Delete Sprint',
        `Remove "${microGoal.description}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(microGoal.id) },
        ]
      );
    }
  };

  const deadlineColor = isCompleted ? Colors.gray : getDeadlineColor(microGoal.deadline, expired);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={isCompleted ? 1 : 0.6}
      disabled={isCompleted}
    >
      <Ionicons
        name={
          isCompleted
            ? 'checkmark-circle'
            : expired
            ? 'close-circle-outline'
            : 'radio-button-off'
        }
        size={24}
        color={isCompleted ? '#2E7D32' : expired ? Colors.gray : Colors.primary}
      />

      <View style={styles.body}>
        <Text
          style={[
            styles.description,
            (isCompleted || expired) && styles.descriptionDone,
          ]}
          numberOfLines={2}
        >
          {microGoal.description}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.deadlinePill, { backgroundColor: deadlineColor + '15' }]}>
            <Ionicons name="time-outline" size={12} color={deadlineColor} />
            <Text style={[styles.deadlineText, { color: deadlineColor }]}>
              by {formatTime(microGoal.deadline)}
            </Text>
          </View>

          {expired && !isCompleted && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}

        </View>
      </View>
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
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  description: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  descriptionDone: {
    textDecorationLine: 'line-through',
    color: Colors.gray,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
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
  expiredBadge: {
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  expiredText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ChallengeMilestone } from '../../types';
import { Card } from '../common/Card';

interface Props {
  milestones: ChallengeMilestone[];
  currentDayNumber: number;
  onCheckIn: (dayNumber: number) => void;
  startDate: string;
}

export const DailyCheckInList: React.FC<Props> = ({
  milestones,
  currentDayNumber,
  onCheckIn,
  startDate,
}) => {
  const getDateForDay = (dayNumber: number): string => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Check-ins</Text>
      {milestones.map((milestone) => {
        const isPast = milestone.day_number < currentDayNumber;
        const isCurrent = milestone.day_number === currentDayNumber;
        const isFuture = milestone.day_number > currentDayNumber;
        const canCheckIn = (isCurrent || isPast) && !milestone.completed;

        return (
          <Card key={milestone.id} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <View style={styles.statusIcon}>
                {milestone.completed ? (
                  <Ionicons
                    name={milestone.succeeded ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={milestone.succeeded ? Colors.success : Colors.fail}
                  />
                ) : (
                  <View
                    style={[
                      styles.emptyCircle,
                      isCurrent && styles.currentCircle,
                    ]}
                  />
                )}
              </View>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayLabel, isCurrent && styles.currentText]}>
                  Day {milestone.day_number}
                </Text>
                {milestone.completed && milestone.completed_at && (
                  <Text style={styles.dateText}>
                    {new Date(milestone.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
                {!milestone.completed && !isFuture && (
                  <Text style={styles.dateText}>{getDateForDay(milestone.day_number)}</Text>
                )}
              </View>
              {milestone.completed && milestone.points_awarded != null && (
                <Text style={styles.pointsBadge}>
                  +{milestone.points_awarded}
                </Text>
              )}
              {canCheckIn && (
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={() => onCheckIn(milestone.day_number)}
                >
                  <Text style={styles.checkInText}>Check In</Text>
                </TouchableOpacity>
              )}
            </View>
            {milestone.note && (
              <Text style={styles.noteText}>{milestone.note}</Text>
            )}
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.md },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  dayCard: {
    marginBottom: Spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 32,
    alignItems: 'center',
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  currentCircle: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  dayInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dayLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  currentText: {
    color: Colors.primary,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  checkInButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkInText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  pointsBadge: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  noteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});

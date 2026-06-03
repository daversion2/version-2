import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';

interface PersonalRecordsCardProps {
  bestStreak: number;
  bestWeek: number;
}

export const PersonalRecordsCard: React.FC<PersonalRecordsCardProps> = ({
  bestStreak,
  bestWeek,
}) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Personal Records</Text>
      <View style={styles.records}>
        <View style={styles.record}>
          <Ionicons name="flame" size={22} color={Colors.secondary} />
          <View style={styles.recordText}>
            <Text style={styles.recordValue}>{bestStreak} days</Text>
            <Text style={styles.recordLabel}>Longest Streak</Text>
          </View>
        </View>
        <View style={styles.record}>
          <Ionicons name="trophy" size={22} color={Colors.secondary} />
          <View style={styles.recordText}>
            <Text style={styles.recordValue}>{bestWeek} actions</Text>
            <Text style={styles.recordLabel}>Best Week</Text>
          </View>
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
  records: {
    gap: Spacing.md,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordText: {
    flex: 1,
  },
  recordValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  recordLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

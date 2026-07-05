import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { PersonalRecord } from '../../services/practiceProgress';

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
}

/**
 * All-time, metric-backed records (longest sit, coldest plunge, longest fast)
 * plus best streak / best week. Rows without data simply don't appear.
 */
export const PersonalRecordsCard: React.FC<PersonalRecordsCardProps> = ({ records }) => {
  if (records.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Personal Records</Text>
      {records.map((record, i) => (
        <View
          key={record.label}
          style={[styles.row, i < records.length - 1 && styles.rowBorder]}
        >
          <Ionicons
            name={record.icon as any}
            size={18}
            color={Colors.secondary}
            style={styles.icon}
          />
          <Text style={styles.label}>{record.label}</Text>
          <Text style={styles.value}>{record.value}</Text>
        </View>
      ))}
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
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 4,
    paddingVertical: Spacing.sm + 2,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
});

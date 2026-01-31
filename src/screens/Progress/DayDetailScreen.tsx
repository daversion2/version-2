import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import {
  getCompletionLogsWithNames,
  EnrichedCompletionLog,
  getTotalPoints,
} from '../../services/progress';

type Props = NativeStackScreenProps<any, 'DayDetail'>;

export const DayDetailScreen: React.FC<Props> = ({ route }) => {
  const { date } = route.params as { date: string };
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [logs, setLogs] = useState<EnrichedCompletionLog[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const [enriched, pts] = await Promise.all([
          getCompletionLogsWithNames(user.uid, date),
          getTotalPoints(user.uid, date),
        ]);
        setLogs(enriched);
        // Calculate day-specific points from the enriched logs
        const dayPts = enriched.reduce((sum, l) => sum + l.points, 0);
        setTotalPoints(dayPts);
      })();
    }, [user, date])
  );

  const renderItem = ({ item }: { item: EnrichedCompletionLog }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.type === 'challenge') {
          navigation.navigate('ChallengeDetail', { challengeId: item.reference_id });
        }
      }}
      disabled={item.type !== 'challenge'}
    >
      <Card style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.logName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.logPoints}>{item.points} pts</Text>
        </View>
        <View style={styles.logMeta}>
          <Text style={styles.metaText}>
            {item.type === 'challenge' ? 'Challenge' : 'Habit'}
          </Text>
          {item.completed_at && (
            <Text style={styles.metaText}>
              {new Date(item.completed_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={logs}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <Card style={styles.summaryCard}>
          <Text style={styles.dateText}>{date}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalPoints}</Text>
              <Text style={styles.summaryLabel}>Points</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.length}</Text>
              <Text style={styles.summaryLabel}>Actions</Text>
            </View>
          </View>
        </Card>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No activity this day.</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  summaryCard: { marginBottom: Spacing.lg, alignItems: 'center' },
  dateText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.xl },
  summaryItem: { alignItems: 'center' },
  summaryValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  summaryLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  logCard: { marginBottom: Spacing.sm },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  logName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  logPoints: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  logMeta: { flexDirection: 'row', gap: Spacing.md },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

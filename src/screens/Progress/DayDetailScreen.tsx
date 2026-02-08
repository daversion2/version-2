import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackdateHabitModal } from '../../components/habits/BackdateHabitModal';
import { EditDifficultyModal } from '../../components/challenge/EditDifficultyModal';
import { useAuth } from '../../context/AuthContext';
import {
  getCompletionLogsWithNames,
  EnrichedCompletionLog,
  getTotalPoints,
  deleteCompletionLog,
} from '../../services/progress';
import { updateChallengeCompletion, getChallengeById } from '../../services/challenges';
import { getUnloggedHabitsForDate, logHabitCompletion } from '../../services/habits';
import { updateWillpowerStats } from '../../services/willpower';
import { isYesterday } from '../../utils/date';
import { showConfirm, showAlert } from '../../utils/alert';
import { Nudge, HabitDifficulty } from '../../types';

type Props = NativeStackScreenProps<any, 'DayDetail'>;

export const DayDetailScreen: React.FC<Props> = ({ route }) => {
  const { date } = route.params as { date: string };
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [logs, setLogs] = useState<EnrichedCompletionLog[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  // Modal states
  const [backdateModalVisible, setBackdateModalVisible] = useState(false);
  const [unloggedHabits, setUnloggedHabits] = useState<Nudge[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);

  const [editDifficultyModalVisible, setEditDifficultyModalVisible] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<{
    id: string;
    name: string;
    currentDifficulty: number;
    logId: string;
  } | null>(null);

  // Check if this date is editable (yesterday only)
  const isEditable = isYesterday(date);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const [enriched] = await Promise.all([
      getCompletionLogsWithNames(user.uid, date),
      getTotalPoints(user.uid, date),
    ]);
    setLogs(enriched);
    const dayPts = enriched.reduce((sum, l) => sum + l.points, 0);
    setTotalPoints(dayPts);
  }, [user, date]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Handle opening backdate habit modal
  const handleOpenBackdateModal = async () => {
    if (!user) return;
    setLoadingHabits(true);
    setBackdateModalVisible(true);
    try {
      const habits = await getUnloggedHabitsForDate(user.uid, date);
      setUnloggedHabits(habits);
    } catch (error) {
      showAlert('Error', 'Failed to load habits. Please try again.');
    } finally {
      setLoadingHabits(false);
    }
  };

  // Handle adding a backdated habit
  const handleAddBackdatedHabit = async (
    habitId: string,
    habitName: string,
    difficulty: HabitDifficulty
  ) => {
    if (!user) return;
    try {
      // Log the habit completion with the backdated date
      await logHabitCompletion(user.uid, habitId, difficulty, date);
      // Update willpower stats
      const points = difficulty === 'easy' ? 1 : 2;
      await updateWillpowerStats(user.uid, points);

      setBackdateModalVisible(false);
      showAlert('Success', `Added "${habitName}" (+${points} pts)`);
      refreshData();
    } catch (error) {
      showAlert('Error', 'Failed to add habit. Please try again.');
    }
  };

  // Handle deleting a habit log
  const handleDeleteHabitLog = (log: EnrichedCompletionLog) => {
    if (!user) return;

    showConfirm(
      'Delete Habit Entry',
      `Delete "${log.name}"? This will remove ${log.points} points from your Willpower Bank.`,
      async () => {
        try {
          await deleteCompletionLog(user.uid, log.id);
          showAlert('Deleted', `Removed ${log.points} points from your Willpower Bank.`);
          refreshData();
        } catch (error) {
          showAlert('Error', 'Failed to delete. Please try again.');
        }
      },
      'Delete'
    );
  };

  // Handle opening edit difficulty modal for a challenge
  const handleOpenEditDifficulty = async (log: EnrichedCompletionLog) => {
    if (!user) return;
    try {
      const challenge = await getChallengeById(user.uid, log.reference_id);
      if (challenge) {
        setEditingChallenge({
          id: challenge.id,
          name: challenge.name,
          currentDifficulty: challenge.difficulty_actual || log.difficulty,
          logId: log.id,
        });
        setEditDifficultyModalVisible(true);
      }
    } catch (error) {
      showAlert('Error', 'Failed to load challenge. Please try again.');
    }
  };

  // Handle updating challenge difficulty
  const handleUpdateDifficulty = async (newDifficulty: number) => {
    if (!user || !editingChallenge) return;
    try {
      const result = await updateChallengeCompletion(
        user.uid,
        editingChallenge.id,
        newDifficulty
      );

      const deltaText =
        result.pointsDelta > 0
          ? `+${result.pointsDelta}`
          : result.pointsDelta.toString();

      setEditDifficultyModalVisible(false);
      setEditingChallenge(null);
      showAlert('Updated', `Difficulty changed. Points: ${deltaText}`);
      refreshData();
    } catch (error) {
      showAlert('Error', 'Failed to update. Please try again.');
    }
  };

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

        {/* Edit/Delete buttons for yesterday only */}
        {isEditable && (
          <View style={styles.editActions}>
            {item.type === 'challenge' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenEditDifficulty(item)}
              >
                <Text style={styles.editButtonText}>Edit Difficulty</Text>
              </TouchableOpacity>
            )}
            {item.type === 'nudge' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteHabitLog(item)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const ListHeader = (
    <>
      <Card style={styles.summaryCard}>
        <Text style={styles.dateText}>{date}</Text>
        {isEditable && (
          <Text style={styles.editableLabel}>Yesterday - Editable</Text>
        )}
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

      {/* Add Habit button for yesterday */}
      {isEditable && (
        <Button
          title="Add Forgotten Habit"
          onPress={handleOpenBackdateModal}
          variant="outline"
          style={styles.addHabitButton}
        />
      )}
    </>
  );

  return (
    <>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.content}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No activity this day.</Text>
        }
      />

      {/* Backdate Habit Modal */}
      <BackdateHabitModal
        visible={backdateModalVisible}
        date={date}
        habits={unloggedHabits}
        loading={loadingHabits}
        onSubmit={handleAddBackdatedHabit}
        onCancel={() => setBackdateModalVisible(false)}
      />

      {/* Edit Difficulty Modal */}
      {editingChallenge && (
        <EditDifficultyModal
          visible={editDifficultyModalVisible}
          challengeName={editingChallenge.name}
          currentDifficulty={editingChallenge.currentDifficulty}
          onSubmit={handleUpdateDifficulty}
          onCancel={() => {
            setEditDifficultyModalVisible(false);
            setEditingChallenge(null);
          }}
        />
      )}
    </>
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
    marginBottom: Spacing.xs,
  },
  editableLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.success,
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
  addHabitButton: {
    marginBottom: Spacing.lg,
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
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  deleteButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.fail,
  },
  deleteButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.fail,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

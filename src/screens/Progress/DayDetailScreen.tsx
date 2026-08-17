import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PracticePickerModal } from '../../components/habits/PracticePickerModal';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';
import { EditDifficultyModal } from '../../components/challenge/EditDifficultyModal';
import { useAuth } from '../../context/AuthContext';
import {
  getCompletionLogsWithNames,
  EnrichedCompletionLog,
  deleteCompletionLog,
} from '../../services/progress';
import { updateChallengeCompletion, getChallengeById } from '../../services/challenges';
import { getHabitsForDate, completePractice, HabitDayState } from '../../services/practices';
import { isEditableDate, formatDayHeader, formatRelativeDay } from '../../utils/date';
import { showConfirm, showAlert } from '../../utils/alert';
import { PracticeCompletionInput } from '../../types';
import { ProgressScreenProps, ProgressNavigation } from '../../types/navigation';

type Props = ProgressScreenProps<'DayDetail'>;

export const DayDetailScreen: React.FC<Props> = ({ route }) => {
  const { date } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<ProgressNavigation>();
  const [logs, setLogs] = useState<EnrichedCompletionLog[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  // Modal states
  const [pickerVisible, setPickerVisible] = useState(false);
  const [dayPractices, setDayPractices] = useState<HabitDayState[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  // Practice chosen from the picker — capture opens next, locked to this day.
  const [capturing, setCapturing] = useState<HabitDayState | null>(null);

  const [editDifficultyModalVisible, setEditDifficultyModalVisible] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<{
    id: string;
    name: string;
    currentDifficulty: number;
    logId: string;
  } | null>(null);

  // Adding and deleting share one window (see isEditableDate) so the screen
  // never offers to add a rep it wouldn't let you take back.
  const isEditable = isEditableDate(date);
  // "Today"/"Yesterday" only — for anything older the heading's full date is
  // already the clearest thing we can say.
  const relative = formatRelativeDay(date);
  const relativeLabel = relative === 'Today' || relative === 'Yesterday' ? relative : null;

  const refreshData = useCallback(async () => {
    if (!user) return;
    const enriched = await getCompletionLogsWithNames(user.uid, date);
    setLogs(enriched);
    const dayPts = enriched.reduce((sum, l) => sum + l.points, 0);
    setTotalPoints(dayPts);
  }, [user, date]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Open the "which practice?" picker for this day.
  const handleOpenPicker = async () => {
    if (!user) return;
    setLoadingHabits(true);
    setPickerVisible(true);
    try {
      setDayPractices(await getHabitsForDate(user.uid, date));
    } catch (error) {
      showAlert('Error', 'Failed to load practices. Please try again.');
    } finally {
      setLoadingHabits(false);
    }
  };

  // Picked a practice → hand off to the same capture flow today's reps use,
  // locked to this day. Going through completePractice (rather than writing the
  // log here) is what keeps a backfilled rep worth the same as a live one:
  // streak multiplier, first-try bonus, and the practice's tracking fields.
  const handleAddPractice = async (input: PracticeCompletionInput) => {
    if (!user || !capturing) return;
    const { habit } = capturing;
    const { pointsEarned } = await completePractice(
      user.uid,
      { id: habit.id, name: habit.name },
      { ...input, date }
    );
    setCapturing(null);
    showAlert('Logged', `${habit.name} · +${pointsEarned} XP`);
    refreshData();
  };

  // Handle deleting a habit log
  const handleDeleteHabitLog = (log: EnrichedCompletionLog) => {
    if (!user) return;

    showConfirm(
      'Delete Practice Entry',
      `Delete "${log.name}"? This will remove ${log.points} XP.`,
      async () => {
        try {
          await deleteCompletionLog(user.uid, log.id);
          showAlert('Deleted', `Removed ${log.points} XP.`);
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
      showAlert('Updated', `Difficulty changed. XP: ${deltaText}`);
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
          <Text style={styles.logPoints}>{item.points} XP</Text>
        </View>
        <View style={styles.logMeta}>
          <Text style={styles.metaText}>
            {item.type === 'challenge'
              ? 'Challenge'
              : item.type === 'craving'
                ? 'Craving'
                : 'Practice'}
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

        {item.notes && (
          <Text style={styles.notesText}>{item.notes}</Text>
        )}

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
        <Text style={styles.dateText}>{formatDayHeader(date)}</Text>
        {relativeLabel && <Text style={styles.dateSubText}>{relativeLabel}</Text>}
        {isEditable && (
          <Text style={styles.editableLabel}>You can still edit this day</Text>
        )}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalPoints}</Text>
            <Text style={styles.summaryLabel}>XP</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{logs.length}</Text>
            <Text style={styles.summaryLabel}>Actions</Text>
          </View>
        </View>
      </Card>

      {/* Backfill a practice onto this day */}
      {isEditable && (
        <Button
          title="Log a practice for this day"
          onPress={handleOpenPicker}
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

      {/* Pick a practice, then capture it — same flow as a live rep. */}
      <PracticePickerModal
        visible={pickerVisible}
        date={date}
        practices={dayPractices}
        loading={loadingHabits}
        onSelect={(state) => {
          setPickerVisible(false);
          setCapturing(state);
        }}
        onCancel={() => setPickerVisible(false)}
      />

      <HabitCompletionModal
        visible={!!capturing}
        habitName={capturing?.habit.name || ''}
        practiceId={capturing?.habit.practice_id}
        actionPlan={capturing?.habit.action_plan}
        logOnly
        initialDate={date}
        lockDate
        onSubmit={handleAddPractice}
        onCancel={() => setCapturing(null)}
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
  },
  dateSubText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
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
  notesText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
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

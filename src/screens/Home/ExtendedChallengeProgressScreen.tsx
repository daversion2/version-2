import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/challenge/ProgressBar';
import { DailyCheckInList } from '../../components/challenge/DailyCheckInList';
import { CheckInModal } from '../../components/challenge/CheckInModal';
import { useAuth } from '../../context/AuthContext';
import {
  getChallengeById,
  completeMilestone,
  completeExtendedChallenge,
  getCurrentDayNumber,
  areAllMilestonesComplete,
} from '../../services/challenges';
import { updateWillpowerStats } from '../../services/willpower';
import { Challenge } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'ExtendedChallengeProgress'>;

export const ExtendedChallengeProgressScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const passedChallenge = route.params?.challenge as Challenge;

  const [challenge, setChallenge] = useState<Challenge | null>(passedChallenge);
  const [loading, setLoading] = useState(false);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  // Refresh challenge data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!user || !passedChallenge?.id) return;
      (async () => {
        const refreshed = await getChallengeById(user.uid, passedChallenge.id);
        if (refreshed) setChallenge(refreshed);
      })();
    }, [user, passedChallenge?.id])
  );

  if (!challenge || !challenge.milestones || !challenge.start_date) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Challenge not found</Text>
      </View>
    );
  }

  const currentDay = getCurrentDayNumber(challenge.start_date);
  const completedMilestones = challenge.milestones.filter(m => m.completed).length;
  const successfulMilestones = challenge.milestones.filter(m => m.completed && m.succeeded).length;
  const totalMilestones = challenge.milestones.length;
  const progress = completedMilestones / totalMilestones;

  const handleOpenCheckIn = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setCheckInModalVisible(true);
  };

  const handleCheckIn = async (succeeded: boolean, points: number, note?: string) => {
    if (!user) return;

    try {
      await completeMilestone(user.uid, challenge.id, selectedDay, succeeded, points, note);

      // Award the chosen points for daily check-in
      await updateWillpowerStats(user.uid, points);

      // Refresh challenge data
      const refreshed = await getChallengeById(user.uid, challenge.id);
      if (refreshed) {
        setChallenge(refreshed);

        // Check if all milestones are complete
        if (refreshed.milestones && areAllMilestonesComplete(refreshed.milestones)) {
          // Trigger final completion flow
          handleFinalCompletion(refreshed);
        } else {
          showAlert(
            'Day Checked In!',
            `You earned ${points} Willpower ${points === 1 ? 'Point' : 'Points'} for checking in.`
          );
        }
      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to check in.');
    } finally {
      setCheckInModalVisible(false);
    }
  };

  const handleFinalCompletion = (completedChallenge: Challenge) => {
    const successCount = completedChallenge.milestones?.filter(m => m.succeeded).length || 0;
    const totalCount = completedChallenge.milestones?.length || 1;
    const allSuccessful = successCount === totalCount;

    showAlert(
      allSuccessful ? 'Challenge Complete!' : 'Challenge Finished',
      allSuccessful
        ? `Congratulations! You completed all ${totalCount} days of "${completedChallenge.name}"!`
        : `You completed ${successCount} of ${totalCount} days. Every step forward counts!`,
      () => {
        // Navigate to the reflection/completion screen
        navigation.replace('CompleteChallenge', { challenge: completedChallenge });
      }
    );
  };

  const handleEndEarly = () => {
    if (!user) return;

    showConfirm(
      'End Challenge Early',
      `Are you sure you want to end this challenge? You've completed ${successfulMilestones} of ${totalMilestones} days.`,
      async () => {
        setLoading(true);
        try {
          await completeExtendedChallenge(user.uid, challenge.id, {
            status: 'completed',
            difficulty_actual: challenge.difficulty_expected,
          });
          showAlert('Challenge Ended', 'Your progress has been saved.', () => {
            navigation.popToTop();
          });
        } catch (e: any) {
          showAlert('Error', e.message || 'Failed to end challenge.');
        } finally {
          setLoading(false);
        }
      },
      'End Challenge'
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.challengeName}>{challenge.name}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditChallenge', { challenge })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="pencil" size={18} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dayInfo}>
          Day {Math.min(currentDay, totalMilestones)} of {totalMilestones}
        </Text>
      </Card>

      <ProgressBar
        progress={progress}
        label={`${completedMilestones}/${totalMilestones} days`}
      />

      <DailyCheckInList
        milestones={challenge.milestones}
        currentDayNumber={currentDay}
        onCheckIn={handleOpenCheckIn}
        startDate={challenge.start_date}
      />

      <Button
        title="End Challenge Early"
        variant="outline"
        onPress={handleEndEarly}
        loading={loading}
        style={styles.endButton}
      />

      <CheckInModal
        visible={checkInModalVisible}
        dayNumber={selectedDay}
        onConfirm={handleCheckIn}
        onClose={() => setCheckInModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  headerCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editBtn: {
    padding: Spacing.xs,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    flex: 1,
  },
  dayInfo: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  endButton: {
    marginTop: Spacing.xl,
    borderColor: Colors.gray,
  },
});

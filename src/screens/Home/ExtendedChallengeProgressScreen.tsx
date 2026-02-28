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
import { Challenge, BuddyChallenge, ChallengeMilestone } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';
import { getBuddyChallengeById, sendNudge, getPartnerChallengeStatus, getPartnerChallengeMilestones } from '../../services/buddyChallenge';

type Props = NativeStackScreenProps<any, 'ExtendedChallengeProgress'>;

export const ExtendedChallengeProgressScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const passedChallenge = route.params?.challenge as Challenge;

  const [challenge, setChallenge] = useState<Challenge | null>(passedChallenge);
  const [loading, setLoading] = useState(false);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);
  const [partnerUsername, setPartnerUsername] = useState<string | undefined>(undefined);
  const [partnerMilestones, setPartnerMilestones] = useState<ChallengeMilestone[] | null>(null);
  const [nudgeSending, setNudgeSending] = useState(false);

  // Refresh challenge data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!user || !passedChallenge?.id) return;
      (async () => {
        const refreshed = await getChallengeById(user.uid, passedChallenge.id);
        if (refreshed) setChallenge(refreshed);

        // Load buddy challenge status and partner milestones
        if (refreshed?.is_buddy_challenge && refreshed?.buddy_challenge_id) {
          try {
            const [status, partnerData] = await Promise.all([
              getPartnerChallengeStatus(user.uid, refreshed.buddy_challenge_id),
              refreshed.challenge_type === 'extended'
                ? getPartnerChallengeMilestones(user.uid, refreshed.buddy_challenge_id)
                : Promise.resolve(null),
            ]);
            if (status) {
              setPartnerStatus(status.status);
              setPartnerUsername(status.username);
            }
            if (partnerData?.milestones) {
              setPartnerMilestones(partnerData.milestones);
            }
          } catch {
            // Ignore buddy status errors
          }
        }
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

      {/* Buddy Challenge Status */}
      {challenge.is_buddy_challenge && partnerStatus && (
        <Card style={styles.buddyCard}>
          <View style={styles.buddyRow}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <View style={styles.buddyInfo}>
              <Text style={styles.buddyLabel}>
                Buddy: {partnerUsername || challenge.buddy_partner_username || 'Teammate'}
              </Text>
              <Text style={styles.buddyStatus}>
                Status: {partnerStatus === 'active' ? 'In Progress' : partnerStatus === 'completed' ? 'Completed' : partnerStatus}
              </Text>
            </View>
            {partnerStatus === 'active' && challenge.buddy_challenge_id && (
              <TouchableOpacity
                style={styles.nudgeBtn}
                onPress={async () => {
                  if (!user || !challenge.buddy_challenge_id) return;
                  setNudgeSending(true);
                  try {
                    const result = await sendNudge(user.uid, challenge.buddy_challenge_id);
                    if (result.success) {
                      showAlert('Nudge Sent!', `${partnerUsername || 'Your teammate'} will get a notification.`);
                    } else {
                      showAlert('Already Nudged', result.reason || 'Try again tomorrow.');
                    }
                  } catch {
                    showAlert('Error', 'Failed to send nudge.');
                  } finally {
                    setNudgeSending(false);
                  }
                }}
                disabled={nudgeSending}
                activeOpacity={0.7}
              >
                <Text style={styles.nudgeBtnText}>
                  {nudgeSending ? '...' : 'Nudge'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Partner's daily check-in progress */}
          {partnerMilestones && partnerMilestones.length > 0 && (
            <View style={styles.partnerProgress}>
              <Text style={styles.partnerProgressTitle}>
                {partnerUsername || 'Teammate'}'s Progress
              </Text>
              <View style={styles.partnerDaysRow}>
                {partnerMilestones.map((m) => {
                  const isToday = m.day_number === currentDay;
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.partnerDayDot,
                        m.completed && m.succeeded && styles.partnerDaySuccess,
                        m.completed && !m.succeeded && styles.partnerDayFailed,
                        !m.completed && isToday && styles.partnerDayCurrent,
                      ]}
                    >
                      <Text style={[
                        styles.partnerDayText,
                        m.completed && styles.partnerDayTextCompleted,
                      ]}>
                        {m.day_number}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {(() => {
                const todayMilestone = partnerMilestones.find(m => m.day_number === currentDay);
                if (todayMilestone?.completed) {
                  return (
                    <View style={styles.partnerTodayStatus}>
                      <Ionicons
                        name={todayMilestone.succeeded ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={todayMilestone.succeeded ? Colors.success : Colors.fail}
                      />
                      <Text style={[
                        styles.partnerTodayText,
                        { color: todayMilestone.succeeded ? Colors.success : Colors.fail },
                      ]}>
                        {todayMilestone.succeeded ? 'Checked in today' : 'Missed today'}
                      </Text>
                    </View>
                  );
                }
                return (
                  <View style={styles.partnerTodayStatus}>
                    <Ionicons name="time-outline" size={16} color={Colors.gray} />
                    <Text style={styles.partnerTodayText}>
                      Hasn't checked in today
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}
        </Card>
      )}

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
  buddyCard: {
    marginBottom: Spacing.md,
  },
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  buddyStatus: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  nudgeBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  nudgeBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  partnerProgress: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  partnerProgressTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  partnerDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  partnerDayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partnerDaySuccess: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },
  partnerDayFailed: {
    backgroundColor: Colors.fail + '20',
    borderColor: Colors.fail,
  },
  partnerDayCurrent: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  partnerDayText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  partnerDayTextCompleted: {
    color: Colors.dark,
  },
  partnerTodayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerTodayText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

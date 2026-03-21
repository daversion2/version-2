import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/challenge/ProgressBar';
import { EducationalBlurbCard } from '../../components/program/EducationalBlurbCard';
import { ProgramCheckInModal } from '../../components/program/ProgramCheckInModal';
import { useAuth } from '../../context/AuthContext';
import {
  getEnrollmentById,
  getProgramById,
  getTodaysProgramContent,
  checkAndProcessMissedDays,
  completeProgramDay,
  completeProgram,
  abandonProgram,
  markEducationalContentViewed,
} from '../../services/programs';
import { getCurrentDayNumber } from '../../services/challenges';
import { ProgramEnrollment, ProgramDay, ProgramTemplate } from '../../types';

type Props = NativeStackScreenProps<any, 'ProgramDashboard'>;

export const ProgramDashboardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const enrollmentId = route.params?.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [program, setProgram] = useState<ProgramTemplate | null>(null);
  const [todayContent, setTodayContent] = useState<{
    dayNumber: number;
    programDay: ProgramDay;
    isCheckedIn: boolean;
    isGraceDay: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.uid || !enrollmentId) return;
    try {
      // Process missed days first
      const missedResult = await checkAndProcessMissedDays(user.uid, enrollmentId);

      if (missedResult.programFailed) {
        navigation.replace('ProgramFailed', { enrollmentId });
        return;
      }

      const [enrollmentData, content] = await Promise.all([
        getEnrollmentById(user.uid, enrollmentId),
        getTodaysProgramContent(user.uid, enrollmentId),
      ]);

      if (!enrollmentData) return;

      setEnrollment(enrollmentData);
      setTodayContent(content);

      const programData = await getProgramById(enrollmentData.program_id);
      setProgram(programData);
    } catch (err) {
      console.error('Failed to load program dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, enrollmentId, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleCheckIn = async (succeeded: boolean, points: number, note?: string) => {
    if (!user?.uid || !enrollment || !todayContent) return;

    const result = await completeProgramDay(
      user.uid,
      enrollment.id,
      todayContent.dayNumber,
      succeeded,
      points,
      note
    );

    setCheckInModalVisible(false);

    if (result.programFailed) {
      navigation.replace('ProgramFailed', { enrollmentId: enrollment.id });
      return;
    }

    if (result.programCompleted) {
      const completionResult = await completeProgram(user.uid, enrollment.id);
      navigation.replace('ProgramCompletion', {
        enrollmentId: enrollment.id,
        totalPoints: completionResult.totalPoints,
        bonusPoints: completionResult.bonusPoints,
      });
      return;
    }

    // Reload data after check-in
    loadData();
  };

  const handleAbandon = () => {
    Alert.alert(
      'Abandon Program',
      `Are you sure you want to quit ${enrollment?.program_name}? Your progress will be saved but the program will end.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid || !enrollment) return;
            await abandonProgram(user.uid, enrollment.id);
            navigation.popToTop();
          },
        },
      ]
    );
  };

  const handleEducationalViewed = async () => {
    if (!user?.uid || !enrollment || !todayContent) return;
    await markEducationalContentViewed(user.uid, enrollment.id, todayContent.dayNumber);
  };

  if (loading || !enrollment || !program) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const dayNumber = todayContent?.dayNumber ?? getCurrentDayNumber(enrollment.start_date);
  const completedDays = enrollment.milestones.filter(m => m.completed && m.succeeded).length;
  const progress = enrollment.milestones.filter(m => m.completed).length / enrollment.duration_days;
  const graceDaysRemaining = enrollment.grace_days_allowed - enrollment.grace_days_used;
  const isCheckedIn = todayContent?.isCheckedIn ?? false;
  const programColor = program.color;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: programColor + '20' }]}>
          <Ionicons name={program.icon as any} size={32} color={programColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.programName}>{program.name}</Text>
          <View style={styles.modeBadge}>
            <Text style={[styles.modeText, { color: programColor }]}>
              {enrollment.mode === 'cold_turkey' ? 'Cold Turkey' : 'Gradual Build'}
            </Text>
          </View>
        </View>
      </View>

      {/* Day counter & progress */}
      <Card style={styles.progressCard}>
        <Text style={styles.dayCounter}>
          Day <Text style={{ color: programColor }}>{dayNumber}</Text> of {enrollment.duration_days}
        </Text>
        <ProgressBar
          progress={progress}
          label="Overall Progress"
          color={programColor}
        />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedDays}</Text>
            <Text style={styles.statLabel}>Succeeded</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{enrollment.total_points_earned}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, graceDaysRemaining === 0 && { color: Colors.secondary }]}>
              {graceDaysRemaining}
            </Text>
            <Text style={styles.statLabel}>Grace Days</Text>
          </View>
        </View>
      </Card>

      {/* Today's Challenge */}
      {todayContent && (
        <Card style={{ ...styles.challengeCard, borderLeftColor: programColor }}>
          <Text style={styles.sectionLabel}>TODAY'S CHALLENGE</Text>
          <Text style={styles.challengeName}>{todayContent.programDay.challenge_name}</Text>
          <Text style={styles.challengeDesc}>{todayContent.programDay.challenge_description}</Text>

          <View style={styles.criteriaBox}>
            <Ionicons name="checkmark-circle-outline" size={16} color={programColor} />
            <Text style={styles.criteriaText}>{todayContent.programDay.success_criteria}</Text>
          </View>

          <View style={styles.difficultyRow}>
            <Text style={styles.difficultyLabel}>Difficulty</Text>
            <View style={styles.difficultyDots}>
              {[1, 2, 3, 4, 5].map(i => (
                <View
                  key={i}
                  style={[
                    styles.difficultyDot,
                    i <= todayContent.programDay.difficulty
                      ? { backgroundColor: programColor }
                      : { backgroundColor: Colors.border },
                  ]}
                />
              ))}
            </View>
          </View>

          {isCheckedIn ? (
            <View style={styles.checkedInBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.checkedInText}>Checked in today</Text>
            </View>
          ) : (
            <Button
              title="Check In"
              onPress={() => setCheckInModalVisible(true)}
              style={{ marginTop: Spacing.md }}
            />
          )}
        </Card>
      )}

      {/* Educational Content */}
      {todayContent && (
        <EducationalBlurbCard
          programDay={todayContent.programDay}
          programColor={programColor}
          onViewed={handleEducationalViewed}
        />
      )}

      {/* Mini Calendar */}
      <Card style={styles.calendarCard}>
        <Text style={styles.sectionLabel}>PROGRESS CALENDAR</Text>
        <View style={styles.calendarGrid}>
          {enrollment.milestones.map(m => {
            let bgColor = Colors.lightGray;
            let icon: 'checkmark' | 'close' | 'time-outline' | 'remove-outline' = 'time-outline';
            let iconColor = Colors.border;

            if (m.completed && m.succeeded) {
              bgColor = programColor + '20';
              icon = 'checkmark';
              iconColor = programColor;
            } else if (m.completed && m.is_grace_day) {
              bgColor = Colors.secondary + '15';
              icon = 'close';
              iconColor = Colors.secondary;
            } else if (m.day_number === dayNumber) {
              bgColor = programColor + '10';
              icon = 'time-outline';
              iconColor = programColor;
            } else if (m.day_number < dayNumber) {
              icon = 'remove-outline';
              iconColor = Colors.gray;
            }

            return (
              <View key={m.id} style={[styles.calendarDay, { backgroundColor: bgColor }]}>
                <Text style={[styles.calendarDayNum, { color: iconColor }]}>{m.day_number}</Text>
                {m.completed && (
                  <Ionicons name={icon} size={10} color={iconColor} />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: programColor }]} />
            <Text style={styles.legendText}>Succeeded</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.legendText}>Grace Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
            <Text style={styles.legendText}>Upcoming</Text>
          </View>
        </View>
      </Card>

      {/* Abandon Button */}
      <TouchableOpacity style={styles.abandonButton} onPress={handleAbandon}>
        <Text style={styles.abandonText}>Abandon Program</Text>
      </TouchableOpacity>

      {/* Check-in Modal */}
      {todayContent && (
        <ProgramCheckInModal
          visible={checkInModalVisible}
          dayNumber={todayContent.dayNumber}
          programDay={todayContent.programDay}
          programColor={programColor}
          onConfirm={handleCheckIn}
          onClose={() => setCheckInModalVisible(false)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  programName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  modeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  progressCard: {
    marginBottom: Spacing.md,
  },
  dayCounter: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  challengeCard: {
    borderLeftWidth: 3,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  challengeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  criteriaBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  criteriaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
    lineHeight: 20,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 4,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
  },
  checkedInText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.success,
  },
  calendarCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  abandonButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  abandonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
});

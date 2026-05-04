import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  getGoalById,
  completeGoal,
  markGoalNotCompleted,
  extendGoal,
  isGoalExpired,
  getItemsForGoal,
  computeGoalFollowThrough,
} from '../../services/goals';
import { getCompletionLogs } from '../../services/progress';
import { Goal, GoalFollowThrough, Challenge, Nudge, MicroGoal, ProgramEnrollment } from '../../types';

type Props = NativeStackScreenProps<any, 'GoalDashboard'>;

const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
};

const getDaysRemaining = (endDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Build a set of dates (YYYY-MM-DD) that had activity for this goal's items
const getActivityDates = async (
  userId: string,
  itemIds: Set<string>,
  startDate: string,
  endDate: string
): Promise<Set<string>> => {
  const logs = await getCompletionLogs(userId, startDate, endDate);
  const dates = new Set<string>();
  for (const log of logs) {
    if (itemIds.has(log.reference_id)) {
      dates.add(log.date);
    }
  }
  return dates;
};

export const GoalDashboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const goalId = route.params?.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>([]);
  const [programEnrollments, setProgramEnrollments] = useState<ProgramEnrollment[]>([]);
  const [followThrough, setFollowThrough] = useState<GoalFollowThrough | null>(null);
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [showExtendPicker, setShowExtendPicker] = useState(false);
  const [extendDate, setExtendDate] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!user || !goalId) return;
    setLoading(true);
    try {
      const [goalData, items, ft] = await Promise.all([
        getGoalById(user.uid, goalId),
        getItemsForGoal(user.uid, goalId),
        computeGoalFollowThrough(user.uid, goalId),
      ]);
      if (goalData) {
        setGoal(goalData);
        navigation.setOptions({ title: goalData.name });
      }
      setChallenges(items.challenges);
      setHabits(items.habits);
      setMicroGoals(items.microGoals);
      setProgramEnrollments(items.programEnrollments);
      setFollowThrough(ft);

      // Build item IDs for calendar query
      const itemIds = new Set<string>([
        ...items.challenges.map(c => c.id),
        ...items.habits.map(h => h.id),
        ...items.microGoals.map(mg => mg.id),
        ...items.programEnrollments.map(pe => pe.id),
      ]);

      if (itemIds.size > 0) {
        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(now.getDate() - 27);
        const dates = await getActivityDates(
          user.uid,
          itemIds,
          toYYYYMMDD(fourWeeksAgo),
          toYYYYMMDD(now)
        );
        setActivityDates(dates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, goalId, navigation]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalTaggedItems = challenges.length + habits.length + microGoals.length + programEnrollments.length;

  const handleComplete = () => {
    Alert.alert(
      'Complete Goal',
      'Mark this goal as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            if (!user || !goal) return;
            try {
              await completeGoal(user.uid, goal.id);
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleNotCompleted = () => {
    Alert.alert(
      'Mark Not Completed',
      "Mark this goal as not completed? You can always set new goals.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            if (!user || !goal) return;
            try {
              await markGoalNotCompleted(user.uid, goal.id);
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleExtend = async (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowExtendPicker(false);
    if (!date || !user || !goal) return;
    try {
      await extendGoal(user.uid, goal.id, toYYYYMMDD(date));
      setShowExtendPicker(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Goal not found</Text>
      </View>
    );
  }

  const expired = isGoalExpired(goal);
  const daysRemaining = getDaysRemaining(goal.end_date);
  const isActive = goal.status === 'active';
  const ftPct = followThrough ? Math.round(followThrough.followThroughRate * 100) : 0;

  // Compute per-item breakdown
  const challengesCompleted = challenges.filter(c => c.status === 'completed').length;
  const challengesTotal = challenges.length;
  const habitsWeekKept = followThrough?.currentWeekKept ?? 0;
  const habitsWeekTarget = followThrough?.currentWeekCommitments ?? 0;

  // Build last 28 days for calendar
  const calendarDays: { date: string; label: string; active: boolean }[] = [];
  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = toYYYYMMDD(d);
    calendarDays.push({
      date: dateStr,
      label: String(d.getDate()),
      active: activityDates.has(dateStr),
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Status badge for non-active goals */}
      {!isActive && (
        <View style={[styles.statusBadge, goal.status === 'completed' ? styles.statusCompleted : styles.statusFailed]}>
          <Ionicons
            name={goal.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={goal.status === 'completed' ? Colors.success : Colors.secondary}
          />
          <Text style={[styles.statusText, { color: goal.status === 'completed' ? Colors.success : Colors.secondary }]}>
            {goal.status === 'completed' ? 'Completed' : 'Not Completed'}
          </Text>
        </View>
      )}

      {/* Identity statement */}
      {goal.identity_statement && (
        <Card style={styles.identityCard}>
          <Text style={styles.identityQuote}>
            {`"${goal.identity_statement}"`}
          </Text>
          <Text style={styles.identityLabel}>Who you're becoming</Text>
        </Card>
      )}

      {/* Description */}
      {goal.description ? (
        <Text style={styles.description}>{goal.description}</Text>
      ) : null}

      {/* Follow-through rate — replaces manual progress */}
      <Card style={styles.followThroughCard}>
        <Text style={styles.followThroughPct}>
          {ftPct}%
        </Text>
        <Text style={styles.followThroughLabel}>Follow-Through Rate</Text>
        {followThrough && followThrough.totalCommitments > 0 && (
          <Text style={styles.followThroughDetail}>
            {followThrough.keptCommitments}/{followThrough.totalCommitments} commitments kept
          </Text>
        )}

        {/* Per-item breakdown */}
        <View style={styles.breakdownContainer}>
          {challengesTotal > 0 && (
            <View style={styles.breakdownRow}>
              <Ionicons name="flash-outline" size={16} color={Colors.secondary} />
              <Text style={styles.breakdownText}>
                Challenges: {challengesCompleted}/{challengesTotal} completed
              </Text>
            </View>
          )}
          {habits.length > 0 && (
            <View style={styles.breakdownRow}>
              <Ionicons name="repeat-outline" size={16} color={Colors.primary} />
              <Text style={styles.breakdownText}>
                Habits this week: {habitsWeekKept}/{habitsWeekTarget}
              </Text>
            </View>
          )}
          {programEnrollments.length > 0 && (
            <View style={styles.breakdownRow}>
              <Ionicons name="rocket-outline" size={16} color={Colors.primary} />
              <Text style={styles.breakdownText}>
                Programs: {programEnrollments.length} enrolled
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Commitment calendar */}
      <Card>
        <Text style={styles.calendarTitle}>Last 28 Days</Text>
        <View style={styles.calendarGrid}>
          {calendarDays.map((day) => (
            <View
              key={day.date}
              style={[
                styles.calendarDay,
                day.active && styles.calendarDayActive,
              ]}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  day.active && styles.calendarDayTextActive,
                ]}
              >
                {day.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.calendarFooter}>
          {activityDates.size} active day{activityDates.size !== 1 ? 's' : ''}
        </Text>
      </Card>

      {/* Timeline */}
      <Card style={styles.timelineCard}>
        <View style={styles.timelineRow}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Started</Text>
            <Text style={styles.timelineValue}>{formatDate(goal.start_date)}</Text>
          </View>
          <View style={styles.timelineDivider} />
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Target</Text>
            <Text style={styles.timelineValue}>{formatDate(goal.end_date)}</Text>
          </View>
          <View style={styles.timelineDivider} />
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>{expired ? 'Overdue' : 'Remaining'}</Text>
            <Text style={[styles.timelineValue, expired && styles.expiredText]}>
              {expired ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining} days`}
            </Text>
          </View>
        </View>
      </Card>

      {/* CBT Data Cards */}
      {goal.deeper_why && (
        <Card style={styles.cbtCard}>
          <View style={styles.cbtHeader}>
            <Ionicons name="heart-outline" size={18} color={Colors.primary} />
            <Text style={styles.cbtTitle}>Your Deeper Why</Text>
          </View>
          <Text style={styles.cbtContent}>{goal.deeper_why}</Text>
        </Card>
      )}

      {goal.inner_voice_challenge && goal.inner_voice_response && (
        <Card style={styles.cbtCard}>
          <View style={styles.cbtHeader}>
            <Ionicons name="chatbubbles-outline" size={18} color={Colors.secondary} />
            <Text style={styles.cbtTitle}>Inner Voice</Text>
          </View>
          <Text style={styles.cbtChallenge}>
            {`"${goal.inner_voice_challenge}"`}
          </Text>
          <Text style={styles.cbtResponse}>
            Your response: {`"${goal.inner_voice_response}"`}
          </Text>
        </Card>
      )}

      {goal.confidence_baseline != null && (
        <Card style={styles.cbtCard}>
          <View style={styles.cbtHeader}>
            <Ionicons name="trending-up-outline" size={18} color={Colors.primary} />
            <Text style={styles.cbtTitle}>Confidence Baseline</Text>
          </View>
          <Text style={styles.cbtContent}>
            You started at {goal.confidence_baseline}/10. Look at your follow-through now.
          </Text>
        </Card>
      )}

      {/* Tagged Challenges */}
      {challenges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Challenges</Text>
          {challenges.map(c => (
            <Card
              key={c.id}
              style={styles.itemCard}
              onPress={() => {
                if (c.status === 'active') {
                  if (c.challenge_type === 'extended') {
                    navigation.navigate('ExtendedChallengeProgress', { challenge: c });
                  } else {
                    navigation.navigate('CompleteChallenge', { challenge: c });
                  }
                }
              }}
            >
              <View style={styles.itemRow}>
                <Ionicons
                  name={c.status === 'completed' ? 'checkmark-circle' : 'flash-outline'}
                  size={20}
                  color={c.status === 'completed' ? Colors.success : Colors.secondary}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.itemMeta}>{c.status} {c.challenge_type === 'extended' ? '· Extended' : '· Daily'}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Tagged Habits */}
      {habits.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Habits</Text>
          {habits.map(h => (
            <Card
              key={h.id}
              style={styles.itemCard}
              onPress={() => navigation.navigate('HabitDetail', { habitId: h.id })}
            >
              <View style={styles.itemRow}>
                <Ionicons name="repeat-outline" size={20} color={Colors.primary} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.itemMeta}>{h.target_count_per_week}x per week</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Tagged Sprints */}
      {microGoals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Sprints</Text>
          {microGoals.map(mg => (
            <Card key={mg.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <Ionicons
                  name={mg.status === 'completed' ? 'checkmark-circle' : 'timer-outline'}
                  size={20}
                  color={mg.status === 'completed' ? Colors.success : Colors.primary}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{mg.description}</Text>
                  <Text style={styles.itemMeta}>{mg.status} · {mg.deadline}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Tagged Programs */}
      {programEnrollments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Programs</Text>
          {programEnrollments.map(pe => (
            <Card
              key={pe.id}
              style={styles.itemCard}
              onPress={() => navigation.navigate('ProgramDashboard')}
            >
              <View style={styles.itemRow}>
                <Ionicons name="rocket-outline" size={20} color={Colors.primary} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{pe.program_name}</Text>
                  <Text style={styles.itemMeta}>{pe.status} · {pe.mode.replace('_', ' ')}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Empty state */}
      {totalTaggedItems === 0 && (
        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.emptyText}>
            No items tagged to this goal yet. Tag challenges, habits, sprints, or programs when creating them.
          </Text>
        </Card>
      )}

      {/* Actions */}
      {isActive && (
        <View style={styles.actions}>
          {!expired && (
            <Button
              title="Extend Deadline"
              variant="outline"
              onPress={() => {
                const d = new Date(goal.end_date + 'T00:00:00');
                d.setDate(d.getDate() + 7);
                setExtendDate(d);
                setShowExtendPicker(true);
              }}
              style={{ marginBottom: Spacing.sm }}
            />
          )}

          {showExtendPicker && (
            <DateTimePicker
              value={extendDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleExtend}
              minimumDate={new Date()}
            />
          )}

          <Button
            title="Mark Complete"
            onPress={handleComplete}
            style={{ marginBottom: Spacing.sm }}
          />

          {expired && (
            <Button
              title="Mark Not Completed"
              variant="outline"
              onPress={handleNotCompleted}
              style={{ marginBottom: Spacing.sm }}
            />
          )}

          <TouchableOpacity
            style={styles.editLink}
            onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })}
          >
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.editLinkText}>Edit Goal</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  statusCompleted: {
    backgroundColor: Colors.success + '15',
  },
  statusFailed: {
    backgroundColor: Colors.secondary + '15',
  },
  statusText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  identityCard: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  identityQuote: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  identityLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  followThroughCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  followThroughPct: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
    color: Colors.primary,
  },
  followThroughLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  followThroughDetail: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  breakdownContainer: {
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  calendarTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
  },
  calendarDayActive: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  calendarDayTextActive: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
  },
  calendarFooter: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  timelineCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
  },
  timelineDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.lightGray,
  },
  timelineLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  timelineValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  expiredText: {
    color: Colors.secondary,
  },
  cbtCard: {
    marginBottom: Spacing.sm,
  },
  cbtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cbtTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  cbtContent: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 22,
  },
  cbtChallenge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  cbtResponse: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  itemMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
  actions: {
    marginTop: Spacing.xl,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  editLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});

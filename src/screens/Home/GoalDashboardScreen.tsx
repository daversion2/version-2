import React, { useState, useEffect, useCallback } from 'react';
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
import { ProgressBar } from '../../components/challenge/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import {
  getGoalById,
  updateGoal,
  completeGoal,
  markGoalNotCompleted,
  extendGoal,
  isGoalExpired,
  getItemsForGoal,
} from '../../services/goals';
import { Goal, Challenge, Nudge, MicroGoal, ProgramEnrollment } from '../../types';

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

export const GoalDashboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const goalId = route.params?.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>([]);
  const [programEnrollments, setProgramEnrollments] = useState<ProgramEnrollment[]>([]);
  const [progress, setProgress] = useState(0);
  const [showExtendPicker, setShowExtendPicker] = useState(false);
  const [extendDate, setExtendDate] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!user || !goalId) return;
    setLoading(true);
    try {
      const [goalData, items] = await Promise.all([
        getGoalById(user.uid, goalId),
        getItemsForGoal(user.uid, goalId),
      ]);
      if (goalData) {
        setGoal(goalData);
        setProgress(goalData.manual_progress);
        navigation.setOptions({ title: goalData.name });
      }
      setChallenges(items.challenges);
      setHabits(items.habits);
      setMicroGoals(items.microGoals);
      setProgramEnrollments(items.programEnrollments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, goalId, navigation]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalTaggedItems = challenges.length + habits.length + microGoals.length + programEnrollments.length;

  const handleProgressSave = async (value: number) => {
    if (!user || !goal) return;
    const rounded = Math.round(value);
    setProgress(rounded);
    try {
      await updateGoal(user.uid, goal.id, { manual_progress: rounded });
    } catch (e) {
      console.error(e);
    }
  };

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

      {/* Description */}
      {goal.description ? (
        <Text style={styles.description}>{goal.description}</Text>
      ) : null}

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

      {/* Progress */}
      <Card>
        <Text style={styles.sectionTitle}>Progress</Text>
        <ProgressBar progress={progress / 100} label="Manual Progress" />
        {isActive && (
          <View style={styles.sliderRow}>
            <TouchableOpacity onPress={() => handleProgressSave(Math.max(0, progress - 10))}>
              <Ionicons name="remove-circle-outline" size={28} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.progressValue}>{progress}%</Text>
            <TouchableOpacity onPress={() => handleProgressSave(Math.min(100, progress + 10))}>
              <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.activityCount}>
          <Ionicons name="layers-outline" size={18} color={Colors.gray} />
          <Text style={styles.activityCountText}>
            {totalTaggedItems} tagged {totalTaggedItems === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </Card>

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
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  timelineCard: {
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
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  progressValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    minWidth: 50,
    textAlign: 'center',
  },
  activityCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  activityCountText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
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

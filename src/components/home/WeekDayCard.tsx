import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { PlannedItemRow } from './PlannedItemRow';
import { DaySummary } from '../../services/weeklyPlan';
import { Category, Challenge, CompletionLog, Nudge, PlannedItem, TomorrowChallenge } from '../../types';
import { formatDayHeader } from '../../utils/date';
import { suggestHabitsForTomorrow } from '../../services/dailyPlan';

interface WeekDayCardProps {
  summary: DaySummary;
  categories: Category[];
  habits: Nudge[];
  weeklyCounts: Record<string, number>;
  getCatColor: (catId: string) => string;
  getLogName: (log: CompletionLog) => string;
  onPlanSaved: (date: string, habitIds: string[], challenges: TomorrowChallenge[]) => void;
  scheduledChallenges?: Challenge[];
  onNavigate: (screen: string, params?: any) => void;
  onItemPress?: (item: PlannedItem) => void;
  onCalendarExport?: (item: PlannedItem) => void;
  defaultExpanded?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  challenge: 'Challenge',
  nudge: 'Habit',
  micro_goal: 'Sprint',
  program: 'Program',
};

export const WeekDayCard: React.FC<WeekDayCardProps> = ({
  summary,
  categories,
  habits,
  weeklyCounts,
  getCatColor,
  getLogName,
  onPlanSaved,
  scheduledChallenges = [],
  onNavigate,
  onItemPress,
  onCalendarExport,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>(
    summary.plan?.planned_habit_ids || []
  );
  const [plannedChallenges, setPlannedChallenges] = useState<TomorrowChallenge[]>(
    summary.plan?.planned_challenges || []
  );

  const { isToday, isPast, date } = summary;
  const isFuture = !isToday && !isPast;

  // Badge text
  const totalCompleted =
    summary.challengesCompleted + summary.habitsCompleted + summary.microGoalsCompleted;
  const plannedCount =
    (summary.plan?.planned_habit_ids?.length || 0) +
    (summary.plan?.planned_challenges?.length || 0) +
    scheduledChallenges.length;

  let badgeText = '';
  let badgeColor = Colors.gray;
  if (isToday) {
    badgeText = 'Today';
    badgeColor = Colors.primary;
  } else if (isPast && totalCompleted > 0) {
    badgeText = `${totalCompleted} completed`;
    badgeColor = Colors.primary;
  } else if (isFuture && plannedCount > 0) {
    badgeText = `${plannedCount} planned`;
    badgeColor = Colors.secondary;
  }

  const suggestedHabitIds = suggestHabitsForTomorrow(habits, weeklyCounts).map((h) => h.id);

  const handleToggleHabit = (habitId: string) => {
    setSelectedHabitIds((prev) =>
      prev.includes(habitId)
        ? prev.filter((id) => id !== habitId)
        : [...prev, habitId]
    );
  };

  const handleRemoveChallenge = (index: number) => {
    setPlannedChallenges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePlan = () => {
    onPlanSaved(date, selectedHabitIds, plannedChallenges);
    setEditing(false);
  };

  return (
    <Card
      style={{
        ...styles.card,
        ...(isToday ? styles.cardToday : {}),
      }}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.dayDot,
              isToday && styles.dayDotToday,
              isPast && styles.dayDotPast,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                isToday && styles.dayNumberToday,
              ]}
            >
              {date.split('-')[2].replace(/^0/, '')}
            </Text>
          </View>
          <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
            {formatDayHeader(date)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {badgeText !== '' && (
            <View style={[styles.badge, { backgroundColor: badgeColor + '15' }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {badgeText}
              </Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.gray}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.body}>
          {/* ── TODAY ── */}
          {isToday && summary.todayItems && (
            <View>
              {summary.todayItems.length === 0 ? (
                <Text style={styles.emptyText}>Nothing planned for today</Text>
              ) : (
                summary.todayItems.map((item) => (
                  <PlannedItemRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onPress={onItemPress}
                    onCalendarExport={onCalendarExport}
                  />
                ))
              )}
            </View>
          )}

          {/* ── PAST DAY ── */}
          {isPast && (
            <View>
              {totalCompleted === 0 ? (
                <Text style={styles.emptyText}>No activity</Text>
              ) : (
                summary.completions.map((log) => (
                  <View key={log.id} style={styles.completionRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2E7D32"
                    />
                    <View style={styles.completionInfo}>
                      <Text style={styles.completionName} numberOfLines={1}>
                        {getLogName(log)}
                      </Text>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {TYPE_LABELS[log.type] || log.type}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── FUTURE DAY (read-only view) ── */}
          {isFuture && !editing && (
            <View>
              {plannedCount === 0 ? (
                <Text style={styles.emptyText}>Nothing planned yet</Text>
              ) : (
                <View>
                  {(summary.plan?.planned_habit_ids || []).length > 0 && (
                    <View style={styles.planSection}>
                      <Text style={styles.planSectionLabel}>Habits</Text>
                      {summary.plan!.planned_habit_ids.map((habitId) => {
                        const habit = habits.find((h) => h.id === habitId);
                        if (!habit) return null;
                        return (
                          <View key={habitId} style={styles.planRow}>
                            <Ionicons
                              name="repeat-outline"
                              size={18}
                              color={getCatColor(habit.category_id)}
                            />
                            <Text style={styles.planRowText}>{habit.name}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {((summary.plan?.planned_challenges || []).length > 0 || scheduledChallenges.length > 0) && (
                    <View style={styles.planSection}>
                      <Text style={styles.planSectionLabel}>Challenges</Text>
                      {(summary.plan?.planned_challenges || []).map((ch, i) => {
                        const cat = categories.find((c) => c.id === ch.category_id);
                        return (
                          <View key={`planned-${i}`} style={styles.planRow}>
                            <Ionicons
                              name="trophy-outline"
                              size={18}
                              color={cat?.color || Colors.secondary}
                            />
                            <Text style={styles.planRowText}>{ch.name}</Text>
                          </View>
                        );
                      })}
                      {scheduledChallenges.map((ch) => (
                        <View key={`scheduled-${ch.id}`} style={styles.planRow}>
                          <Ionicons
                            name="trophy"
                            size={18}
                            color={getCatColor(ch.category_id)}
                          />
                          <Text style={styles.planRowText}>{ch.name}</Text>
                          <View style={styles.scheduledBadge}>
                            <Text style={styles.scheduledText}>Scheduled</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
                activeOpacity={0.6}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>
                  {plannedCount > 0 ? 'Edit Plan' : 'Plan This Day'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── INLINE EDITOR (future days) ── */}
          {isFuture && editing && (
            <View>
              {/* Habits toggle list */}
              {habits.length > 0 && (
                <View style={styles.editSection}>
                  <Text style={styles.editSectionLabel}>Habits</Text>
                  {habits.map((habit) => {
                    const isSelected = selectedHabitIds.includes(habit.id);
                    const isSuggested = suggestedHabitIds.includes(habit.id);
                    const done = weeklyCounts[habit.id] || 0;
                    return (
                      <TouchableOpacity
                        key={habit.id}
                        style={[styles.habitRow, isSelected && styles.habitRowSelected]}
                        onPress={() => handleToggleHabit(habit.id)}
                        activeOpacity={0.6}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? Colors.primary : Colors.gray}
                        />
                        <View style={styles.habitInfo}>
                          <Text style={styles.habitName}>{habit.name}</Text>
                          <Text style={styles.habitProgress}>
                            {done}/{habit.target_count_per_week} this week
                          </Text>
                        </View>
                        {isSuggested && (
                          <View style={styles.suggestedBadge}>
                            <Text style={styles.suggestedText}>Suggested</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Planned challenges list + add button */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionLabel}>Challenges</Text>
                {plannedChallenges.map((ch, index) => {
                  const cat = categories.find((c) => c.id === ch.category_id);
                  return (
                    <View key={index} style={styles.challengeRow}>
                      <Ionicons
                        name="trophy-outline"
                        size={18}
                        color={cat?.color || Colors.secondary}
                      />
                      <Text style={styles.challengeRowText}>{ch.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveChallenge(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={Colors.gray} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={styles.newChallengeBtn}
                  onPress={() => onNavigate('StartChallenge', { forDate: date })}
                  activeOpacity={0.7}
                >
                  <View style={styles.newChallengeBtnIcon}>
                    <Ionicons name="trophy-outline" size={20} color={Colors.white} />
                  </View>
                  <View style={styles.newChallengeBtnContent}>
                    <Text style={styles.newChallengeBtnTitle}>New Challenge</Text>
                    <Text style={styles.newChallengeBtnSub}>
                      Create new, pick from past, or browse library
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                </TouchableOpacity>
              </View>

              {/* Save / Cancel */}
              <View style={styles.editorActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setSelectedHabitIds(summary.plan?.planned_habit_ids || []);
                    setPlannedChallenges(summary.plan?.planned_challenges || []);
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSavePlan}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Save Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  cardToday: {
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: {
    backgroundColor: Colors.primary,
  },
  dayDotPast: {
    backgroundColor: Colors.border,
  },
  dayNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  dayNumberToday: {
    color: Colors.white,
  },
  dayLabel: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  dayLabelToday: {
    fontFamily: Fonts.primaryBold,
    color: Colors.primary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 1,
  },
  body: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  // Past day completion rows
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  completionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
  },
  // Future day plan display
  planSection: {
    marginBottom: Spacing.sm,
  },
  planSectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  planRowText: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  editBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  // Inline editor
  editSection: {
    marginBottom: Spacing.md,
  },
  editSectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  habitRowSelected: {
    backgroundColor: Colors.primary + '10',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitProgress: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
    marginTop: 1,
  },
  scheduledBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  scheduledText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 2,
    color: Colors.primary,
  },
  suggestedBadge: {
    backgroundColor: Colors.secondary + '18',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  suggestedText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 2,
    color: Colors.secondary,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  challengeRowText: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  newChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  newChallengeBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChallengeBtnContent: {
    flex: 1,
  },
  newChallengeBtnTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  newChallengeBtnSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
    marginTop: 1,
  },
  // Editor actions
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
});

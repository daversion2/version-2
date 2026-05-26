import React, { useState, useMemo } from 'react';
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
import { buildTodaysPlan } from '../../services/dailyPlan';
import { HomeData, HomeCallbacks } from '../../screens/Home/sections/types';

interface TodaysPlanCardProps {
  data: HomeData;
  callbacks: HomeCallbacks;
}

const MAX_VISIBLE_DEFAULT = 5;

export const TodaysPlanCard: React.FC<TodaysPlanCardProps> = ({
  data,
  callbacks,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const challengesUnlocked = data.totalHabitsCompleted >= 3;
  const [addMode, setAddMode] = useState<'habit' | 'challenge'>(challengesUnlocked ? 'challenge' : 'habit');

  const items = useMemo(
    () =>
      buildTodaysPlan({
        activeChallenges: data.activeChallenges,
        extendedChallenges: data.extendedChallenges,
        habits: data.habits,
        weeklyCounts: data.weeklyCounts,
        activeProgram: data.activeProgram,
        todaysProgramDay: data.todaysProgramDay,
        programDayNumber: data.programDayNumber,
        programCheckedIn: data.programCheckedIn,
        getCatColor: callbacks.getCatColor,
        plannedHabitIds: data.plannedHabitIds,
      }),
    [
      data.activeChallenges,
      data.extendedChallenges,
      data.habits,
      data.weeklyCounts,
      data.activeProgram,
      data.todaysProgramDay,
      data.programDayNumber,
      data.programCheckedIn,
      callbacks.getCatColor,
      data.plannedHabitIds,
    ]
  );

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const pendingItems = items.filter((i) => i.status !== 'completed');
  const completedItems = items.filter((i) => i.status === 'completed');

  // Show pending first, then completed — limit to MAX_VISIBLE_DEFAULT unless expanded
  const orderedItems = [...pendingItems, ...completedItems];
  const hasMore = orderedItems.length > MAX_VISIBLE_DEFAULT;
  const visibleItems = expanded
    ? orderedItems
    : orderedItems.slice(0, MAX_VISIBLE_DEFAULT);

  // Habits not already in the plan (available to add)
  const unplannedHabits = data.habits.filter(
    (h) => !data.plannedHabitIds.includes(h.id)
  );

  return (
    <View style={styles.wrapper}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <TouchableOpacity
          style={styles.headerRow}
          onPress={() => setCollapsed(!collapsed)}
          activeOpacity={0.7}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="today-outline" size={28} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Today's Plan</Text>
              {totalCount > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>
                    {completedCount}/{totalCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              {pendingItems.length === 0
                ? 'All done for today!'
                : `${pendingItems.length} item${pendingItems.length !== 1 ? 's' : ''} remaining`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => callbacks.onNavigate('WeeklyPlanner')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.weekBtn}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.white + '90'} />
          </TouchableOpacity>
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={Colors.white + '80'}
          />
        </TouchableOpacity>
      </Card>

      {/* Collapsible Content */}
      {!collapsed && (
        <Card style={styles.card}>
          {totalCount === 0 && !showAddForm && (
            <View style={styles.emptyState}>
              <Ionicons name="sunny-outline" size={28} color={Colors.gray} />
              <Text style={styles.emptyText}>Nothing planned yet</Text>
            </View>
          )}

          {visibleItems.map((item) => (
            <PlannedItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              onCalendarExport={callbacks.onCalendarExport}
              onPress={callbacks.onPlannedItemPress}
            />
          ))}

          {hasMore && !expanded && (
            <TouchableOpacity
              onPress={() => setExpanded(true)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>
                Show all ({orderedItems.length - MAX_VISIBLE_DEFAULT} more)
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {expanded && hasMore && (
            <TouchableOpacity
              onPress={() => setExpanded(false)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>Show less</Text>
              <Ionicons name="chevron-up" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {/* ── Add to Today ── */}
          {!showAddForm && (
            <TouchableOpacity
              style={styles.addToTodayBtn}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.6}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addToTodayText}>Add to today</Text>
            </TouchableOpacity>
          )}

          {showAddForm && (
            <View style={styles.addFormSection}>
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                {challengesUnlocked && (
                  <TouchableOpacity
                    style={[styles.tab, addMode === 'challenge' && styles.tabActive]}
                    onPress={() => setAddMode('challenge')}
                  >
                    <Ionicons
                      name="trophy-outline"
                      size={14}
                      color={addMode === 'challenge' ? Colors.primary : Colors.gray}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        addMode === 'challenge' && styles.tabTextActive,
                      ]}
                    >
                      Challenge
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.tab, addMode === 'habit' && styles.tabActive]}
                  onPress={() => setAddMode('habit')}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={14}
                    color={addMode === 'habit' ? Colors.primary : Colors.gray}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      addMode === 'habit' && styles.tabTextActive,
                    ]}
                  >
                    Habit
                  </Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>

              {/* Challenge — navigate to full creation flow */}
              {addMode === 'challenge' && (
                <TouchableOpacity
                  style={styles.newChallengeBtn}
                  onPress={() => {
                    setShowAddForm(false);
                    callbacks.onNavigate('StartChallenge');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.newChallengeBtnIcon}>
                    <Ionicons name="trophy-outline" size={22} color={Colors.white} />
                  </View>
                  <View style={styles.newChallengeBtnContent}>
                    <Text style={styles.newChallengeBtnTitle}>New Challenge</Text>
                    <Text style={styles.newChallengeBtnSub}>
                      Create new, pick from past, or browse library
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
                </TouchableOpacity>
              )}

              {/* Habit picker */}
              {addMode === 'habit' && (
                <View>
                  {unplannedHabits.length === 0 ? (
                    <Text style={styles.noHabitsText}>
                      All habits are already in your plan
                    </Text>
                  ) : (
                    unplannedHabits.map((habit) => {
                      const done = data.weeklyCounts[habit.id] || 0;
                      return (
                        <TouchableOpacity
                          key={habit.id}
                          style={styles.habitPickerRow}
                          onPress={() => callbacks.onToggleTodayHabit?.(habit.id)}
                          activeOpacity={0.6}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color={Colors.primary}
                          />
                          <View style={styles.habitPickerInfo}>
                            <Text style={styles.habitPickerName}>{habit.name}</Text>
                            <Text style={styles.habitPickerProgress}>
                              {done}/{habit.target_count_per_week} this week
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.md,
  },
  headerCard: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  countPill: {
    backgroundColor: Colors.white + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  weekBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  showMoreText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  // Add to today
  addToTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addToTodayText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  addFormSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  tabText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  tabTextActive: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  // New challenge button
  newChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
  },
  newChallengeBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  // Habit picker
  habitPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  habitPickerInfo: {
    flex: 1,
  },
  habitPickerName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitPickerProgress: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
    marginTop: 1,
  },
  noHabitsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type { MealsStackParamList } from '../../../../types/meals';
import { ItemState, dailyGoalOnDay, describeGroupGoal, summarizeWeek, WeekDay } from '../../../../services/mealsMath';
import { useMeals } from './MealsContext';
import { FAIL_COLOR, MEALS_ACCENT, MEALS_TINT, PASS_COLOR, itemColor, itemGlyph, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsWeek'>;

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The worst result among a day's extras, or null when there were none. */
const extrasState = (day: WeekDay): ItemState | null => {
  const extras = day.score?.items.filter((i) => i.kind === 'extra') ?? [];
  if (extras.length === 0) return null;
  return extras.some((i) => i.state === 'fail') ? 'fail' : 'pass';
};

/**
 * This week, Monday to today: one cell per meal per day, the meal that slips
 * most, and the food-group goals. Tap a day to open it.
 */
export const MealsWeekScreen: React.FC<Props> = ({ navigation }) => {
  const { today, days, rules } = useMeals();
  const week = useMemo(() => summarizeWeek(today, days, rules), [today, days, rules]);

  const openDay = (day: WeekDay) => {
    if (day.future) return;
    navigation.push('MealsDay', { date: day.date });
  };

  const cell = (day: WeekDay, state: ItemState | null | undefined) => {
    const isToday = day.date === today;
    if (day.future || state == null || state === 'pending') {
      return <View style={[styles.cell, styles.cellEmpty, isToday && styles.cellToday]} />;
    }
    return (
      <View
        style={[
          styles.cell,
          { backgroundColor: itemColor(state) },
          state === 'skipped' && styles.cellSkipped,
          isToday && styles.cellToday,
        ]}
      >
        <Text style={[styles.cellText, state === 'skipped' && { color: Colors.gray }]}>{itemGlyph(state)}</Text>
      </View>
    );
  };

  const daily = rules.group_goals.filter((g) => g.period === 'day');

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll}>
      <View>
        <Text style={styles.big}>
          {week.passed} of {week.scored}
        </Text>
        <Text style={mls.muted}>meals and extras passed this week · the week starts again Monday</Text>
      </View>

      <View style={mls.card}>
        <View style={styles.gridRow}>
          <View style={styles.rowLabel} />
          {week.days.map((d, i) => (
            <TouchableOpacity
              key={d.date}
              style={styles.colHead}
              onPress={() => openDay(d)}
              disabled={d.future}
              accessibilityLabel={`Open ${d.date}`}
            >
              <Text style={[styles.colHeadText, d.date === today && { color: MEALS_ACCENT }]}>{DAY_LETTERS[i]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gridRow}>
          <Text style={styles.rowLabel}>Day</Text>
          {week.days.map((d) => {
            const status = d.score?.status;
            const shown = status === 'on' || status === 'off';
            return (
              <TouchableOpacity key={d.date} style={styles.cellWrap} onPress={() => openDay(d)} disabled={d.future}>
                {shown ? (
                  <View style={[styles.dayDot, { backgroundColor: status === 'on' ? PASS_COLOR : FAIL_COLOR }]} />
                ) : (
                  <View style={[styles.dayDot, styles.dayDotEmpty]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {rules.slots.map((slot) => (
          <View key={slot.id} style={styles.gridRow}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {slot.name}
            </Text>
            {week.days.map((d) => (
              <TouchableOpacity key={d.date} style={styles.cellWrap} onPress={() => openDay(d)} disabled={d.future}>
                {cell(d, d.score?.items.find((i) => i.kind === 'meal' && i.key === slot.id)?.state)}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.gridRow}>
          <Text style={styles.rowLabel}>Extras</Text>
          {week.days.map((d) => (
            <TouchableOpacity key={d.date} style={styles.cellWrap} onPress={() => openDay(d)} disabled={d.future}>
              {cell(d, extrasState(d))}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[mls.card, styles.insight]}>
        <Text style={styles.insightLabel}>Worth a look</Text>
        <Text style={mls.body}>
          {week.slipping
            ? `${week.slipping.name} is the one slipping — it failed ${week.slipping.fails} of ${week.slipping.logged} times this week.`
            : week.scored > 0
              ? 'No meal is slipping more than the others this week.'
              : 'Log a few meals and this is where you’ll see which one slips most.'}
        </Text>
      </View>

      {(daily.length > 0 || week.weeklyGoals.length > 0) && <Text style={mls.sectionLabel}>Food-group goals</Text>}

      {daily.map((goal) => (
        <View key={goal.id} style={mls.card}>
          <Text style={mls.title}>{describeGroupGoal(goal)}</Text>
          <View style={styles.bars}>
            {week.days.map((d, i) => {
              const result = dailyGoalOnDay(d, goal.group, goal.count);
              return (
                <View key={d.date} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      result === 'hit' && { backgroundColor: PASS_COLOR },
                      result === 'miss' && { backgroundColor: FAIL_COLOR + '55' },
                    ]}
                  />
                  <Text style={styles.barLabel}>{DAY_LETTERS[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {week.weeklyGoals.map(({ goal, have }) => (
        <View key={goal.id} style={mls.card}>
          <View style={styles.weeklyTop}>
            <Text style={mls.title}>{describeGroupGoal(goal)}</Text>
            <Text style={styles.weeklyCount}>
              {have} of {goal.count}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (have / goal.count) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.hero, color: Colors.dark },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  rowLabel: { width: 74, fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  colHead: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  colHeadText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  cellWrap: { flex: 1 },
  cell: {
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border },
  cellSkipped: { backgroundColor: Colors.lightGray },
  cellToday: { borderWidth: 2, borderStyle: 'solid', borderColor: MEALS_ACCENT },
  cellText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.white },
  dayDot: { width: 12, height: 12, borderRadius: 6, alignSelf: 'center' },
  dayDotEmpty: { borderWidth: 1.5, borderColor: Colors.border },
  insight: { backgroundColor: MEALS_TINT, borderColor: MEALS_ACCENT + '55', gap: 4 },
  insightLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: MEALS_ACCENT,
  },
  bars: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { alignSelf: 'stretch', height: 22, borderRadius: 5, backgroundColor: Colors.lightGray },
  barLabel: { fontFamily: Fonts.secondary, fontSize: 10, color: Colors.gray },
  weeklyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.md },
  weeklyCount: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.lightGray, marginTop: Spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: PASS_COLOR, borderRadius: 4 },
});

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius, TextStyles } from '../../../../constants/theme';
import type { MealsStackParamList } from '../../../../types/meals';
import {
  dailyGoalOnDay,
  daysOnTarget,
  describeGroupGoal,
  pastWeeks,
  summarizeWeek,
  WeekDay,
  WeekSummary,
} from '../../../../services/mealsMath';
import { NUTRIENTS } from '../../../../data/mealGroups';
import { useMeals } from './MealsContext';
import {
  FAIL_COLOR,
  MEALS_ACCENT,
  NUTRIENT_COLOR,
  PASS_COLOR,
  scoreColor,
  mls,
} from './components/mealsStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsWeek'>;

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** "Oct 5 – 11". */
const weekRange = (w: WeekSummary): string => {
  const fmt = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(w.days[0].date)} – ${fmt(w.days[6].date)}`;
};

/**
 * This week, Monday to today: each day's score and how many meals it had, what
 * the plates gave you, and the food-group goals. Tap a day to open it.
 */
export const MealsWeekScreen: React.FC<Props> = ({ navigation }) => {
  const t = useCopy();
  const { today, days, pastDays, rules } = useMeals();
  const week = useMemo(() => summarizeWeek(today, days, rules), [today, days, rules]);
  const past = useMemo(() => pastWeeks(today, pastDays, rules), [today, pastDays, rules]);

  const openDay = (day: WeekDay) => {
    if (day.future) return;
    navigation.push('MealsDay', { date: day.date });
  };

  /** A filled cell, or a dashed empty one for a day with nothing logged. */
  const cell = (day: WeekDay, text: string | number | null, color: string) => {
    const isToday = day.date === today;
    if (day.future || text === null) {
      return <View style={[styles.cell, styles.cellEmpty, isToday && styles.cellToday]} />;
    }
    return (
      <View style={[styles.cell, { backgroundColor: color }, isToday && styles.cellToday]}>
        <Text style={styles.cellText}>{text}</Text>
      </View>
    );
  };

  const daily = rules.group_goals.filter((g) => g.period === 'day');

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll}>
      <View style={styles.head}>
        <Text style={styles.big}>{week.averageScore ?? '–'}</Text>
        <Copy
          id={week.platesLogged === 1 ? 'meals.week.headSub.one' : 'meals.week.headSub.other'}
          style={mls.muted}
          vars={{ n: week.platesLogged }}
        >
          {week.platesLogged === 1
            ? 'average plate score this week · {n} plate logged'
            : 'average plate score this week · {n} plates logged'}
        </Copy>
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
          <Copy id="meals.week.rowDay" style={styles.rowLabel}>Day</Copy>
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

        <View style={styles.gridRow}>
          <Copy id="meals.week.rowScore" style={styles.rowLabel}>Score</Copy>
          {week.days.map((d) => (
            <TouchableOpacity key={d.date} style={styles.cellWrap} onPress={() => openDay(d)} disabled={d.future}>
              {cell(d, d.score?.average ?? null, scoreColor(d.score?.average ?? null))}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gridRow}>
          <Copy id="meals.week.rowMeals" style={styles.rowLabel}>Meals</Copy>
          {week.days.map((d) => (
            <TouchableOpacity key={d.date} style={styles.cellWrap} onPress={() => openDay(d)} disabled={d.future}>
              {cell(d, d.score?.scoredCount || null, MEALS_ACCENT)}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {week.nutrients[0]?.of > 0 && (
        <>
          <Copy id="meals.week.gave" style={mls.sectionLabel}>What your plates gave you</Copy>
          <View style={[mls.card, styles.nutrientCard]}>
            <View style={styles.gridRow}>
              <View style={styles.rowLabel} />
              {week.days.map((d, i) => (
                <Text key={d.date} style={[styles.colHeadText, styles.colHead, styles.center, d.date === today && { color: MEALS_ACCENT }]}>
                  {DAY_LETTERS[i]}
                </Text>
              ))}
            </View>
            {NUTRIENTS.map((n) => (
              <View key={n.id} style={styles.gridRow}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {n.label}
                </Text>
                {week.days.map((d) => {
                  const c = d.score?.nutrients.find((x) => x.nutrient === n.id);
                  const isToday = d.date === today;
                  if (!c || c.have === 0) {
                    return (
                      <View key={d.date} style={styles.cellWrap}>
                        <View style={[styles.cell, styles.cellEmpty, isToday && styles.cellToday]} />
                      </View>
                    );
                  }
                  // Darker when more of that day's plates had it.
                  const alpha = Math.round((0.25 + 0.75 * (c.have / c.of)) * 255)
                    .toString(16)
                    .padStart(2, '0');
                  return (
                    <View key={d.date} style={styles.cellWrap}>
                      <View
                        style={[styles.cell, { backgroundColor: NUTRIENT_COLOR[n.id] + alpha }, isToday && styles.cellToday]}
                        accessibilityLabel={`${n.label}: ${c.have} of ${c.of} plates`}
                      >
                        <Text style={styles.cellText}>{c.have}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            <Copy id="meals.week.legend" style={mls.muted}>Number = plates that day with it. Darker = more of that day’s plates.</Copy>
            {week.nutrients.map((c) => {
              const label = NUTRIENTS.find((x) => x.id === c.nutrient)?.label;
              return (
                <View key={c.nutrient} style={styles.nutrientTotal}>
                  <View style={styles.weeklyTop}>
                    <Text style={mls.body}>{label}</Text>
                    <Copy id="meals.week.platesOf" style={styles.weeklyCount} vars={{ have: c.have, of: c.of }}>
                      {'{have} of {of} plates'}
                    </Copy>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${(c.have / c.of) * 100}%`, backgroundColor: NUTRIENT_COLOR[c.nutrient] },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {(daily.length > 0 || week.weeklyGoals.length > 0) && <Copy id="meals.week.groupGoals" style={mls.sectionLabel}>Food-group goals</Copy>}

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
            <Copy id="meals.week.goalProgress" style={styles.weeklyCount} vars={{ have, count: goal.count }}>
              {'{have} of {count}'}
            </Copy>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (have / goal.count) * 100)}%` }]} />
          </View>
        </View>
      ))}

      {past.length > 0 && (
        <>
          <Copy id="meals.week.past" style={mls.sectionLabel}>Past weeks</Copy>
          {past.map((w) => {
            const on = daysOnTarget(w);
            return (
              <View key={w.days[0].date} style={[mls.card, styles.pastWeek]}>
                <View style={styles.weeklyTop}>
                  <Text style={mls.title}>{weekRange(w)}</Text>
                  <Copy
                    id={on === 1 ? 'meals.week.daysOnTarget.one' : 'meals.week.daysOnTarget.other'}
                    style={styles.weeklyCount}
                    vars={{ n: on }}
                  >
                    {on === 1 ? '{n} day on target' : '{n} days on target'}
                  </Copy>
                </View>
                <View style={styles.pastDots}>
                  {w.days.map((d, i) => {
                    const status = d.score?.status;
                    return (
                      <View key={d.date} style={styles.barCol}>
                        <View
                          style={[
                            styles.dayDot,
                            status === 'on'
                              ? { backgroundColor: PASS_COLOR }
                              : status === 'off'
                                ? { backgroundColor: FAIL_COLOR }
                                : styles.dayDotEmpty,
                          ]}
                          accessibilityLabel={`${d.date}: ${status === 'on' ? 'on target' : status === 'off' ? 'off target' : 'nothing logged'}`}
                        />
                        <Text style={styles.barLabel}>{DAY_LETTERS[i]}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={mls.muted}>
                  {w.platesLogged === 1
                    ? t('meals.week.pastSummary.one', '{avg} average · {n} plate logged', { avg: w.averageScore ?? '–', n: w.platesLogged })
                    : t('meals.week.pastSummary.other', '{avg} average · {n} plates logged', { avg: w.averageScore ?? '–', n: w.platesLogged })}
                  {w.platesLogged > 0
                    ? '\n' +
                      w.nutrients
                        .map((c) => `${NUTRIENTS.find((x) => x.id === c.nutrient)?.label} ${c.have}/${c.of}`)
                        .join(' · ')
                    : ''}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  head: { paddingHorizontal: 4, gap: 2 },
  big: { fontFamily: TextStyles.largeTitle.fontFamily, fontSize: 48, lineHeight: 54, fontWeight: '700', color: Colors.dark },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  rowLabel: { width: 74, ...TextStyles.caption, fontWeight: '600', color: Colors.gray },
  colHead: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  colHeadText: { ...TextStyles.caption, fontWeight: '600', color: Colors.gray },
  cellWrap: { flex: 1 },
  cell: {
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.separator },
  cellToday: { borderWidth: 2, borderStyle: 'solid', borderColor: MEALS_ACCENT },
  cellText: { ...TextStyles.caption, fontWeight: '600', color: Colors.white },
  dayDot: { width: 12, height: 12, borderRadius: 6, alignSelf: 'center' },
  dayDotEmpty: { borderWidth: 1, borderColor: Colors.separator },
  bars: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { alignSelf: 'stretch', height: 22, borderRadius: 5, backgroundColor: Colors.lightGray },
  barLabel: { ...TextStyles.caption, color: Colors.gray },
  weeklyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.md },
  weeklyCount: { ...TextStyles.subhead, color: Colors.gray },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.lightGray, marginTop: Spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: MEALS_ACCENT, borderRadius: 4 },
  nutrientCard: { gap: 2 },
  center: { textAlign: 'center' },
  nutrientTotal: { marginTop: Spacing.sm },
  pastWeek: { gap: Spacing.sm },
  pastDots: { flexDirection: 'row', gap: 6 },
});

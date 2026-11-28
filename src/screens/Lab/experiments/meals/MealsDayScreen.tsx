import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import type { FoodGroupId, MealsStackParamList } from '../../../../types/meals';
import {
  activeCustomGroups,
  canReopen,
  clockTime,
  isSettled,
  plateStamp,
  platesOf,
  reopenDay,
  rulesForDay,
  scoreDay,
  withPlate,
  withoutPlate,
} from '../../../../services/mealsMath';
import { MEAL_GOALS, MEAL_OFF_REASONS } from '../../../../data/mealGroups';
import { showConfirm } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MealPickerModal, PickerTarget } from './components/MealPickerModal';
import { DayStatusCard, PlateRow, plateTitle } from './components/MealsParts';
import { MEALS_ACCENT, mls } from './components/mealsStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsDay'>;

type Editing = PickerTarget & { plateId?: string };

/**
 * One day of meals — today by default, or a past day of this week opened from
 * the week view. Log a meal (or a snack, or a drink) whenever you eat: tap
 * what was on the plate, and it's saved with the time (changeable). Close out today when
 * the eating's done, or it closes on its own at midnight.
 */
export const MealsDayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { loading, loadError, reload, today, prefs, rules, updatePrefs, dayFor, saveDay, newId, closeApp } =
    useMeals();
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const date = route.params?.date ?? today;
  const isToday = date === today;
  const isRoot = !route.params?.date;
  const [editing, setEditing] = useState<Editing | null>(null);

  const day = dayFor(date);
  const dayRules = rulesForDay(date, today, day, rules);
  const score = useMemo(() => scoreDay(day, dayRules, isSettled(date, today, day)), [day, dayRules, date, today]);
  const closed = !!day.closed_at;
  const locked = closed;

  useLayoutEffect(() => {
    navigation.setOptions({
      // The screen draws its own large title (the day).
      title: '',
      headerLeft: isRoot
        ? () => (
            <TouchableOpacity onPress={closeApp} style={mls.headerIconBtn} accessibilityLabel="Close Meals">
              <Ionicons name="close" size={24} color={Colors.dark} />
            </TouchableOpacity>
          )
        : undefined,
      headerRight: isRoot
        ? () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => navigation.navigate('MealsWeek')}
                style={mls.headerIconBtn}
                accessibilityLabel="This week"
              >
                <Ionicons name="calendar-outline" size={21} color={Colors.dark} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('MealsSettings')}
                style={mls.headerIconBtn}
                accessibilityLabel="Meals settings"
              >
                <Ionicons name="settings-outline" size={22} color={Colors.dark} />
              </TouchableOpacity>
            </View>
          )
        : undefined,
    });
  }, [navigation, isRoot, isToday, date, today, closeApp]);

  if (loading) {
    return (
      <View style={[mls.screen, styles.center]}>
        <ActivityIndicator color={MEALS_ACCENT} />
      </View>
    );
  }

  /** A new plate with no id, or the one logged under `plateId`. */
  const openPlate = (plateId?: string) => {
    if (locked) return;
    const plate = plateId ? platesOf(day).find((p) => p.id === plateId) : undefined;
    setEditing({
      plateId: plate?.id,
      title: plate ? plateTitle(plate.name) : t('meals.day.logMeal', 'Log a meal'),
      groups: plate?.groups ?? [],
      name: plate?.name,
      loggedAt: plate?.logged_at,
      // A new plate starts at the clock time now, on this sheet's day.
      time: plate ? clockTime(plate.logged_at) : clockTime(new Date()),
    });
  };

  // The time is the sheet's, on this day; an unchanged one keeps its stamp.
  const save = (groups: FoodGroupId[], name: string | undefined, time: string) => {
    if (!editing) return;
    const logged_at = plateStamp(date, time, editing.loggedAt);
    saveDay(withPlate(day, { id: editing.plateId ?? newId(), name, groups, logged_at }));
    setEditing(null);
  };

  const remove = () => {
    if (editing?.plateId) saveDay(withoutPlate(day, editing.plateId));
    setEditing(null);
  };

  const reopen = () =>
    showConfirm(
      t('meals.day.reopen.title', 'Reopen today?'),
      day.handed_off_at
        ? t('meals.day.reopen.messageRated', 'You can change your meals, then close it out again. Today’s already rated, so it won’t be rated twice.')
        : t('meals.day.reopen.message', 'You can change your meals, then close it out again.'),
      () => saveDay(reopenDay(day)),
      t('meals.day.reopen.confirm', 'Reopen')
    );

  const reason = MEAL_OFF_REASONS.find((r) => r.id === day.off_reason_id);

  const weekday = new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' });
  const showClose = isToday && !closed && score.scoredCount > 0;

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={[mls.scroll, showClose && { paddingBottom: 120 + insets.bottom }]}>
        <LargeTitle title={weekday} eyebrow={isToday ? t('meals.day.today', 'Today') : undefined} />

        {!!loadError && (
          <TouchableOpacity style={mls.card} onPress={reload}>
            <Copy id="meals.day.loadFail" style={mls.body}>Couldn’t load your meals. Tap to try again.</Copy>
          </TouchableOpacity>
        )}

        {isRoot && !prefs.intro_seen && (
          <View style={[mls.card, styles.intro]}>
            <Copy id="meals.day.intro.title" style={mls.title}>How Meals works</Copy>
            <Copy id="meals.day.intro.log" style={styles.introText}>
              Whenever you eat, log it and tap the food groups that were on the plate. Every food group has a score, and a plate scores their average.
            </Copy>
            <Copy id="meals.day.intro.goal" style={styles.introText}>
              What are you eating for? It sets the scores. You can change it later.
            </Copy>
            <View style={mls.chipRow}>
              {MEAL_GOALS.map((g) => {
                const active = (prefs.goal ?? 'balanced') === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[mls.chip, active && mls.chipActive]}
                    onPress={() => updatePrefs({ goal: g.id, score_overrides: {} })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[mls.chipText, active && mls.chipTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Copy id="meals.day.intro.target" style={styles.introText} vars={{ target: prefs.scoring.on_target_threshold }}>
              {'Your day is on target if your plates average {target} or more. Close it out at night, or it closes on its own at midnight.'}
            </Copy>
            <View style={styles.introRow}>
              <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true })} style={styles.introBtn}>
                <Copy id="meals.day.intro.gotIt" style={mls.link}>Got it</Copy>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsSettings')} style={styles.introBtn}>
                <Copy id="meals.day.intro.settings" style={mls.link}>Settings</Copy>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={styles.introBtn}>
                <Copy id="meals.day.intro.whatCounts" style={mls.link}>What counts</Copy>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <DayStatusCard score={score} threshold={dayRules.scoring.on_target_threshold} />

        {closed && (
          <View style={[mls.card, styles.closed]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.gray} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.introText}>
                {day.habit_id ? t('meals.day.closedChecked', 'Closed and checked off.') : t('meals.day.closed', 'Closed.')}
                {reason
                  ? t('meals.day.closedReason', ' What got in the way: {reason}.', { reason: reason.label.toLowerCase() })
                  : ''}
              </Text>
              {canReopen(day) && isToday && (
                <TouchableOpacity onPress={reopen} style={styles.introBtn}>
                  <Copy id="meals.day.reopen" style={mls.link}>Reopen today</Copy>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <ListGroup
          title={isToday ? t('meals.day.todaysMeals', 'Today’s meals') : t('meals.day.meals', 'Meals')}
          footer={locked ? undefined : t('meals.day.footer', 'Snacks and drinks too. Each one is saved with the time.')}
        >
          {[
            ...score.items.map((item) => (
              <PlateRow key={item.key} item={item} onPress={locked ? undefined : () => openPlate(item.key)} />
            )),
            ...(locked
              ? score.items.length === 0
                ? [<ListRow key="none" title={t('meals.day.nothingLogged', 'Nothing logged')} />]
                : []
              : [
                  <ListRow
                    key="add"
                    title={t('meals.day.logMeal', 'Log a meal')}
                    tint="accent"
                    chevron={false}
                    right={<Ionicons name="add" size={20} color={MEALS_ACCENT} />}
                    onPress={() => openPlate()}
                  />,
                ]),
          ]}
        </ListGroup>

        <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={mls.linkBtn}>
          <Copy id="meals.day.whatCounts" style={mls.link}>What counts as what?</Copy>
        </TouchableOpacity>

        {!isToday && !closed && (
          <Copy id="meals.day.pastDay" style={[mls.muted, styles.centerText]}>
            This day closed at midnight. You can still add a meal you forgot; it counts toward your week.
          </Copy>
        )}
      </ScrollView>

      {showClose && (
        <View style={[mls.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <TouchableOpacity
            style={mls.secondaryBtn}
            onPress={() => navigation.navigate('MealsClose')}
            accessibilityRole="button"
          >
            <Copy id="meals.day.closeOut" style={mls.secondaryBtnText}>Close out the day</Copy>
          </TouchableOpacity>
        </View>
      )}

      <MealPickerModal
        target={editing}
        rules={dayRules}
        offered={activeCustomGroups(prefs.custom_groups)}
        onCancel={() => setEditing(null)}
        onSave={save}
        onRemove={remove}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  intro: { gap: Spacing.sm },
  introText: { ...TextStyles.subhead, color: Colors.dark },
  introRow: { flexDirection: 'row', gap: Spacing.lg },
  introBtn: { minHeight: 44, justifyContent: 'center' },
  closed: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
});

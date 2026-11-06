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
  isSettled,
  platesOf,
  reopenDay,
  rulesForDay,
  scoreDay,
  withPlate,
  withoutPlate,
} from '../../../../services/mealsMath';
import { MEAL_OFF_REASONS } from '../../../../data/mealGroups';
import { showConfirm } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MealPickerModal, PickerTarget } from './components/MealPickerModal';
import { DayStatusCard, PlateRow, plateTitle } from './components/MealsParts';
import { MEALS_ACCENT, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsDay'>;

type Editing = PickerTarget & { plateId?: string };

/**
 * One day of meals — today by default, or a past day of this week opened from
 * the week view. Log a meal (or a snack, or a drink) whenever you eat: tap
 * what was on the plate, and it's saved with the time. Close out today when
 * the eating's done, or it closes on its own at midnight.
 */
export const MealsDayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { loading, loadError, reload, today, prefs, rules, updatePrefs, dayFor, saveDay, newId, closeApp } =
    useMeals();
  const insets = useSafeAreaInsets();
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

  const stamp = () => new Date().toISOString();

  /** A new plate with no id, or the one logged under `plateId`. */
  const openPlate = (plateId?: string) => {
    if (locked) return;
    const plate = plateId ? platesOf(day).find((p) => p.id === plateId) : undefined;
    setEditing({
      plateId: plate?.id,
      title: plate ? plateTitle(plate.name) : 'Log a meal',
      groups: plate?.groups ?? [],
      name: plate?.name,
      loggedAt: plate?.logged_at,
    });
  };

  // An edited plate keeps the time it was first logged.
  const save = (groups: FoodGroupId[], name?: string) => {
    if (!editing) return;
    saveDay(withPlate(day, { id: editing.plateId ?? newId(), name, groups, logged_at: editing.loggedAt ?? stamp() }));
    setEditing(null);
  };

  const remove = () => {
    if (editing?.plateId) saveDay(withoutPlate(day, editing.plateId));
    setEditing(null);
  };

  const reopen = () =>
    showConfirm(
      'Reopen today?',
      day.handed_off_at
        ? 'You can change your meals, then close it out again. Today’s already rated, so it won’t be rated twice.'
        : 'You can change your meals, then close it out again.',
      () => saveDay(reopenDay(day)),
      'Reopen'
    );

  const reason = MEAL_OFF_REASONS.find((r) => r.id === day.off_reason_id);

  const weekday = new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' });
  const showClose = isToday && !closed && score.scoredCount > 0;

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={[mls.scroll, showClose && { paddingBottom: 120 + insets.bottom }]}>
        <LargeTitle title={weekday} eyebrow={isToday ? 'Today' : undefined} />

        {!!loadError && (
          <TouchableOpacity style={mls.card} onPress={reload}>
            <Text style={mls.body}>Couldn’t load your meals. Tap to try again.</Text>
          </TouchableOpacity>
        )}

        {isRoot && !prefs.intro_seen && (
          <View style={[mls.card, styles.intro]}>
            <Text style={mls.title}>How Meals works</Text>
            <Text style={styles.introText}>
              Whenever you eat, log it and tap the food groups that were on the plate. Each plate scores 0 to
              100: mostly whole food scores high, and anything Processed costs points on top of that.
            </Text>
            <Text style={styles.introText}>
              Your day is on target if your plates average {prefs.scoring.on_target_threshold} or more. Close it
              out at night, or it closes on its own at midnight.
            </Text>
            <View style={styles.introRow}>
              <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true })} style={styles.introBtn}>
                <Text style={mls.link}>Got it</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsSettings')} style={styles.introBtn}>
                <Text style={mls.link}>Set my goal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={styles.introBtn}>
                <Text style={mls.link}>What counts</Text>
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
                {day.habit_id ? 'Closed and checked off.' : 'Closed.'}
                {reason ? ` What got in the way: ${reason.label.toLowerCase()}.` : ''}
              </Text>
              {canReopen(day) && isToday && (
                <TouchableOpacity onPress={reopen} style={styles.introBtn}>
                  <Text style={mls.link}>Reopen today</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <ListGroup
          title={isToday ? 'Today’s meals' : 'Meals'}
          footer={locked ? undefined : 'Snacks and drinks too. Each one is saved with the time.'}
        >
          {[
            ...score.items.map((item) => (
              <PlateRow key={item.key} item={item} onPress={locked ? undefined : () => openPlate(item.key)} />
            )),
            ...(locked
              ? score.items.length === 0
                ? [<ListRow key="none" title="Nothing logged" />]
                : []
              : [
                  <ListRow
                    key="add"
                    title="Log a meal"
                    tint="accent"
                    chevron={false}
                    right={<Ionicons name="add" size={20} color={MEALS_ACCENT} />}
                    onPress={() => openPlate()}
                  />,
                ]),
          ]}
        </ListGroup>

        <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={mls.linkBtn}>
          <Text style={mls.link}>What counts as what?</Text>
        </TouchableOpacity>

        {!isToday && !closed && (
          <Text style={[mls.muted, styles.centerText]}>
            This day closed at midnight. You can still add a meal you forgot; it counts toward your week.
          </Text>
        )}
      </ScrollView>

      {showClose && (
        <View style={[mls.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <TouchableOpacity
            style={mls.secondaryBtn}
            onPress={() => navigation.navigate('MealsClose')}
            accessibilityRole="button"
          >
            <Text style={mls.secondaryBtnText}>Close out the day</Text>
          </TouchableOpacity>
        </View>
      )}

      <MealPickerModal
        target={editing}
        strict={dayRules.strict}
        weights={dayRules.scoring}
        custom={dayRules.custom_groups}
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

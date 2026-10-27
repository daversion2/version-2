import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing } from '../../../../constants/theme';
import type { FoodGroupId, MealsStackParamList } from '../../../../types/meals';
import {
  canReopen,
  recentPlates,
  reopenDay,
  rulesForDay,
  scoreDay,
  withExtra,
  withMeal,
  withoutExtra,
} from '../../../../services/mealsMath';
import { MEAL_OFF_REASONS } from '../../../../data/mealGroups';
import { showConfirm } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MealPickerModal, PickerTarget } from './components/MealPickerModal';
import { DayStatusCard, PlateRow } from './components/MealsParts';
import { MEALS_ACCENT, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsDay'>;

type Editing = PickerTarget & { slotId?: string; extraId?: string };

const dayLabel = (date: string, today: string): string => {
  if (date === today) return 'Today';
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' });
};

/**
 * One day of meals — today by default, or a past day of this week opened from
 * the week view. Tap a meal to log what was on the plate; add a snack or drink
 * as "something additional"; close out today when the eating's done.
 */
export const MealsDayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { loading, loadError, reload, today, prefs, rules, updatePrefs, dayFor, recentDays, saveDay, newId, closeApp } =
    useMeals();
  const date = route.params?.date ?? today;
  const isToday = date === today;
  const isRoot = !route.params?.date;
  const [editing, setEditing] = useState<Editing | null>(null);

  const day = dayFor(date);
  const dayRules = rulesForDay(date, today, day, rules);
  const score = useMemo(() => scoreDay(day, dayRules), [day, dayRules]);
  const closed = !!day.closed_at;
  const recent = useMemo(
    () =>
      !editing
        ? []
        : recentPlates(
            recentDays,
            editing.kind === 'meal' && editing.slotId ? { kind: 'meal', slotId: editing.slotId } : { kind: 'extra' }
          ),
    [editing, recentDays]
  );
  const locked = closed;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isToday ? 'Meals' : dayLabel(date, today),
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

  const openMeal = (slotId: string, name: string) => {
    if (locked) return;
    const entry = day.meals[slotId];
    setEditing({
      kind: 'meal',
      slotId,
      title: name,
      groups: entry?.groups ?? [],
      existing: !!entry,
    });
  };

  const openExtra = (extraId?: string) => {
    if (locked) return;
    const extra = extraId ? day.extras.find((e) => e.id === extraId) : undefined;
    setEditing({
      kind: 'extra',
      extraId: extra?.id,
      title: extra?.name || 'Something additional',
      groups: extra?.groups ?? [],
      name: extra?.name,
      existing: !!extra,
    });
  };

  const save = (groups: FoodGroupId[], name?: string) => {
    if (!editing) return;
    if (editing.kind === 'meal' && editing.slotId) {
      saveDay(withMeal(day, editing.slotId, { groups, logged_at: stamp() }));
    } else {
      saveDay(withExtra(day, { id: editing.extraId ?? newId(), name, groups, logged_at: stamp() }));
    }
    setEditing(null);
  };

  const skip = () => {
    if (editing?.slotId) saveDay(withMeal(day, editing.slotId, { skipped: true, logged_at: stamp() }));
    setEditing(null);
  };

  const remove = () => {
    if (!editing) return;
    if (editing.kind === 'meal' && editing.slotId) saveDay(withMeal(day, editing.slotId, null));
    if (editing.kind === 'extra' && editing.extraId) saveDay(withoutExtra(day, editing.extraId));
    setEditing(null);
  };

  const reopen = () =>
    showConfirm('Reopen today?', 'You can change your meals, then close it out again.', () => saveDay(reopenDay(day)), 'Reopen');

  const meals = score.items.filter((i) => i.kind === 'meal');
  const extras = score.items.filter((i) => i.kind === 'extra');
  const reason = MEAL_OFF_REASONS.find((r) => r.id === day.off_reason_id);

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={mls.scroll}>
        {!!loadError && (
          <TouchableOpacity style={mls.card} onPress={reload}>
            <Text style={mls.body}>Couldn’t load your meals. Tap to try again.</Text>
          </TouchableOpacity>
        )}

        {isRoot && !prefs.intro_seen && (
          <View style={[mls.card, styles.intro]}>
            <Text style={mls.title}>How Meals works</Text>
            <Text style={mls.body}>
              Tap a meal and pick the food groups that were on the plate. Each plate scores 0 to 100 — mostly
              whole food scores high, and anything Processed costs points on top of that.
            </Text>
            <Text style={mls.body}>
              Your day is on target once your plates average {prefs.scoring.on_target_threshold} or more.
            </Text>
            <View style={styles.introRow}>
              <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true })}>
                <Text style={mls.link}>Got it</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsSettings')}>
                <Text style={mls.link}>Set my goal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')}>
                <Text style={mls.link}>What counts</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <DayStatusCard score={score} dateLabel={dayLabel(date, today)} threshold={dayRules.scoring.on_target_threshold} />

        {closed && (
          <View style={[mls.card, styles.closed]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.gray} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={mls.body}>
                {day.habit_id ? 'Closed and checked off.' : 'Closed.'}
                {reason ? ` What got in the way: ${reason.label.toLowerCase()}.` : ''}
              </Text>
              {canReopen(day) && isToday && (
                <TouchableOpacity onPress={reopen}>
                  <Text style={mls.link}>Reopen today</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={mls.sectionLabel}>{isToday ? 'Today’s meals' : 'Meals'}</Text>
        {meals.map((item) => (
          <PlateRow
            key={item.key}
            item={item}
            onPress={locked ? undefined : () => openMeal(item.key, item.name)}
          />
        ))}

        <Text style={mls.sectionLabel}>Something additional</Text>
        {extras.length === 0 && <Text style={mls.muted}>Snacks and drinks on top of your meals go here.</Text>}
        {extras.map((item) => (
          <PlateRow key={item.key} item={item} compact onPress={locked ? undefined : () => openExtra(item.key)} />
        ))}
        {!locked && (
          <TouchableOpacity style={styles.addExtra} onPress={() => openExtra()} accessibilityRole="button">
            <Ionicons name="add" size={18} color={MEALS_ACCENT} />
            <Text style={mls.link}>Add something</Text>
          </TouchableOpacity>
        )}

        {isToday && !closed && (
          <TouchableOpacity
            style={[mls.primaryBtn, styles.closeBtn]}
            onPress={() => navigation.navigate('MealsClose')}
            accessibilityRole="button"
          >
            <Text style={mls.primaryBtnText}>Close out the day</Text>
          </TouchableOpacity>
        )}
        {!isToday && !closed && (
          <Text style={[mls.muted, styles.centerText]}>
            Past days count toward your week. Only today can be closed out and checked off.
          </Text>
        )}
      </ScrollView>

      <MealPickerModal
        target={editing}
        strict={dayRules.strict}
        weights={dayRules.scoring}
        recent={recent}
        onCancel={() => setEditing(null)}
        onSave={save}
        onSkip={editing?.kind === 'meal' ? skip : undefined}
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
  introRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: 2 },
  closed: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  addExtra: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  closeBtn: { marginTop: Spacing.md },
});

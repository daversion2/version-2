import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getHabitCategory } from '../../data/habitLibrary';
import { getHabitDefinition } from '../../data/practices';
import { defaultTimeForAnchor } from '../../data/anchors';
import { useAuth } from '../../context/AuthContext';
import { createHabit, updateHabit } from '../../services/practices';
import { syncHabitReminder } from '../../services/habitReminders';
import { HabitActionPlan } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = HomeScreenProps<'HabitLibraryDetail'>;

// The action-plan fields shown on this screen, in order. `multiline` controls the
// editor height; `fallbackKey` lets older data (`cue`) surface as the anchor.
const ACTION_PLAN_FIELDS: {
  key: keyof HabitActionPlan;
  label: string;
  placeholder: string;
  multiline?: boolean;
  fallbackKey?: keyof HabitActionPlan;
  pairingOnly?: boolean;
}[] = [
  { key: 'anchor', label: 'After I…', placeholder: 'e.g. have my morning coffee', fallbackKey: 'cue' },
  { key: 'pairing', label: 'Pair it with', placeholder: 'e.g. a podcast or playlist', pairingOnly: true },
  { key: 'environment_change', label: 'Environment tweak', placeholder: 'e.g. lay my kit out the night before', multiline: true },
  { key: 'obstacle_plan', label: 'Obstacle plan', placeholder: "e.g. if I'm tired, I do the minimum version", multiline: true },
  { key: 'minimum_version', label: 'Minimum version', placeholder: 'e.g. just two minutes', multiline: true },
  { key: 'accountability_person', label: 'Accountability', placeholder: 'e.g. text my partner each Sunday', multiline: true },
];

const DEFAULT_REMINDER_TIME = '09:00';

const timeToDate = (hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return new Date(2000, 0, 1, Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m);
};

const formatTime = (hhmm: string): string => {
  try {
    const [h, m] = hhmm.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return hhmm;
  }
};

export const HabitLibraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId } = route.params;
  const { user } = useAuth();

  // Resolves against the UNIFIED catalog, so this one screen now serves both a
  // plain library habit and a curated practice — and follows SUPERSEDED_HABIT_IDS,
  // so a link to a deduped id still lands somewhere real.
  const habit = getHabitDefinition(habitId);

  // Editable copies of everything the user can make their own, seeded from the
  // library template. `editing` flips the preview cards into inputs.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit?.name ?? '');
  const [target, setTarget] = useState(habit?.suggested_target_per_week ?? 5);
  const [plan, setPlan] = useState<HabitActionPlan>(habit?.action_plan ?? {});

  const seededTime = defaultTimeForAnchor(habit?.action_plan?.anchor);
  const [reminderEnabled, setReminderEnabled] = useState(!!seededTime);
  const [reminderTime, setReminderTime] = useState(seededTime ?? DEFAULT_REMINDER_TIME);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [adding, setAdding] = useState(false);

  if (!habit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Practice not found.</Text>
      </View>
    );
  }

  const category = getHabitCategory(habit.category_id);
  const color = category?.color ?? Colors.primary;
  const supportsPairing = !!habit.action_plan?.pairing;

  const fields = ACTION_PLAN_FIELDS.filter((f) => !f.pairingOnly || supportsPairing);

  const setPlanField = (key: keyof HabitActionPlan, value: string) =>
    setPlan((prev) => ({ ...prev, [key]: value }));

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && selected) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mm = String(selected.getMinutes()).padStart(2, '0');
      setReminderTime(`${hh}:${mm}`);
    }
    if (Platform.OS === 'ios' && event.type === 'dismissed') setShowTimePicker(false);
  };

  const handleAdd = async () => {
    if (!user) return;
    const finalName = name.trim() || habit.name;
    setAdding(true);
    try {
      // Persist only the action-plan fields the user actually filled in.
      const cleanedPlan: HabitActionPlan = {};
      (Object.keys(plan) as (keyof HabitActionPlan)[]).forEach((k) => {
        const v = plan[k];
        if (typeof v === 'string' && v.trim()) cleanedPlan[k] = v.trim();
      });

      const newHabitId = await createHabit(user.uid, {
        name: finalName,
        target_count_per_week: target,
        arena_id: habit.arena_id,
        // Link back to the catalog definition. Without this the adopted habit
        // resolves to nothing, so it would lose its tracking template, its
        // session flow and its science page the moment it lands on Home.
        practice_id: habit.id,
        category_id: habit.category_id,
        action_plan: cleanedPlan,
        created_by_user: false,
        supports_pairing: supportsPairing,
      });

      // Carry the reminder when enabled (or there's an anchor to fire it against).
      if (reminderEnabled || cleanedPlan.anchor) {
        await updateHabit(user.uid, newHabitId, {
          reminder: { time: reminderTime, enabled: reminderEnabled },
        });
        try {
          await syncHabitReminder(user.uid, newHabitId, undefined);
        } catch (err) {
          console.warn('Habit reminder sync failed:', err);
        }
      }

      // Land on Today so the newly added habit is visible immediately. This
      // screen now lives in the Library TAB, where 'ManageHabits' is not a
      // route — navigating to it here would silently do nothing.
      navigation.getParent()?.navigate('Home');
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header chips: category + arena */}
        <View style={styles.chipRow}>
          {category && (
            <View style={[styles.categoryChip, { backgroundColor: color + '1A', marginBottom: 0 }]}>
              <Ionicons name={category.icon as any} size={13} color={color} />
              <Text style={[styles.categoryText, { color }]}>{category.name}</Text>
            </View>
          )}
        </View>

        {editing ? (
          <>
            <Text style={styles.fieldLabel}>Practice name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder={habit.name}
              placeholderTextColor={Colors.gray}
            />
          </>
        ) : (
          <Text style={styles.habitName}>{name}</Text>
        )}

        <Text style={styles.description}>{habit.description}</Text>

        {/* Identity framing */}
        {!!habit.identity && (
          <View style={[styles.identityCard, { borderLeftColor: color }]}>
            <Text style={styles.identityText}>{habit.identity}</Text>
          </View>
        )}

        {/*
          The science. This is the half of the merge that makes "every habit has
          a page explaining what it does to your brain" literally true — it used
          to exist only on the separate practice detail screen. Every section
          hides when the habit has not had it authored.
        */}
        {!!habit.whyItWorks && (
          <View style={[styles.whyCard, { borderLeftColor: color }]}>
            <Text style={styles.whyText}>{habit.whyItWorks}</Text>
          </View>
        )}

        {!!habit.science && (
          <View style={styles.scienceBlock}>
            <Text style={styles.scienceHeading}>What this does to your brain</Text>
            <Text style={styles.scienceBody}>{habit.science}</Text>
          </View>
        )}

        {!!habit.research?.length && (
          <View style={styles.scienceBlock}>
            <Text style={styles.scienceHeading}>The research</Text>
            {habit.research.map((entry, i) => (
              <View key={i} style={styles.researchRow}>
                <Text style={styles.researchFinding}>{entry.finding}</Text>
                <TouchableOpacity
                  disabled={!entry.url}
                  onPress={() => entry.url && Linking.openURL(entry.url)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.researchSource, !!entry.url && { color }]}>
                    {entry.source}
                    {entry.url ? '  ↗' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!!habit.tips?.length && (
          <View style={styles.scienceBlock}>
            <Text style={styles.scienceHeading}>Tips</Text>
            {habit.tips.map((tip, i) => {
              const caution = tip.startsWith('CAUTION');
              return (
                <View key={i} style={styles.tipRow}>
                  <Ionicons
                    name={caution ? 'warning-outline' : 'ellipse'}
                    size={caution ? 16 : 6}
                    color={caution ? Colors.secondary : Colors.gray}
                    style={styles.tipDot}
                  />
                  <Text style={[styles.tipText, caution && { color: Colors.secondary }]}>
                    {caution ? tip.replace(/^CAUTION:\s*/, '') : tip}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Frequency */}
        {editing ? (
          <View style={styles.freqEditRow}>
            <Text style={styles.fieldLabel}>Times per week</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setTarget((t) => Math.max(1, t - 1))}
                hitSlop={8}
              >
                <Ionicons name="remove" size={18} color={Colors.dark} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{target}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setTarget((t) => Math.min(7, t + 1))}
                hitSlop={8}
              >
                <Ionicons name="add" size={18} color={Colors.dark} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.freqRow}>
            <Ionicons name="repeat-outline" size={16} color={Colors.gray} />
            <Text style={styles.freqText}>{target}× per week</Text>
          </View>
        )}

        {/* Action Plan header + edit toggle */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Action Plan</Text>
          <TouchableOpacity
            style={styles.editToggle}
            onPress={() => setEditing((e) => !e)}
            hitSlop={8}
          >
            <Ionicons
              name={editing ? 'checkmark' : 'create-outline'}
              size={16}
              color={color}
            />
            <Text style={[styles.editToggleText, { color }]}>
              {editing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>
          {editing
            ? 'Tweak any of these to make the habit your own. You can change them later too.'
            : 'These come pre-filled. Tap Edit to personalise them before adding.'}
        </Text>

        {editing ? (
          <>
            {fields.map(({ key, label, placeholder, multiline, fallbackKey }) => {
              const value =
                (plan[key] as string) ??
                (fallbackKey ? (plan[fallbackKey] as string) : '') ??
                '';
              return (
                <View key={key} style={styles.editField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
                    value={value}
                    onChangeText={(t) => setPlanField(key, t)}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray}
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                  />
                </View>
              );
            })}

            {/* Reminder */}
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderLabel}>🔔 Daily reminder</Text>
                {reminderEnabled ? (
                  <TouchableOpacity onPress={() => setShowTimePicker((s) => !s)} activeOpacity={0.7}>
                    <Text style={[styles.reminderTime, { color }]}>
                      at {formatTime(reminderTime)} · change
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.reminderOff}>Off</Text>
                )}
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(v) => {
                  setReminderEnabled(v);
                  if (!v) setShowTimePicker(false);
                }}
                trackColor={{ true: color }}
              />
            </View>
            {showTimePicker && reminderEnabled && (
              <DateTimePickerNative
                value={timeToDate(reminderTime)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}
          </>
        ) : (
          fields.map(({ key, label, fallbackKey }) => {
            const value =
              (plan[key] as string) || (fallbackKey ? (plan[fallbackKey] as string) : undefined);
            if (!value) return null;
            return (
              <Card key={key} style={styles.planCard}>
                <Text style={styles.planLabel}>{label}</Text>
                <Text style={styles.planValue}>{value}</Text>
              </Card>
            );
          })
        )}

        {/* Add button */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: color }, adding && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
              <Text style={styles.addBtnText}>Add to My Practices</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  nameInput: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  identityCard: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  identityText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    fontStyle: 'italic',
    color: Colors.dark,
    lineHeight: 22,
  },
  // ---- Science sections (merged in from the old practice detail screen) ----
  whyCard: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  whyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
  scienceBlock: { marginBottom: Spacing.lg },
  scienceHeading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  scienceBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 23,
  },
  researchRow: { marginBottom: Spacing.md, gap: 4 },
  researchFinding: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  researchSource: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipDot: { marginTop: 6 },
  tipText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  freqText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  freqEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minWidth: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  goalTitle: {
    marginTop: Spacing.lg,
  },
  editToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editToggleText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
  },
  sectionSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  planCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  planLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  editField: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  fieldInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  fieldInputMultiline: {
    minHeight: 72,
    lineHeight: 22,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  reminderTime: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  reminderOff: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

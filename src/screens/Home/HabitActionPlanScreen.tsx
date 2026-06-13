import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { updateHabit } from '../../services/habits';
import { syncHabitReminder } from '../../services/habitReminders';
import { HabitActionPlan, Nudge } from '../../types';
import { ANCHORS, findAnchorByPhrase, defaultTimeForAnchor } from '../../data/anchors';

type Props = HomeScreenProps<'HabitActionPlan'>;

type StepKind = 'anchor' | 'pairing' | 'text';

interface StepDef {
  kind: StepKind;
  key: keyof HabitActionPlan;
  question: string;
  placeholder: string;
  scienceNote: string;
}

const ANCHOR_STEP: StepDef = {
  kind: 'anchor',
  key: 'anchor',
  question: 'After which daily routine will you do this?',
  placeholder: 'e.g. walk the dog, sit down at my desk',
  scienceNote:
    'Stacking a new habit onto an existing routine ("After I ___, I will ___") borrows a cue your brain already fires automatically — far more reliable than time of day alone.',
};

const PAIRING_STEP: StepDef = {
  kind: 'pairing',
  key: 'pairing',
  question: 'Want to pair this with something you enjoy?',
  placeholder: 'e.g. a podcast, my favorite playlist, a nice coffee',
  scienceNote:
    'Letting yourself enjoy a "want" only while doing a "should" — temptation bundling — makes you far more likely to actually start (Milkman et al.).',
};

const TEXT_STEPS: StepDef[] = [
  {
    kind: 'text',
    key: 'environment_change',
    question: "What's one thing you can change about your environment to make this easier?",
    placeholder: 'e.g. Put my journal on my nightstand the night before',
    scienceNote: 'Reducing friction and adding visible cues dramatically boosts habit completion rates.',
  },
  {
    kind: 'text',
    key: 'obstacle_plan',
    question: "What's your most likely obstacle, and what will you do when it shows up?",
    placeholder: "e.g. If I'm too tired after work, I'll do just 5 minutes instead of skipping",
    scienceNote: 'Pre-planning for obstacles (the WOOP method) significantly improves follow-through when life gets hard.',
  },
  {
    kind: 'text',
    key: 'minimum_version',
    question: "What's the smallest version of this habit you can do on a really hard day?",
    placeholder: 'e.g. Even just put on my shoes and step outside',
    scienceNote: 'A fallback habit prevents all-or-nothing thinking and protects your streak when motivation is low.',
  },
  {
    kind: 'text',
    key: 'accountability_person',
    question: 'Who can you tell about this habit for accountability?',
    placeholder: "e.g. I'll update my partner every Sunday on how the week went",
    scienceNote: 'Sharing your goal with a specific person raises follow-through rates by ~65%.',
  },
];

// Quick-pick temptation bundles. Pairing works best when the body is busy but the
// mind is free (walking, chores, cooking) — these are the most common "wants" to bundle.
const PAIRING_OPTIONS = [
  'a podcast or audiobook',
  'my favorite playlist',
  'a coffee or treat',
  'an episode of my show',
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

export const HabitActionPlanScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId, prefilled, afterSaveRoute, supportsPairing, reminder } = route.params;
  const { user } = useAuth();

  // Steps are built dynamically: the pairing step only appears for bundling-viable habits,
  // so an attention-demanding habit (meditation, reading) never sees it.
  const steps = useMemo<StepDef[]>(() => {
    const arr: StepDef[] = [ANCHOR_STEP];
    if (supportsPairing) arr.push(PAIRING_STEP);
    arr.push(...TEXT_STEPS);
    return arr;
  }, [supportsPairing]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<HabitActionPlan>(prefilled ?? {});
  const [saving, setSaving] = useState(false);

  // Anchor + reminder state, seeded from any prefilled anchor / existing reminder.
  const initialAnchorIsCustom = !!(prefilled?.anchor && !findAnchorByPhrase(prefilled.anchor));
  const [customAnchorMode, setCustomAnchorMode] = useState(initialAnchorIsCustom);
  const [reminderTime, setReminderTime] = useState(
    reminder?.time ?? defaultTimeForAnchor(prefilled?.anchor) ?? DEFAULT_REMINDER_TIME
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    reminder?.enabled ?? !!defaultTimeForAnchor(prefilled?.anchor)
  );
  const [showTimePicker, setShowTimePicker] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const currentValue = (answers[current.key] as string) ?? '';
  const progress = (step + 1) / steps.length;

  const setAnswer = (key: keyof HabitActionPlan, text: string) =>
    setAnswers((prev) => ({ ...prev, [key]: text }));

  const updateAnswer = (text: string) => setAnswer(current.key, text);

  const selectAnchorChip = (anchorKey: string) => {
    const anchor = ANCHORS.find((a) => a.key === anchorKey);
    if (!anchor) return;
    setCustomAnchorMode(false);
    setShowTimePicker(false);
    setAnswer('anchor', anchor.phrase);
    setReminderTime(anchor.defaultTime);
    setReminderEnabled(true); // curated anchors have a sensible default time, so default the reminder on
  };

  const chooseCustomAnchor = () => {
    setCustomAnchorMode(true);
    setAnswer('anchor', '');
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && selected) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mm = String(selected.getMinutes()).padStart(2, '0');
      setReminderTime(`${hh}:${mm}`);
    }
    if (Platform.OS === 'ios' && event.type === 'dismissed') setShowTimePicker(false);
  };

  const goNext = () => {
    if (isLast) {
      handleSave();
    } else {
      setShowTimePicker(false);
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[current.key];
      return next;
    });
    if (isLast) {
      handleSave();
    } else {
      setShowTimePicker(false);
      setStep((s) => s + 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Only persist non-empty answers
      const plan: HabitActionPlan = {};
      (Object.keys(answers) as (keyof HabitActionPlan)[]).forEach((k) => {
        const v = answers[k];
        if (typeof v === 'string' && v.trim()) plan[k] = v.trim();
      });

      const payload: Partial<Nudge> = { action_plan: plan };
      // Carry the reminder when there's an anchor to fire it against, or the user turned it on.
      if (plan.anchor || reminderEnabled) {
        payload.reminder = { time: reminderTime, enabled: reminderEnabled };
      }

      await updateHabit(user.uid, habitId, payload);

      // Schedule / cancel the on-device daily reminder. `reminder` (route param) is the
      // previous state, so its notificationId gets cancelled before rescheduling.
      try {
        await syncHabitReminder(user.uid, habitId, reminder);
      } catch (err) {
        console.warn('Habit reminder sync failed:', err);
      }

      if (afterSaveRoute) {
        (navigation as { navigate: (screen: string) => void }).navigate(afterSaveRoute);
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save action plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAll = () => {
    if (afterSaveRoute) {
      (navigation as { navigate: (screen: string) => void }).navigate(afterSaveRoute);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step counter */}
        <Text style={styles.stepCount}>
          Question {step + 1} of {steps.length}
        </Text>

        {/* Question */}
        <Text style={styles.question}>{current.question}</Text>

        {/* Science note */}
        <View style={styles.scienceCard}>
          <Text style={styles.scienceNote}>💡 {current.scienceNote}</Text>
        </View>

        {/* Body — depends on step kind */}
        {current.kind === 'anchor' ? (
          <View>
            <View style={styles.chipWrap}>
              {ANCHORS.map((a) => {
                const selected = !customAnchorMode && answers.anchor === a.phrase;
                return (
                  <TouchableOpacity
                    key={a.key}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => selectAnchorChip(a.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {a.emoji} {a.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, customAnchorMode && styles.chipSelected]}
                onPress={chooseCustomAnchor}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, customAnchorMode && styles.chipTextSelected]}>
                  ＋ My own
                </Text>
              </TouchableOpacity>
            </View>

            {customAnchorMode && (
              <TextInput
                style={styles.customInput}
                value={currentValue}
                onChangeText={updateAnswer}
                placeholder={current.placeholder}
                placeholderTextColor={Colors.gray}
                autoFocus
              />
            )}

            {!!answers.anchor && (
              <Text style={styles.anchorPreview}>
                After I <Text style={styles.anchorPreviewStrong}>{answers.anchor}</Text>, I&apos;ll do
                this habit.
              </Text>
            )}

            {/* Reminder */}
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderLabel}>🔔 Daily reminder</Text>
                {reminderEnabled ? (
                  <TouchableOpacity onPress={() => setShowTimePicker((s) => !s)} activeOpacity={0.7}>
                    <Text style={styles.reminderTime}>at {formatTime(reminderTime)} · change</Text>
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
                trackColor={{ true: Colors.primary }}
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
          </View>
        ) : current.kind === 'pairing' ? (
          <View>
            <View style={styles.chipWrap}>
              {PAIRING_OPTIONS.map((opt) => {
                const selected = answers.pairing === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setAnswer('pairing', selected ? '' : opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.customInput}
              value={currentValue}
              onChangeText={updateAnswer}
              placeholder={current.placeholder}
              placeholderTextColor={Colors.gray}
            />
          </View>
        ) : (
          <TextInput
            style={styles.textInput}
            value={currentValue}
            onChangeText={updateAnswer}
            placeholder={current.placeholder}
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        )}

        {/* Skip this question */}
        <TouchableOpacity onPress={skip} style={styles.skipQuestion}>
          <Text style={styles.skipQuestionText}>Skip this question →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.nextBtnText}>{isLast ? 'Save Plan' : 'Next'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkipAll} style={styles.skipAll}>
          <Text style={styles.skipAllText}>Skip — I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  stepCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  question: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.md,
  },
  scienceCard: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scienceNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 120,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  // Chip pickers (anchor + pairing)
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  chipTextSelected: {
    fontFamily: Fonts.primaryBold,
    color: Colors.primary,
  },
  customInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  anchorPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  anchorPreviewStrong: {
    fontFamily: Fonts.primaryBold,
    color: Colors.dark,
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
    color: Colors.primary,
    marginTop: 2,
  },
  reminderOff: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  skipQuestion: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  skipQuestionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  skipAll: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  skipAllText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

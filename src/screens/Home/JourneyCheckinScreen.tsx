import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { CheckinScaleRow } from '../../components/checkin/CheckinScaleRow';
import { useAuth } from '../../context/AuthContext';
import {
  CHECKIN_METRICS,
  CHECKIN_SCALE_LOW,
  CHECKIN_SCALE_HIGH,
  CHECKIN_SLOT_LABELS,
  CheckinSlot,
  JourneyCheckin,
  journeyDayFor,
  saveJourneyCheckin,
  slotForJourneyDay,
} from '../../services/checkins';

/**
 * The day-14 / day-28 retake of the onboarding baseline check-in. Reached via
 * the journey rules ("Two weeks in. Notice anything?"). Asks the same three
 * 1–5 questions, then shows the trajectory against the baseline — the receipt
 * for onboarding's "two to four weeks" promise.
 */
export const JourneyCheckinScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, userProfile, refreshProfile } = useAuth();

  const slot: CheckinSlot = useMemo(
    () => slotForJourneyDay(journeyDayFor(userProfile?.created_at)),
    [userProfile?.created_at]
  );
  const checkins = (userProfile?.journey_checkins ?? {}) as Record<string, JourneyCheckin>;
  const alreadyAnswered = !!checkins[slot];

  const [answers, setAnswers] = useState<{
    mood: number | null;
    focus: number | null;
    motivation: number | null;
  }>({ mood: null, focus: null, motivation: null });
  const [saved, setSaved] = useState<JourneyCheckin | null>(null);
  const [saving, setSaving] = useState(false);

  const complete = answers.mood !== null && answers.focus !== null && answers.motivation !== null;
  const showResults = alreadyAnswered || saved !== null;

  const handleSave = async () => {
    if (!user || !complete) return;
    setSaving(true);
    try {
      const record = await saveJourneyCheckin(user.uid, slot, {
        mood: answers.mood!,
        focus: answers.focus!,
        motivation: answers.motivation!,
      });
      setSaved(record);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Results: baseline → day14 → day28 per metric ----

  const renderResults = () => {
    const current = saved ?? checkins[slot];
    const slots: CheckinSlot[] = ['baseline', 'day14', 'day28'];
    const recorded = slots.filter((s) => (s === slot ? current : checkins[s]));
    const valueFor = (s: CheckinSlot) => (s === slot ? current : checkins[s]);
    const baseline = checkins.baseline;

    return (
      <>
        <Text style={styles.title}>Your trajectory</Text>
        <Text style={styles.subtitle}>
          {baseline
            ? 'Same three questions, answered over time. This is your own data — not our word for it.'
            : 'No day-0 baseline on record, so this take becomes your reference point.'}
        </Text>

        {CHECKIN_METRICS.map((metric) => {
          const currentValue = current[metric.key];
          const delta = baseline ? currentValue - baseline[metric.key] : null;
          return (
            <View key={metric.key} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>{metric.label}</Text>
                {delta !== null && (
                  <View
                    style={[
                      styles.deltaBadge,
                      delta > 0 && styles.deltaUp,
                      delta < 0 && styles.deltaFlat,
                    ]}
                  >
                    <Text style={[styles.deltaText, delta > 0 && styles.deltaTextUp]}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? '±0' : `${delta}`}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.timeline}>
                {recorded.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && (
                      <Ionicons name="arrow-forward" size={14} color={Colors.gray} />
                    )}
                    <View style={styles.timelinePoint}>
                      <Text style={styles.timelineValue}>{valueFor(s)![metric.key]}</Text>
                      <Text style={styles.timelineLabel}>{CHECKIN_SLOT_LABELS[s]}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          );
        })}

        <Button
          title="Back to training"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
      </>
    );
  };

  // ---- Questions ----

  const renderQuestions = () => (
    <>
      <Text style={styles.title}>
        {slot === 'day28' ? 'Four weeks in. Take stock.' : 'Two weeks in. Take stock.'}
      </Text>
      <Text style={styles.subtitle}>
        The same three questions from day one. Answer honestly — you'll see them side by side.
      </Text>

      {CHECKIN_METRICS.map((metric) => (
        <CheckinScaleRow
          key={metric.key}
          label={metric.label}
          value={answers[metric.key]}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [metric.key]: v }))}
          lowLabel={CHECKIN_SCALE_LOW}
          highLabel={CHECKIN_SCALE_HIGH}
        />
      ))}

      <Button
        title="See how it compares"
        onPress={handleSave}
        disabled={!complete || saving}
        loading={saving}
        style={styles.button}
      />
    </>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {showResults ? renderResults() : renderQuestions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: { marginTop: Spacing.lg },

  resultCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  deltaBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  deltaUp: { backgroundColor: Colors.primary },
  deltaFlat: { backgroundColor: Colors.border },
  deltaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  deltaTextUp: { color: Colors.white },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  timelinePoint: { alignItems: 'center' },
  timelineValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  timelineLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import type { TrackingField } from '../../data/practices';
import {
  MEALS_DAY_LEVELS,
  MEALS_DAY_QUESTION,
  PUSH_LEVELS,
  PUSH_QUESTION,
  PushApp,
  RESISTANCE_LEVELS,
  ResistanceLevel,
} from '../../constants/resistance';
import { formatMetricValue, stepMetric } from '../../services/lastMetrics';
import { CheckinMode, CheckinRating } from '../../services/checkinRating';
import { useCopy } from '../../context/CopyContext';
import { RatingExplainer } from '../home/RatingExplainer';
import { OverrideInfoButton } from '../home/OverrideInfoButton';

// =============================================================================
// THE RATING SHEET on Today, after a session hands back (services/miniApps.ts).
// What it asks depends on how the session began (services/checkinRating.ts):
//   'push'   started in the app — the override was tapped on Start, so only
//            "How hard did you push?"
//   'both'   Done it or a past session — "How hard was it to start?", then push,
//            back to back
//   'meals'  a Meals day — "How hard was it to eat this way today?"
// The session's numbers sit above the first question. Tapping the last
// answer IS the save.
// =============================================================================

type Step = 'override' | 'push' | 'day';

interface Props {
  visible: boolean;
  /** The app, e.g. "Meditate". */
  habitName: string;
  /** The app's colour (AppColors), for the check mark. */
  appColor: string;
  mode: CheckinMode;
  /** Whose words push uses. */
  pushApp: PushApp;
  fields: TrackingField[];
  initialValues: Record<string, number>;
  /** One line under the app name, e.g. "From your workout". */
  note?: string | null;
  /** First rating ever: explain the questions once (RatingExplainer). */
  explain?: boolean;
  /** The last answer is the save. Throwing keeps the sheet open. */
  onRate: (rating: CheckinRating, values: Record<string, number>) => Promise<void>;
  onCancel: () => void;
}

const firstStep = (mode: CheckinMode): Step => (mode === 'meals' ? 'day' : mode === 'both' ? 'override' : 'push');

export const RateSheet: React.FC<Props> = ({
  visible,
  habitName,
  appColor,
  mode,
  pushApp,
  fields,
  initialValues,
  note,
  explain,
  onRate,
  onCancel,
}) => {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [step, setStep] = useState<Step>(firstStep(mode));
  const [override, setOverride] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState<number | null>(null);

  // Fresh each time it opens.
  useEffect(() => {
    if (visible) {
      setValues(initialValues);
      setStep(firstStep(mode));
      setOverride(undefined);
      setSaving(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async (rating: CheckinRating, level: number) => {
    if (saving !== null) return;
    setSaving(level);
    try {
      await onRate(rating, values);
    } catch {
      // The caller has already said what went wrong; let them try again.
      setSaving(null);
    }
  };

  const pick = (level: number) => {
    if (step === 'override') {
      setOverride(level);
      setStep('push');
    } else if (step === 'push') {
      save({ override, push: level }, level);
    } else {
      save({ day: level }, level);
    }
  };

  const levelText = (level: ResistanceLevel): string =>
    step === 'override'
      ? t(`today.rate.override.${level.value}`, level.anchor)
      : step === 'push'
        ? t(`today.rate.push.${pushApp}.${level.value}`, level.label)
        : t(`today.rate.meals.${level.value}`, level.label);

  const levels = step === 'override' ? RESISTANCE_LEVELS : step === 'push' ? PUSH_LEVELS[pushApp] : MEALS_DAY_LEVELS;
  const kicker =
    step === 'override'
      ? t('today.rate.override.kicker', 'Override')
      : step === 'push'
        ? t('today.rate.push.kicker', 'Push')
        : t('today.rate.meals.kicker', 'Today’s rating');
  const question =
    step === 'override'
      ? t('today.quick.question', 'How hard was it to start?')
      : step === 'push'
        ? t(`today.rate.push.${pushApp}.question`, PUSH_QUESTION[pushApp])
        : t('today.rate.meals.question', MEALS_DAY_QUESTION);
  const lastStep = step !== 'override';
  // The numbers belong with whichever question comes first.
  const shown = step === firstStep(mode) ? fields.filter((f) => typeof values[f.key] === 'number') : [];
  const chosen = override ? RESISTANCE_LEVELS.find((l) => l.value === override) : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel={t('today.quick.cancel', 'Cancel')} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />
          <View style={styles.info}>
            <OverrideInfoButton />
          </View>

          <View style={styles.head}>
            <View style={[styles.check, { backgroundColor: appColor }]}>
              <Ionicons name="checkmark" size={30} color={Colors.white} />
            </View>
            <Text style={styles.app}>{note ? `${habitName} · ${note}` : habitName}</Text>
            <Text style={[styles.kicker, { color: appColor }]}>{kicker}</Text>
            <Text style={styles.question} accessibilityRole="header">
              {question}
            </Text>
          </View>

          {explain && mode !== 'meals' && step === firstStep(mode) && <RatingExplainer />}

          {chosen && step === 'push' && (
            <TouchableOpacity
              style={styles.chosen}
              onPress={() => setStep('override')}
              disabled={saving !== null}
              accessibilityRole="button"
              accessibilityLabel={t('today.rate.change', 'Change your override, {level}', { level: String(chosen.value) })}
            >
              <Text style={styles.chosenText} numberOfLines={1}>
                {t('today.rate.override.kicker', 'Override')} {chosen.value} ·{' '}
                {t(`today.rate.override.${chosen.value}`, chosen.anchor)}
              </Text>
              <Text style={[styles.chosenChange, { color: appColor }]}>{t('today.rate.changeShort', 'Change')}</Text>
            </TouchableOpacity>
          )}

          {shown.length > 0 && (
            <View style={styles.fields}>
              {shown.map((f, i) => (
                <View key={f.key} style={[styles.field, i < shown.length - 1 && styles.fieldDivider]}>
                  <Text style={styles.fieldLabel} numberOfLines={1}>
                    {f.label}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setValues((v) => ({ ...v, [f.key]: stepMetric(f, v[f.key], -1) }))}
                    accessibilityLabel={t('today.quick.less', 'Less {label}', { label: f.label })}
                  >
                    <Text style={styles.stepGlyph}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.fieldValue}>{formatMetricValue(f, values[f.key])}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setValues((v) => ({ ...v, [f.key]: stepMetric(f, v[f.key], 1) }))}
                    accessibilityLabel={t('today.quick.more', 'More {label}', { label: f.label })}
                  >
                    <Text style={styles.stepGlyph}>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.ratings}>
            {levels.map((level) => (
              <TouchableOpacity
                key={`${step}-${level.value}`}
                style={[styles.rating, saving === level.value && { backgroundColor: appColor }]}
                onPress={() => pick(level.value)}
                disabled={saving !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${level.value}, ${levelText(level)}.`}
              >
                {saving === level.value ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.ratingNumber}>{level.value}</Text>
                    <Text style={styles.ratingCaption} numberOfLines={2}>
                      {levelText(level)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {step === 'override'
              ? t('today.rate.hint.override', 'Rate the start, not the session. Then: how hard you pushed.')
              : lastStep
                ? t('today.rate.hint.save', 'Tap one to save.')
                : ''}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    gap: 20,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.separator },
  info: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 1 },
  head: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  check: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  app: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center' },
  kicker: { ...TextStyles.footnote, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: -4 },
  question: { ...TextStyles.title2, color: Colors.dark, textAlign: 'center' },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  chosenText: { ...TextStyles.subhead, flex: 1, color: Colors.label2 },
  chosenChange: { ...TextStyles.subhead, fontWeight: '600' },
  fields: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingLeft: Spacing.md },
  field: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, paddingRight: 6 },
  fieldDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  fieldLabel: { ...TextStyles.body, flex: 1, color: Colors.dark },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontSize: 22, lineHeight: 26, color: Colors.primary },
  fieldValue: { ...TextStyles.headline, minWidth: 72, textAlign: 'center', color: Colors.dark },
  ratings: { flexDirection: 'row', gap: 10 },
  rating: {
    flex: 1,
    minHeight: 92,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ratingNumber: { ...TextStyles.title1, color: Colors.dark },
  ratingCaption: { ...TextStyles.subhead, fontWeight: '500', color: Colors.label2, textAlign: 'center' },
  hint: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center', marginTop: -Spacing.sm },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import type { TrackingField } from '../../data/practices';
import { RESISTANCE_LEVELS } from '../../constants/resistance';
import { formatMetricValue, stepMetric } from '../../services/lastMetrics';
import { useCopy } from '../../context/CopyContext';
import { CHIP_CAPTIONS } from '../home/TodayHabitRow';
import { RatingExplainer } from '../home/RatingExplainer';

// =============================================================================
// THE RATING SHEET, REDESIGNED (canvas "After a session: rate it"). Same job
// and same props as components/home/QuickLogSheet.tsx, which HomeScreen swaps
// for this one under the Lab switch: the session's numbers as steppers, then
// "How hard was it to start?" — and tapping 1, 2 or 3 IS the save.
// =============================================================================

interface Props {
  visible: boolean;
  /** The app, e.g. "Meditate". */
  habitName: string;
  /** The app's colour (AppColors), for the check mark. */
  appColor: string;
  fields: TrackingField[];
  initialValues: Record<string, number>;
  /** One line under the app name, e.g. "From your workout". */
  note?: string | null;
  /** First rating ever: explain the question once (RatingExplainer). */
  explain?: boolean;
  /** The rating is the save. Throwing keeps the sheet open. */
  onRate: (resistance: number, values: Record<string, number>) => Promise<void>;
  onCancel: () => void;
}

export const RateSheet: React.FC<Props> = ({
  visible,
  habitName,
  appColor,
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
  const [saving, setSaving] = useState<number | null>(null);

  // Fresh values each time it opens.
  useEffect(() => {
    if (visible) {
      setValues(initialValues);
      setSaving(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const rate = async (level: number) => {
    if (saving !== null) return;
    setSaving(level);
    try {
      await onRate(level, values);
    } catch {
      // The caller has already said what went wrong; let them try again.
      setSaving(null);
    }
  };

  const shown = fields.filter((f) => typeof values[f.key] === 'number');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel={t('today.quick.cancel', 'Cancel')} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />

          <View style={styles.head}>
            <View style={[styles.check, { backgroundColor: appColor }]}>
              <Ionicons name="checkmark" size={30} color={Colors.white} />
            </View>
            <Text style={styles.app}>{note ? `${habitName} · ${note}` : habitName}</Text>
            <Text style={styles.question} accessibilityRole="header">
              {t('today.quick.question', 'How hard was it to start?')}
            </Text>
          </View>

          {explain && <RatingExplainer />}

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
            {RESISTANCE_LEVELS.map((level, i) => (
              <TouchableOpacity
                key={level.value}
                style={[styles.rating, saving === level.value && { backgroundColor: appColor }]}
                onPress={() => rate(level.value)}
                disabled={saving !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${level.value}, ${level.label}. ${level.sublabel}.`}
              >
                {saving === level.value ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.ratingNumber}>{level.value}</Text>
                    <Text style={styles.ratingCaption}>{CHIP_CAPTIONS[i]}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {t('today.quick.redesignHint', 'Tap one to save. Each app’s page shows how it’s trending.')}
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
  head: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  check: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  app: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center' },
  question: { ...TextStyles.title2, color: Colors.dark, textAlign: 'center' },
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
    height: 92,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ratingNumber: { ...TextStyles.title1, color: Colors.dark },
  ratingCaption: { ...TextStyles.subhead, fontWeight: '500', color: Colors.label2 },
  hint: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center', marginTop: -Spacing.sm },
});

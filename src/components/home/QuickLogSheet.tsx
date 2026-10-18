import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { TrackingField } from '../../data/practices';
import { RESISTANCE_LEVELS } from '../../constants/resistance';
import { formatMetricValue, stepMetric } from '../../services/lastMetrics';
import { useCopy } from '../../context/CopyContext';
import { CHIP_CAPTIONS, CHIP_STYLES, CHIP_TEXT } from './TodayHabitRow';

interface Props {
  visible: boolean;
  habitName: string;
  sectionName: string;
  sectionColor: string;
  /** Numeric fields to show as steppers. Empty for a habit with nothing to measure. */
  fields: TrackingField[];
  /** Filled in from last time (services/lastMetrics.prefillMetrics), or from a finished session. */
  initialValues: Record<string, number>;
  /** One muted line above the question, e.g. "From your workout". */
  note?: string | null;
  /** The rating is the save. Throwing keeps the sheet open. */
  onRate: (resistance: number, values: Record<string, number>) => Promise<void>;
  onCancel: () => void;
}

/**
 * The quick route on Today: tap a habit, its numbers are already set to last
 * time, tap how hard it was to start. The rating saves it.
 */
export const QuickLogSheet: React.FC<Props> = ({
  visible,
  habitName,
  sectionName,
  sectionColor,
  fields,
  initialValues,
  note,
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
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}>
          <Text style={[styles.kicker, { color: sectionColor }]}>{sectionName}</Text>
          <Text style={styles.title}>{habitName}</Text>

          {shown.length > 0 && (
            <View style={styles.fields}>
              {shown.map((f) => (
                <View key={f.key} style={styles.field}>
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
              <Text style={styles.hint}>
                {t('today.quick.sameAsLast', 'Same as last time. Change it if today was different.')}
              </Text>
            </View>
          )}

          {!!note && <Text style={styles.hint}>{note}</Text>}
          <Text style={styles.question}>{t('today.quick.question', 'How hard was it to start?')}</Text>

          <View style={styles.ratings}>
            {RESISTANCE_LEVELS.map((level, i) => (
              <TouchableOpacity
                key={level.value}
                style={[styles.rating, CHIP_STYLES[i]]}
                onPress={() => rate(level.value)}
                disabled={saving !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${level.label}. ${level.sublabel}.`}
              >
                {saving === level.value ? (
                  <ActivityIndicator color={CHIP_TEXT[i].color} />
                ) : (
                  <>
                    <Text style={[styles.ratingGlyph, CHIP_TEXT[i]]}>{level.value}</Text>
                    <Text style={[styles.ratingCap, CHIP_TEXT[i]]}>{CHIP_CAPTIONS[i]}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.lg - 2,
    gap: Spacing.xs + 2,
  },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  fields: { gap: Spacing.xs + 2, marginTop: Spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingLeft: Spacing.md - 2,
    padding: 4,
  },
  fieldLabel: { flex: 1, fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm + 4,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  fieldValue: {
    minWidth: 72,
    textAlign: 'center',
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md + 1,
    color: Colors.dark,
  },
  hint: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, paddingLeft: 4 },
  question: {
    fontFamily: Fonts.secondary,
    fontSize: 15,
    color: Colors.gray,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ratings: { flexDirection: 'row', gap: Spacing.sm + 2 },
  rating: {
    flex: 1,
    height: 76,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: Colors.white,
  },
  ratingGlyph: { fontFamily: Fonts.primaryBold, fontSize: 26 },
  ratingCap: { fontFamily: Fonts.secondaryBold, fontSize: 13 },
});

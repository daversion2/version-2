import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PracticesStackParamList } from '../../types/navigation';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { useAuth } from '../../context/AuthContext';
import {
  getActiveHabits,
  getWeeklyCompletionCounts,
  createHabit,
  logHabitCompletion,
} from '../../services/habits';
import { Nudge, HabitDifficulty } from '../../types';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';

type Props = NativeStackScreenProps<PracticesStackParamList, 'PracticeDetail'>;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export const PracticeDetailScreen: React.FC<Props> = ({ route }) => {
  const { practiceId } = route.params;
  const practice = getPractice(practiceId);
  const { user } = useAuth();

  const [habit, setHabit] = useState<Nudge | null>(null);
  const [weekDone, setWeekDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    if (!user || !practice) return;
    const [hs, counts] = await Promise.all([
      getActiveHabits(user.uid),
      getWeeklyCompletionCounts(user.uid),
    ]);
    const found =
      hs.find((h) => h.practice_id === practice.id) ||
      hs.find((h) => h.name.trim().toLowerCase() === practice.name.toLowerCase()) ||
      null;
    setHabit(found);
    setWeekDone(found ? counts[found.id] ?? 0 : 0);
  }, [user, practice]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!practice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Practice not found.</Text>
      </View>
    );
  }

  const group = PRACTICE_GROUPS.find((g) => g.id === practice.group);
  const color = group?.color ?? Colors.primary;
  const adopted = !!habit;
  const target = habit?.target_count_per_week ?? practice.suggested_target_per_week;
  const complete = adopted && weekDone >= target;

  const handleAdopt = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await createHabit(user.uid, {
        name: practice.name,
        target_count_per_week: practice.suggested_target_per_week,
        practice_id: practice.id,
        created_by_user: false,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitCompletion = async (difficulty: HabitDifficulty, notes?: string) => {
    setCompleting(false);
    if (!user || !habit) return;
    await logHabitCompletion(user.uid, habit.id, difficulty, undefined, notes);
    await load();
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
            <Ionicons name={practice.icon as any} size={28} color={color} />
          </View>
          <Text style={styles.name}>{practice.name}</Text>
          <Text style={[styles.groupLabel, { color }]}>
            {group?.name}
            {!practice.core ? ' · Optional' : ''}
          </Text>
          <Text style={styles.overview}>{practice.description}</Text>
        </View>

        {/* Adopt / check-off */}
        {!adopted ? (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: color }]}
            onPress={handleAdopt}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.ctaText}>Add to my practices · {target}×/week</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.cta, complete ? { backgroundColor: Colors.success } : { backgroundColor: color }]}
            onPress={() => setCompleting(true)}
            activeOpacity={0.85}
          >
            <Ionicons name={complete ? 'checkmark' : 'add'} size={18} color={Colors.white} />
            <Text style={styles.ctaText}>
              {complete ? `Done · ${weekDone}/${target} this week` : `Log it · ${weekDone}/${target} this week`}
            </Text>
          </TouchableOpacity>
        )}

        {/* How to */}
        <Section title="How to do it">
          {practice.howTo.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: color }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          {practice.minimumVersion && (
            <View style={[styles.minBox, { borderLeftColor: color }]}>
              <Text style={styles.minLabel}>On a hard day</Text>
              <Text style={styles.minText}>{practice.minimumVersion}</Text>
            </View>
          )}
        </Section>

        {/* Science */}
        <Section title="Why it works">
          <Text style={styles.bodyText}>{practice.science}</Text>
        </Section>

        {/* Variations */}
        {practice.variations && practice.variations.length > 0 && (
          <Section title="Ways to do it">
            {practice.variations.map((v) => (
              <View key={v.label} style={styles.variationRow}>
                <Text style={[styles.variationLabel, { color }]}>{v.label}</Text>
                <Text style={styles.variationDesc}>{v.description}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Tips & cautions */}
        <Section title="Tips & cautions">
          {practice.tips.map((tip, i) => {
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
        </Section>
      </ScrollView>

      <HabitCompletionModal
        visible={completing}
        habitName={practice.name}
        actionPlan={habit?.action_plan}
        onSubmit={handleSubmitCompletion}
        onCancel={() => setCompleting(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  groupLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  overview: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  ctaText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  section: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.sm },
  bodyText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 21 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  stepText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  minBox: { borderLeftWidth: 3, paddingLeft: Spacing.sm, marginTop: Spacing.xs },
  minLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase' },
  minText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: 1 },
  variationRow: { marginBottom: Spacing.sm },
  variationLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
  variationDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  tipDot: { marginTop: 5, width: 16, textAlign: 'center' },
  tipText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
});

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HomeScreenProps } from '../../types/navigation';
import { getPractice, PRACTICE_GROUPS, resolvePracticeGroup } from '../../data/practices';
import { useAuth } from '../../context/AuthContext';
import { getActiveHabits, getWeeklyCompletionCounts, createHabit } from '../../services/practices';
import { PracticeInstance } from '../../types';

// Learn + adopt + status. Doing reps (completion) lives on Home, so detail carries
// no completion CTA — it's the "understand it / add it to my protocol" screen.
type Props = HomeScreenProps<'PracticeDetail'>;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// One expandable technique row (collapsed by default) inside the how-to section.
const TechniqueRow: React.FC<{ label: string; steps: string[]; color: string }> = ({
  label,
  steps,
  color,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.techniqueRow}>
      <TouchableOpacity
        style={styles.techniqueHeader}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Text style={[styles.techniqueLabel, { color }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={color} />
      </TouchableOpacity>
      {open &&
        steps.map((step, i) => (
          <View key={i} style={styles.techniqueStepRow}>
            <Ionicons name="ellipse" size={6} color={Colors.gray} style={styles.techniqueStepDot} />
            <Text style={styles.techniqueStepText}>{step}</Text>
          </View>
        ))}
    </View>
  );
};

export const PracticeDetailScreen: React.FC<Props> = ({ route }) => {
  // Curated practices arrive with a catalog `practiceId`; user-authored ones
  // with an instance `habitId` and no catalog entry.
  const practiceId = 'practiceId' in route.params ? route.params.practiceId : undefined;
  const customHabitId = 'habitId' in route.params ? route.params.habitId : undefined;
  // Opened mid-session ("Learn more" on the Ready screen): pure reading material,
  // no adopt/status CTAs — you can't start a session from inside a session.
  const readOnly = !!route.params.readOnly;
  const practice = getPractice(practiceId);
  const { user } = useAuth();

  const [habit, setHabit] = useState<PracticeInstance | null>(null);
  const [weekDone, setWeekDone] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || readOnly) return;
    const [hs, counts] = await Promise.all([
      getActiveHabits(user.uid),
      getWeeklyCompletionCounts(user.uid),
    ]);
    let found: PracticeInstance | null = null;
    if (practice) {
      found =
        hs.find((h) => h.practice_id === practice.id) ||
        hs.find((h) => h.name.trim().toLowerCase() === practice.name.toLowerCase()) ||
        null;
    } else if (customHabitId) {
      found = hs.find((h) => h.id === customHabitId) || null;
    }
    setHabit(found);
    setWeekDone(found ? counts[found.id] ?? 0 : 0);
  }, [user, readOnly, practice, customHabitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Neither a known catalog practice nor a custom instance reference.
  if (!practice && !customHabitId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Practice not found.</Text>
      </View>
    );
  }

  // A custom practice that has since been deactivated/deleted.
  if (!practice && !habit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>This practice is no longer active.</Text>
      </View>
    );
  }

  const groupId = practice ? practice.group : resolvePracticeGroup(habit ?? {});
  const group = PRACTICE_GROUPS.find((g) => g.id === groupId);
  const color = group?.color ?? Colors.primary;
  const name = practice ? practice.name : habit?.name ?? '';
  const adopted = !!habit;
  const target = habit?.target_count_per_week ?? practice?.suggested_target_per_week ?? 0;
  const complete = adopted && weekDone >= target;

  const handleAdopt = async () => {
    if (!user || !practice) return;
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
            <Ionicons name={(practice?.icon ?? 'ellipse-outline') as any} size={28} color={color} />
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.groupLabel, { color }]}>
            {group?.name}
            {practice && !practice.core ? ' · Optional' : ''}
          </Text>
          {practice && <Text style={styles.overview}>{practice.description}</Text>}
        </View>

        {/* Adopt (un-adopted) or a read-only status (adopted). Completion is on Home.
            Hidden entirely when opened mid-session as reading material. */}
        {readOnly ? null : !adopted ? (
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
          <View style={[styles.statusPill, { borderColor: color }]}>
            <Ionicons
              name={complete ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={complete ? Colors.success : color}
            />
            <Text style={[styles.statusText, { color }]}>
              In your practices · {weekDone}/{target} this week
            </Text>
          </View>
        )}

        {/* Catalog "Learn" content — curated practices only. */}
        {practice && (
          <>
        {/* How to */}
        <Section title={practice.howToTitle ?? 'How to do it'}>
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
          {practice.techniques?.map((t) => (
            <TechniqueRow key={t.label} label={t.label} steps={t.steps} color={color} />
          ))}
        </Section>

        {/* Science */}
        <Section title="Why it works">
          <Text style={styles.bodyText}>{practice.science}</Text>
        </Section>

        {/* Research */}
        {practice.research && practice.research.length > 0 && (
          <Section title="The research">
            {practice.research.map((r, i) => (
              <View key={i} style={[styles.researchRow, i > 0 && styles.researchDivider]}>
                <Text style={styles.researchFinding}>{r.finding}</Text>
                <View style={styles.researchMeta}>
                  <Text style={styles.researchSource}>{r.source}</Text>
                  {r.url && (
                    <TouchableOpacity
                      style={styles.researchLinkRow}
                      onPress={() => Linking.openURL(r.url!)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.researchLink, { color }]}>View study</Text>
                      <Ionicons name="open-outline" size={13} color={color} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* Variations — superseded by collapsible techniques when those exist
            (remote catalog docs may still carry the old variations list). */}
        {!practice.techniques?.length && practice.variations && practice.variations.length > 0 && (
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
          </>
        )}
    </ScrollView>
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  statusText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
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
  researchRow: { paddingVertical: Spacing.xs },
  researchDivider: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.xs, paddingTop: Spacing.sm },
  researchFinding: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  researchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  researchSource: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  researchLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  researchLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  techniqueRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  techniqueLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
  techniqueStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  techniqueStepDot: { marginTop: 5, width: 16, textAlign: 'center' },
  techniqueStepText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  variationRow: { marginBottom: Spacing.sm },
  variationLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
  variationDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  tipDot: { marginTop: 5, width: 16, textAlign: 'center' },
  tipText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
});

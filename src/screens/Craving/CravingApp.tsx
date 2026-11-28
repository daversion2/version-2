import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { Copy } from '../../components/common/Copy';
import { useAuth } from '../../context/AuthContext';
import { useCopy } from '../../context/CopyContext';
import { getCravingType, getMissionCategory } from '../../data/cravings';
import { cravingWeek, getCravingLogs, summarizeCravingPatterns } from '../../services/cravings';
import { addDays } from '../../services/homeDashboard';
import type { CravingLog } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { getTodayString } from '../../utils/date';

// =============================================================================
// CRAVING CRUSHER — its own micro-app (2026-11-20). This is its home: ride one
// out, this week's counts, your pattern over 30 days. "Ride it out" opens the
// ride itself (screens/Home/CravingCrusherScreen.tsx, root route CravingRide),
// unchanged. Mockup: https://claude.ai/artifact/JyTy21iCp1BuRU9kmKQsMJ.
// =============================================================================

const ACCENT = AppColors.craving;
const PATTERN_DAYS = 30;

/** The off-app mission most often used on urges that were ridden out. */
const whatHelps = (logs: CravingLog[]): string | null => {
  const counts = new Map<string, number>();
  for (const l of logs) if (l.outcome === 'passed' && l.mission) counts.set(l.mission, (counts.get(l.mission) ?? 0) + 1);
  let best: string | null = null;
  let max = 0;
  for (const [id, n] of counts) if (n > max) [best, max] = [id, n];
  return best ? getMissionCategory(best)?.label ?? null : null;
};

export const CravingApp: React.FC = () => {
  const t = useCopy();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const today = getTodayString();
  const [logs, setLogs] = useState<CravingLog[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setFailed(false);
    getCravingLogs(user.uid, addDays(today, -(PATTERN_DAYS - 1)))
      .then(setLogs)
      .catch((e) => {
        console.warn('Craving Crusher: loading failed', e);
        setFailed(true);
      });
  }, [user, today]);

  useFocusEffect(load);

  const week = logs ? cravingWeek(logs, today) : null;
  const pattern = logs ? summarizeCravingPatterns(logs) : null;
  const helps = logs ? whatHelps(logs) : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.lg }]}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          <Copy id="craving.app.back" style={styles.backText}>Today</Copy>
        </TouchableOpacity>
        <Copy id="craving.app.title" style={styles.largeTitle} accessibilityRole="header">
          Craving Crusher
        </Copy>

        <View style={styles.card}>
          <View style={[styles.band, { backgroundColor: ACCENT + '1F' }]}>
            <Ionicons
              name="water-outline"
              size={150}
              color={ACCENT + '33'}
              style={styles.watermark}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View style={styles.bandIcon}>
              <Ionicons name="water-outline" size={28} color={Colors.white} />
            </View>
          </View>
          <View style={styles.cardBody}>
            <Copy id="craving.app.cardTitle" style={styles.cardTitle}>Feel an urge right now?</Copy>
            <Copy id="craving.app.cardText" style={styles.cardText}>
              Most urges rise, peak and pass within 10 to 20 minutes. Ride this one out with something to do while it does.
            </Copy>
            <TouchableOpacity
              style={styles.primary}
              onPress={() => navigation.navigate('CravingRide')}
              accessibilityRole="button"
            >
              <Copy id="craving.app.ride" style={styles.primaryText}>Ride it out</Copy>
            </TouchableOpacity>
          </View>
        </View>

        {failed ? (
          <TouchableOpacity onPress={load} accessibilityRole="button" style={styles.failed}>
            <Copy id="craving.app.loadFailed" style={styles.muted}>Couldn’t load your history. Tap to try again.</Copy>
          </TouchableOpacity>
        ) : !logs || !week ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <View style={styles.group}>
              <Copy id="craving.app.thisWeek" style={styles.groupTitle}>THIS WEEK</Copy>
              <View style={styles.stats}>
                <Stat id="craving.app.stat.passed" value={week.passed} label="ridden out" />
                <Stat id="craving.app.stat.gaveIn" value={week.gaveIn} label="logged honestly" />
                <Stat id="craving.app.stat.xp" value={week.xp} label="XP of friction overcome" />
              </View>
            </View>

            <View style={styles.group}>
              <Copy id="craving.app.pattern" style={styles.groupTitle} vars={{ days: PATTERN_DAYS }}>
                {'YOUR PATTERN · LAST {days} DAYS'}
              </Copy>
              {pattern ? (
                <View style={styles.panel}>
                  <Row id="craving.app.row.pulls" label="Pulls most" value={getCravingType(pattern.byType[0].cravingType).label} separator />
                  <Row id="craving.app.row.usually" label="Usually" value={pattern.peakWindow ?? t('craving.app.noSetTime', 'No set time')} separator={!!helps} />
                  {helps ? <Row id="craving.app.row.helps" label="What helps you" value={helps} /> : null}
                </View>
              ) : (
                <View style={[styles.panel, styles.emptyPattern]}>
                  <Copy
                    id="craving.app.emptyPattern"
                    style={styles.muted}
                    vars={{ soFar: logs.length > 0 ? t('craving.app.soFar', '{n} so far.', { n: logs.length }) : '' }}
                  >
                    {'After five urges, this shows what pulls most and when. {soFar}'}
                  </Copy>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const Stat: React.FC<{ id: string; value: number; label: string }> = ({ id, value, label }) => (
  <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
    <Text style={styles.statValue}>{value}</Text>
    <Copy id={id} style={styles.statLabel}>{label}</Copy>
  </View>
);

const Row: React.FC<{ id: string; label: string; value: string; separator?: boolean }> = ({ id, label, value, separator }) => (
  <View style={[styles.row, separator && styles.separator]}>
    <Copy id={id} style={styles.body}>{label}</Copy>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, marginLeft: -6 },
  backText: { ...TextStyles.body, color: Colors.primary },
  largeTitle: { ...TextStyles.largeTitle, color: Colors.dark, paddingHorizontal: 4, marginTop: -Spacing.md },

  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  band: { height: 120, padding: Spacing.md, justifyContent: 'flex-end', overflow: 'hidden' },
  watermark: { position: 'absolute', right: -20, top: -16 },
  bandIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: Spacing.md, gap: 10 },
  cardTitle: { ...TextStyles.title3, color: Colors.dark },
  cardText: { ...TextStyles.subhead, color: Colors.label2 },
  primary: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: { ...TextStyles.headline, color: Colors.white },

  failed: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  group: { gap: 6 },
  groupTitle: { ...TextStyles.footnote, fontWeight: '700', letterSpacing: 0.5, color: Colors.gray, paddingHorizontal: Spacing.md },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md, padding: 14, gap: 2 },
  statValue: { ...TextStyles.title1, color: Colors.dark },
  statLabel: { ...TextStyles.footnote, color: Colors.label2 },
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md, overflow: 'hidden' },
  emptyPattern: { padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingHorizontal: Spacing.md },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  body: { ...TextStyles.body, color: Colors.dark },
  value: { ...TextStyles.body, color: Colors.label2 },
  muted: { ...TextStyles.footnote, color: Colors.gray },
});

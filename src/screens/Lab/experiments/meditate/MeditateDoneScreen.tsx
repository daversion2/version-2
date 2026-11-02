import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import {
  calmInsight,
  describeCalmInsight,
  describeSession,
  isTooShortToLog,
  newRecords,
  toCompletedSession,
} from '../../../../services/meditateMath';
import { saveMeditateSession } from '../../../../services/labMeditate';
import { formatMinutes } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { withTimeout } from '../../../../utils/withTimeout';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, MEDITATE_TINT, ms } from './components/meditateStyle';
import { CalmScale } from './components/CalmScale';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateDone'>;

const DONE_TITLE: Record<string, string> = { sit: 'Sit done', breathe: 'Breathing done', nsdr: 'Rest done' };

/**
 * The session is over: what it was, any record it set, and which habit it
 * checks off. "Finish & rate it" saves it here, then hands the habit back to
 * Today — the rating and the celebration are Today's, never this app's.
 */
export const MeditateDoneScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, session, sessions, recordFinished, closeAndCheckOff, discardSession } = useMeditate();
  const [saving, setSaving] = useState(false);
  const [calmAfter, setCalmAfter] = useState<number | undefined>(undefined);

  // finished_at is stamped again at save; this is only for what's shown.
  const preview = useMemo(() => (session ? toCompletedSession(session, new Date()) : null), [session]);
  const records = useMemo(() => (preview ? newRecords(sessions, preview) : []), [sessions, preview]);
  // From past sessions only — this one joins once it's saved.
  const insight = useMemo(() => calmInsight(sessions), [sessions]);

  if (!session || !preview) return <View style={ms.screen} />;

  const finish = async () => {
    setSaving(true);
    // Every finished session is the Meditate check-in on Today; no habit is
    // chosen here (services/appCheckins.ts ticks a matching Meditation habit).
    const completed = toCompletedSession({ ...session, habitId: undefined }, new Date(), calmAfter);
    try {
      await withTimeout(saveMeditateSession(userId, completed), 15000);
    } catch (e) {
      console.warn('Meditate: save failed:', e);
      setSaving(false);
      showAlert("Couldn't save your session", 'It’s kept on this phone. Check your connection and tap Finish again.');
      return;
    }
    recordFinished(completed);
    closeAndCheckOff(completed);
  };

  const throwAway = async () => {
    await discardSession();
    navigation.popToTop();
  };

  const discard = () =>
    showConfirm('Discard this session?', 'It won’t be saved or counted.', throwAway, 'Discard');

  // "5 min" → a big 5 and a small "min"; "40 sec" the same way.
  const [amount, unit] = formatMinutes(preview.duration_sec).split(' ');

  // Under a minute can't be logged (MIN_LOGGED_SEC): nothing to rate, only Discard.
  if (isTooShortToLog(preview.duration_sec)) {
    return (
      <View style={[ms.screen, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[ms.scroll, styles.scroll, { paddingBottom: 170 + insets.bottom }]}>
          <View style={styles.hero}>
            <View style={[styles.badge, styles.badgeMuted]}>
              <Ionicons name="hourglass-outline" size={28} color={MEDITATE_ACCENT} />
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">
              Too short to count
            </Text>
            <Text style={styles.amount}>
              {amount}
              <Text style={styles.unit}> {unit}</Text>
            </Text>
            <Text style={[styles.described, styles.center]}>
              Sessions under a minute aren’t logged. Begin again whenever you’re ready.
            </Text>
          </View>
        </ScrollView>
        <View style={[ms.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
          <TouchableOpacity style={ms.primaryBtn} onPress={throwAway} accessibilityRole="button">
            <Text style={ms.primaryBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[ms.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[ms.scroll, styles.scroll, { paddingBottom: 170 + insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={30} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {preview.ended_early ? 'Ended early' : DONE_TITLE[preview.mode]}
          </Text>
          <Text style={styles.amount}>
            {amount}
            <Text style={styles.unit}> {unit}</Text>
          </Text>
          <Text style={styles.described}>{describeSession(preview)}</Text>
          {preview.ended_early && (
            <Text style={[styles.described, styles.center]}>
              Of {formatMinutes(preview.planned_sec)} planned. Showing up is what counts.
            </Text>
          )}
        </View>

        {records.length > 0 && (
          <View style={[ms.card, styles.records]} accessibilityLabel={records.length === 1 ? 'New record' : 'New records'}>
            {records.map((r, i) => (
              <View key={r.label} style={[styles.record, i > 0 && styles.recordDivider]}>
                <View style={styles.recordIcon}>
                  <Ionicons name="arrow-up" size={18} color={MEDITATE_ACCENT} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={ms.title}>
                    {r.label}: {formatMinutes(r.sec)}
                  </Text>
                  <Text style={ms.muted}>New record, up from {formatMinutes(r.previousSec)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[ms.card, styles.calmCard]}>
          <CalmScale
            question="How calm do you feel now?"
            note={session.calmBefore !== undefined ? `You started at ${session.calmBefore}.` : undefined}
            value={calmAfter}
            onChange={setCalmAfter}
          />
          {insight && <Text style={styles.insight}>{describeCalmInsight(insight)}</Text>}
        </View>
      </ScrollView>

      <View style={[ms.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={[ms.primaryBtn, saving && ms.disabled]}
          onPress={finish}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ms.primaryBtnText}>Finish & rate it</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={discard} disabled={saving} style={ms.textBtn} accessibilityRole="button">
          <Text style={ms.destructiveText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingTop: Spacing.xxl, gap: 20 },
  hero: { alignItems: 'center', gap: 6 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MEDITATE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  badgeMuted: { backgroundColor: MEDITATE_TINT },
  heroTitle: { ...TextStyles.title1, color: Colors.dark },
  amount: { fontFamily: TextStyles.largeTitle.fontFamily, fontSize: 64, lineHeight: 72, fontWeight: '700', color: Colors.dark },
  unit: { ...TextStyles.title2, fontWeight: '600', color: Colors.gray },
  described: { ...TextStyles.subhead, color: Colors.gray },
  center: { textAlign: 'center' },
  records: { paddingVertical: 0 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  recordDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator },
  recordIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: MEDITATE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmCard: { gap: Spacing.md },
  insight: { ...TextStyles.subhead, fontWeight: '600', color: MEDITATE_ACCENT },
});

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import {
  calmInsight,
  describeCalmInsight,
  describeSession,
  newRecords,
  toCompletedSession,
} from '../../../../services/meditateMath';
import { saveMeditateSession } from '../../../../services/labMeditate';
import { formatMinutes } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, MEDITATE_TINT, ms } from './components/meditateStyle';
import { CalmScale } from './components/CalmScale';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateDone'>;

/** Offline, a Firestore write never settles — give up and say so rather than spin forever. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

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

  const discard = () =>
    showConfirm('Discard this session?', 'It won’t be saved or counted.', async () => {
      await discardSession();
      navigation.popToTop();
    }, 'Discard');

  return (
    <View style={[ms.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: 170 + insets.bottom }]}>
        <View style={styles.hero}>
          <Ionicons name="checkmark-circle" size={44} color={MEDITATE_ACCENT} />
          <Text style={styles.heroTitle}>{preview.ended_early ? 'Ended early' : DONE_TITLE[preview.mode]}</Text>
          <Text style={styles.minutes}>{formatMinutes(preview.duration_sec)}</Text>
          <Text style={ms.muted}>{describeSession(preview)}</Text>
          {preview.ended_early && (
            <Text style={[ms.muted, styles.center]}>
              Of {formatMinutes(preview.planned_sec)} planned. Showing up is the habit — this counts.
            </Text>
          )}
        </View>

        {records.length > 0 && (
          <View style={[ms.card, styles.recordCard]}>
            <View style={styles.recordHead}>
              <Ionicons name="trophy" size={18} color={Colors.secondary} />
              <Text style={styles.recordTitle}>{records.length === 1 ? 'New record' : 'New records'}</Text>
            </View>
            {records.map((r) => (
              <View key={r.label}>
                <Text style={ms.title}>
                  {r.label}: {formatMinutes(r.sec)}
                </Text>
                <Text style={ms.muted}>Up from {formatMinutes(r.previousSec)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[ms.card, styles.calmCard]}>
          <CalmScale question="How calm do you feel now?" value={calmAfter} onChange={setCalmAfter} />
          {session.calmBefore !== undefined && (
            <Text style={ms.muted}>You started at {session.calmBefore}.</Text>
          )}
          {insight && <Text style={styles.insight}>{describeCalmInsight(insight)}</Text>}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
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
        <TouchableOpacity onPress={discard} disabled={saving} style={ms.textBtn}>
          <Text style={ms.textBtnText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingVertical: Spacing.lg },
  heroTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  minutes: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.hero, color: MEDITATE_ACCENT },
  center: { textAlign: 'center', marginTop: Spacing.xs },
  recordCard: { gap: Spacing.sm, borderColor: Colors.secondary + '55' },
  recordHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.secondary },
  calmCard: { gap: Spacing.sm },
  insight: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  habitRowOn: { borderColor: MEDITATE_ACCENT, backgroundColor: MEDITATE_TINT },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

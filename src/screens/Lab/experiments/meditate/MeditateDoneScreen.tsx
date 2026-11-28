import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import {
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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateDone'>;

const DONE_TITLE: Record<string, string> = { sit: 'Sit done', breathe: 'Breathing done', nsdr: 'Rest done' };

/**
 * The session is over: what it was, any record it set, and which habit it
 * checks off. "Finish & rate it" saves it here, then hands the habit back to
 * Today — the rating and the celebration are Today's, never this app's.
 */
export const MeditateDoneScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { userId, session, sessions, recordFinished, closeAndCheckOff, discardSession } = useMeditate();
  const [saving, setSaving] = useState(false);

  // finished_at is stamped again at save; this is only for what's shown.
  const preview = useMemo(() => (session ? toCompletedSession(session, new Date()) : null), [session]);
  const records = useMemo(() => (preview ? newRecords(sessions, preview) : []), [sessions, preview]);

  if (!session || !preview) return <View style={ms.screen} />;

  const finish = async () => {
    setSaving(true);
    // Every finished session is the Meditate check-in on Today; no habit is
    // chosen here (services/appCheckins.ts ticks a matching Meditation habit).
    const completed = toCompletedSession({ ...session, habitId: undefined }, new Date());
    try {
      await withTimeout(saveMeditateSession(userId, completed), 15000);
    } catch (e) {
      console.warn('Meditate: save failed:', e);
      setSaving(false);
      showAlert(t('meditate.done.saveFail.title', "Couldn't save your session"), t('meditate.done.saveFail.message', 'It’s kept on this phone. Check your connection and tap Finish again.'));
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
    showConfirm(
      t('meditate.done.discard.title', 'Discard this session?'),
      t('meditate.done.discard.message', 'It won’t be saved or counted.'),
      throwAway,
      t('meditate.done.discard.confirm', 'Discard'),
    );

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
            <Copy id="meditate.done.tooShort.title" style={styles.heroTitle} accessibilityRole="header">
              Too short to count
            </Copy>
            <Text style={styles.amount}>
              {amount}
              <Text style={styles.unit}> {unit}</Text>
            </Text>
            <Copy id="meditate.done.tooShort.body" style={[styles.described, styles.center]}>
              Sessions under a minute aren’t logged. Start again whenever you’re ready.
            </Copy>
          </View>
        </ScrollView>
        <View style={[ms.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
          <TouchableOpacity style={ms.primaryBtn} onPress={throwAway} accessibilityRole="button">
            <Copy id="meditate.done.tooShort.discard" style={ms.primaryBtnText}>Discard</Copy>
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
          <Copy
            id={preview.ended_early ? 'meditate.done.endedEarly' : `meditate.done.title.${preview.mode}`}
            style={styles.heroTitle}
            accessibilityRole="header"
          >
            {preview.ended_early ? 'Ended early' : DONE_TITLE[preview.mode]}
          </Copy>
          <Text style={styles.amount}>
            {amount}
            <Text style={styles.unit}> {unit}</Text>
          </Text>
          <Text style={styles.described}>{describeSession(preview)}</Text>
          {preview.ended_early && (
            <Copy id="meditate.done.betterThanNothing" style={[styles.described, styles.center]}>
              Better than nothing!
            </Copy>
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
                  <Copy id="meditate.done.newRecord" style={ms.muted} vars={{ prev: formatMinutes(r.previousSec) }}>
                    {'New record, up from {prev}'}
                  </Copy>
                </View>
              </View>
            ))}
          </View>
        )}

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
            <Copy id="meditate.done.finish" style={ms.primaryBtnText}>Finish & rate it</Copy>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={discard} disabled={saving} style={ms.textBtn} accessibilityRole="button">
          <Copy id="meditate.done.discard" style={ms.destructiveText}>Discard</Copy>
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
});

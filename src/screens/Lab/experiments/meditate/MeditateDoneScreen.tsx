import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import { describeSession, newRecords, toCompletedSession } from '../../../../services/meditateMath';
import { saveMeditateSession } from '../../../../services/labMeditate';
import { formatMinutes } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, MEDITATE_TINT, ms } from './components/meditateStyle';

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
  const { userId, session, sessions, habits, linkedHabits, recordFinished, closeAndCheckOff, discardSession } =
    useMeditate();
  // A session started from a habit's Start button checks that habit off.
  // Otherwise you choose — preselected when there's only one option.
  const [habitId, setHabitId] = useState<string | undefined>(
    session?.habitId ?? (linkedHabits.length === 1 ? linkedHabits[0].id : undefined)
  );
  const [saving, setSaving] = useState(false);

  // finished_at is stamped again at save; this is only for what's shown.
  const preview = useMemo(() => (session ? toCompletedSession(session, new Date()) : null), [session]);
  const records = useMemo(() => (preview ? newRecords(sessions, preview) : []), [sessions, preview]);

  if (!session || !preview) return <View style={ms.screen} />;

  // Only a habit that's actually on this account counts — the button's wording
  // and what gets checked off must never disagree.
  const knownHabit = (id?: string) => (id ? habits.find((h) => h.id === id) : undefined);
  const fixedHabit = knownHabit(session.habitId);
  const chosenHabit = fixedHabit ?? knownHabit(habitId);

  const finish = async () => {
    setSaving(true);
    const completed = toCompletedSession(
      { ...session, ...(chosenHabit ? { habitId: chosenHabit.id } : { habitId: undefined }) },
      new Date()
    );
    try {
      await withTimeout(saveMeditateSession(userId, completed), 15000);
    } catch (e) {
      console.warn('Meditate: save failed:', e);
      setSaving(false);
      showAlert("Couldn't save your session", 'It’s kept on this phone. Check your connection and tap Finish again.');
      return;
    }
    recordFinished(completed);
    if (chosenHabit) closeAndCheckOff(chosenHabit.id, completed);
    else navigation.popToTop();
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

        <Text style={ms.sectionLabel}>Check off a habit</Text>
        {fixedHabit ? (
          <View style={[ms.card, styles.habitRow]}>
            <Ionicons name="checkmark-circle" size={20} color={MEDITATE_ACCENT} />
            <Text style={[ms.title, { flex: 1 }]}>{fixedHabit.name}</Text>
          </View>
        ) : linkedHabits.length === 0 ? (
          <Text style={ms.muted}>
            No habit is linked to Meditate. Link one in Meditate settings and finishing will check it off.
          </Text>
        ) : (
          <>
            {linkedHabits.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[ms.card, styles.habitRow, habitId === h.id && styles.habitRowOn]}
                onPress={() => setHabitId(h.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: habitId === h.id }}
              >
                <Ionicons
                  name={habitId === h.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={habitId === h.id ? MEDITATE_ACCENT : Colors.gray}
                />
                <Text style={[ms.title, { flex: 1 }]}>{h.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[ms.card, styles.habitRow, !habitId && styles.habitRowOn]}
              onPress={() => setHabitId(undefined)}
              accessibilityRole="radio"
              accessibilityState={{ checked: !habitId }}
            >
              <Ionicons
                name={!habitId ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={!habitId ? MEDITATE_ACCENT : Colors.gray}
              />
              <Text style={[ms.body, { flex: 1 }]}>Just save the session</Text>
            </TouchableOpacity>
          </>
        )}
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
            <Text style={ms.primaryBtnText}>{chosenHabit ? 'Finish & rate it' : 'Save session'}</Text>
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

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../../../constants/theme';
import { Stepper } from '../../../../components/common/Stepper';
import type { CompletedMeditateSession, MeditateStackParamList } from '../../../../types/meditate';
import { isTimeoutError } from '../../../../services/labWorkouts';
import { canEditMeditateLength, meditateMinutes, withMeditateMinutes } from '../../../../services/meditateEdit';
import { describeSession, MODES } from '../../../../services/meditateMath';
import { formatMinutes } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { formatDayHeader } from '../../../../utils/date';
import { useMeditate } from './MeditateContext';
import { ms } from './components/meditateStyle';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateEditSession'>;

/** After a save that's queued offline: the same words Workouts uses. */
const showNotSavedYet = () =>
  showAlert('Not saved yet', 'No connection right now. It saves once you’re back online — keep the app open till then.');

/**
 * One finished session, corrected: its length, or the whole session. Held on
 * this screen until Save. A guided session keeps its recording's length. Logic
 * in services/meditateEdit.ts.
 */
export const MeditateEditSessionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const { sessions, editSession } = useMeditate();
  const saved = sessions.find((s) => s.id === sessionId);
  const [draft, setDraft] = useState<CompletedMeditateSession | null>(saved ?? null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  usePreventRemove(dirty && !leaving, ({ data }) =>
    showConfirm('Discard changes?', 'Your edits to this session will be lost.', () => navigation.dispatch(data.action), 'Discard')
  );

  // Once the guard above is off, so the leaving isn't stopped by it.
  useEffect(() => {
    if (leaving) navigation.goBack();
  }, [leaving, navigation]);

  if (!draft) {
    return (
      <View style={[ms.screen, styles.center]}>
        <Text style={ms.muted}>This session no longer exists.</Text>
      </View>
    );
  }

  const config = MODES[draft.mode];

  const commit = async (next: CompletedMeditateSession | null, failTitle: string) => {
    setBusy(true);
    try {
      await editSession(sessionId, next);
      setLeaving(true);
    } catch (e) {
      if (isTimeoutError(e)) {
        setLeaving(true);
        setTimeout(showNotSavedYet, 400);
        return;
      }
      showAlert(failTitle, 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    showConfirm(
      'Delete this session?',
      'It comes off your week, stats and records, along with its rating and XP. This can’t be undone.',
      () => commit(null, 'Couldn’t delete that session'),
      'Delete'
    );

  return (
    <View style={ms.screen}>
      <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <View style={[ms.card, styles.head]}>
          <Text style={ms.title}>{describeSession(draft)}</Text>
          <Text style={ms.muted}>{formatDayHeader(draft.date)}</Text>
        </View>

        {canEditMeditateLength(draft) ? (
          <View style={[ms.card, styles.length]}>
            <Text style={ms.body}>How long?</Text>
            <Stepper
              value={meditateMinutes(draft)}
              onChange={(m) => setDraft((d) => d && withMeditateMinutes(d, m))}
              min={config.minMin}
              max={config.maxMin}
              step={config.stepMin}
              format={(n) => `${n} min`}
              accessibilityLabel="Session length"
            />
          </View>
        ) : (
          <View style={[ms.card, styles.head]}>
            <Text style={ms.body}>{formatMinutes(draft.duration_sec)}</Text>
            <Text style={ms.muted}>A guided session keeps its recording’s length.</Text>
          </View>
        )}

        <TouchableOpacity style={ms.textBtn} onPress={confirmDelete} disabled={busy} accessibilityRole="button">
          <Text style={ms.destructiveText}>Delete session</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[ms.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={[ms.primaryBtn, (!dirty || busy) && ms.disabled]}
          onPress={() => commit(draft, 'Couldn’t save your changes')}
          disabled={!dirty || busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty || busy, busy }}
        >
          {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={ms.primaryBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { gap: 2 },
  length: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: Spacing.sm,
  },
});

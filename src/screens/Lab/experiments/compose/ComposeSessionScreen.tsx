import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { ComposeStackParamList } from '../../../../types/compose';
import { useAuth } from '../../../../context/AuthContext';
import {
  COMPOSE_STEPS,
  composeDisplayTitle,
  composeSessionMeta,
  composeStepIndex,
  deleteComposeSession,
  effectiveStatus,
  isComposeWorking,
  renameComposeSession,
  saveComposeSession,
  unsaveComposeSession,
  watchComposeSession,
} from '../../../../services/labCompose';
import type { ComposeRequest, ComposeSession } from '../../../../utils/meditation/compose';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { triggerTapHaptic } from '../../../../utils/haptics';
import { SessionPlayer } from './components/SessionPlayer';
import { COMPOSE_ACCENT, COMPOSE_TINT, cs } from './components/composeStyle';

type Props = NativeStackScreenProps<ComposeStackParamList, 'ComposeSession'>;

const settingsOf = (s: ComposeSession): Partial<ComposeRequest> => ({
  kind: s.kind,
  minutes: s.minutes,
  voice: s.voice,
  ambience: s.ambience,
});

export const ComposeSessionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { id } = route.params;
  const [session, setSession] = useState<ComposeSession | null | undefined>(undefined);
  const [showScript, setShowScript] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-check every so often, so a session that stalled on the server stops spinning.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    return watchComposeSession(user.uid, id, setSession, () => setSession(null));
  }, [user, id]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (session === undefined) {
    return (
      <View style={[cs.screen, styles.center]}>
        <ActivityIndicator color={COMPOSE_ACCENT} />
      </View>
    );
  }
  if (session === null || !user) {
    return (
      <View style={[cs.screen, styles.center]}>
        <Text style={cs.muted}>This session isn’t here any more.</Text>
        <TouchableOpacity style={cs.textBtn} onPress={() => navigation.goBack()}>
          <Text style={cs.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = effectiveStatus(session);
  const uid = user.uid;

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      showAlert(failure, e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    showConfirm(
      'Delete this session?',
      session.saved ? 'It’ll be removed from My recordings, for good.' : 'The recording will be removed for good.',
      () => {
        // Leave first, then delete: waiting for the server before going back
        // could pop whatever screen the user has moved on to by then.
        navigation.goBack();
        deleteComposeSession(uid, id).catch(() =>
          showAlert('Couldn’t delete it', 'Check your connection and try again.'),
        );
      },
      'Delete',
    );

  const commitTitle = () => {
    const title = editingTitle?.trim();
    setEditingTitle(null);
    if (title && title !== session.title) run(() => renameComposeSession(uid, id, title), 'Couldn’t rename it');
  };

  const again = (withRequest: boolean) =>
    navigation.navigate('ComposeNew', {
      prefill: { ...settingsOf(session), ...(withRequest ? { request: session.request } : {}) },
    });

  // --- Being made ----------------------------------------------------------------
  if (isComposeWorking(status)) {
    const step = composeStepIndex(status);
    return (
      <ScrollView style={cs.screen} contentContainerStyle={[cs.scroll, styles.working]}>
        <ActivityIndicator size="large" color={COMPOSE_ACCENT} />
        <Text style={styles.bigTitle}>{composeDisplayTitle(session)}</Text>
        <Text style={[cs.muted, styles.centerText]}>{composeSessionMeta(session)}</Text>
        <View style={[cs.card, styles.steps]}>
          {COMPOSE_STEPS.map((label, i) => (
            <View key={label} style={styles.stepRow}>
              <Ionicons
                name={i < step ? 'checkmark-circle' : i === step ? 'ellipse' : 'ellipse-outline'}
                size={20}
                color={i <= step ? COMPOSE_ACCENT : Colors.border}
              />
              <Text style={[cs.body, i > step && styles.stepTodo]}>
                {label === 'Writing' ? 'Writing your script' : label === 'Recording' ? 'Recording the voice' : 'Mixing it together'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[cs.muted, styles.centerText]}>
          This takes a minute or two. You can leave: it keeps going, and it’ll be in Compose when it’s ready.
        </Text>
      </ScrollView>
    );
  }

  // --- Declined or failed --------------------------------------------------------
  if (status !== 'ready' || !session.audio_url) {
    const declined = status === 'declined';
    return (
      <ScrollView style={cs.screen} contentContainerStyle={cs.scroll}>
        <View style={[cs.card, styles.problem]}>
          <Ionicons name={declined ? 'hand-left-outline' : 'alert-circle-outline'} size={28} color={Colors.gray} />
          <Text style={cs.title}>{declined ? 'We couldn’t make this one' : 'Something went wrong'}</Text>
          <Text style={cs.body}>
            {declined
              ? session.decline_message
              : (session.error ?? 'It stopped before it finished. Nothing was saved, so try again.')}
          </Text>
        </View>
        <Text style={cs.sectionLabel}>You asked for</Text>
        <Text style={cs.body}>“{session.request}”</Text>
        <TouchableOpacity style={[cs.primaryBtn, styles.gapTop]} onPress={() => again(!declined)}>
          <Text style={cs.primaryBtnText}>{declined ? 'Try a different request' : 'Try again'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cs.textBtn} onPress={remove} disabled={busy}>
          <Text style={cs.dangerText}>Delete</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- Ready ---------------------------------------------------------------------
  return (
    <ScrollView style={cs.screen} contentContainerStyle={cs.scroll}>
      <View style={styles.titleRow}>
        {editingTitle !== null ? (
          <TextInput
            style={[cs.input, styles.titleInput]}
            value={editingTitle}
            onChangeText={setEditingTitle}
            onBlur={commitTitle}
            onSubmitEditing={commitTitle}
            autoFocus
            maxLength={80}
            returnKeyType="done"
            accessibilityLabel="Session name"
          />
        ) : (
          <>
            <Text style={[styles.bigTitle, styles.titleText]}>{composeDisplayTitle(session)}</Text>
            <TouchableOpacity
              onPress={() => setEditingTitle(session.title ?? '')}
              style={cs.headerIconBtn}
              accessibilityLabel="Rename"
              hitSlop={8}
            >
              <Ionicons name="pencil" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </>
        )}
      </View>
      <Text style={cs.muted}>{composeSessionMeta(session)}</Text>

      <View style={[cs.card, styles.playerCard]}>
        <SessionPlayer url={session.audio_url} title={composeDisplayTitle(session)} durationSec={session.duration_sec} />
      </View>

      {session.saved ? (
        <View style={styles.savedRow}>
          <Ionicons name="lock-closed" size={14} color={COMPOSE_ACCENT} />
          <Text style={[cs.body, styles.savedText]}>In My recordings. Only you can see and play it.</Text>
          <TouchableOpacity onPress={() => run(() => unsaveComposeSession(uid, id), 'Couldn’t change that')} disabled={busy}>
            <Text style={cs.textBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[cs.primaryBtn, busy && cs.disabled]}
          disabled={busy}
          onPress={() => {
            triggerTapHaptic();
            run(() => saveComposeSession(uid, id), 'Couldn’t save it');
          }}
          accessibilityRole="button"
        >
          <Text style={cs.primaryBtnText}>Save to My recordings</Text>
        </TouchableOpacity>
      )}

      {!!session.script_lines?.length && (
        <>
          <TouchableOpacity onPress={() => setShowScript((v) => !v)} style={styles.scriptToggle}>
            <Text style={cs.secondaryBtnText}>{showScript ? 'Hide the script' : 'Read the script'}</Text>
            <Ionicons name={showScript ? 'chevron-up' : 'chevron-down'} size={16} color={COMPOSE_ACCENT} />
          </TouchableOpacity>
          {showScript && (
            <View style={[cs.card, styles.script]}>
              {session.script_lines.map((line, i) => (
                <Text key={i} style={cs.body}>
                  {line}
                </Text>
              ))}
            </View>
          )}
        </>
      )}

      <Text style={cs.sectionLabel}>You asked for</Text>
      <Text style={cs.body}>“{session.request}”</Text>

      <TouchableOpacity style={[cs.secondaryBtn, styles.gapTop]} onPress={() => again(true)}>
        <Text style={cs.secondaryBtnText}>Make another like this</Text>
      </TouchableOpacity>
      <TouchableOpacity style={cs.textBtn} onPress={remove} disabled={busy}>
        <Text style={cs.dangerText}>Delete</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm },
  centerText: { textAlign: 'center' },
  working: { alignItems: 'stretch', paddingTop: Spacing.xl, gap: Spacing.md },
  bigTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, textAlign: 'center' },
  steps: { gap: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepTodo: { color: Colors.gray },
  problem: { gap: Spacing.sm, alignItems: 'flex-start' },
  gapTop: { marginTop: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  titleText: { flex: 1, textAlign: 'left' },
  titleInput: { flex: 1, fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
  playerCard: { paddingVertical: Spacing.lg },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: COMPOSE_TINT,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  savedText: { flex: 1 },
  scriptToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', paddingVertical: Spacing.sm },
  script: { gap: Spacing.sm },
});

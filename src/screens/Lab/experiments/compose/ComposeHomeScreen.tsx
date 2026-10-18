import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { ComposeStackParamList } from '../../../../types/compose';
import { useAuth } from '../../../../context/AuthContext';
import {
  COMPOSE_STATUS_LABEL,
  composeDisplayTitle,
  composeSessionMeta,
  effectiveStatus,
  isComposeWorking,
  splitComposeSessions,
  watchComposeSessions,
} from '../../../../services/labCompose';
import type { ComposeSession } from '../../../../utils/meditation/compose';
import { COMPOSE_ACCENT, COMPOSE_TINT, cs } from './components/composeStyle';

type Props = NativeStackScreenProps<ComposeStackParamList, 'ComposeHome'>;

const IDEAS = [
  'Calm my nerves before a big presentation',
  'Picture the last mile of my first marathon',
  'Unwind and let go of the workday',
  'Rehearse a hard conversation with my manager',
];

export const ComposeHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ComposeSession[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return watchComposeSessions(user.uid, setSessions, () => setLoadError(true));
  }, [user]);

  // Re-check every so often, so a session that stalled on the server stops
  // showing as in progress (effectiveStatus) without needing a new snapshot.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Start a new one with the last session's choices, so a second try is one edit away.
  const startNew = () => {
    const last = sessions?.[0];
    navigation.navigate(
      'ComposeNew',
      last ? { prefill: { kind: last.kind, minutes: last.minutes, voice: last.voice, ambience: last.ambience } } : undefined,
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.getParent()?.goBack()} style={cs.headerIconBtn} accessibilityLabel="Close Compose">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={startNew} style={cs.headerIconBtn} accessibilityLabel="New session">
          <Ionicons name="add" size={28} color={COMPOSE_ACCENT} />
        </TouchableOpacity>
      ),
    });
  });

  const { saved, recent } = useMemo(() => splitComposeSessions(sessions ?? []), [sessions]);

  if (!sessions) {
    return (
      <View style={[cs.screen, styles.center]}>
        {loadError ? (
          <Text style={cs.muted}>Couldn’t load your sessions. Check your connection.</Text>
        ) : (
          <ActivityIndicator color={COMPOSE_ACCENT} />
        )}
      </View>
    );
  }

  const open = (s: ComposeSession) => navigation.navigate('ComposeSession', { id: s.id });

  return (
    <ScrollView style={cs.screen} contentContainerStyle={cs.scroll}>
      {sessions.length === 0 ? (
        <View style={[cs.card, styles.intro]}>
          <Ionicons name="sparkles-outline" size={32} color={COMPOSE_ACCENT} />
          <Text style={styles.introTitle}>A session made for the moment you’re in</Text>
          <Text style={cs.body}>
            Describe what you need in a sentence or two. You’ll get a guided recording, written and voiced for you, at
            the length you choose.
          </Text>
          <Text style={cs.body}>
            <Text style={styles.bold}>Meditation</Text> helps you settle and focus.{' '}
            <Text style={styles.bold}>Guided imagery</Text> is the mental rehearsal athletes use: you walk through a big
            moment in your mind, including the hard part, before it happens.
          </Text>
          <Text style={cs.sectionLabel}>Ideas</Text>
          {IDEAS.map((idea) => (
            <Text key={idea} style={cs.muted}>
              “{idea}”
            </Text>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={cs.primaryBtn} onPress={startNew} accessibilityRole="button">
        <Text style={cs.primaryBtnText}>{sessions.length === 0 ? 'Make your first session' : 'New session'}</Text>
      </TouchableOpacity>

      {saved.length > 0 && (
        <>
          <Text style={cs.sectionLabel}>My recordings</Text>
          {saved.map((s) => (
            <SessionRow key={s.id} session={s} onPress={() => open(s)} />
          ))}
          <Text style={cs.muted}>Only you can see and play these.</Text>
        </>
      )}

      {recent.length > 0 && (
        <>
          <Text style={cs.sectionLabel}>Recent</Text>
          {recent.map((s) => (
            <SessionRow key={s.id} session={s} onPress={() => open(s)} />
          ))}
          <Text style={cs.muted}>Not saved yet. Open one and save it to keep it in My recordings.</Text>
        </>
      )}
    </ScrollView>
  );
};

const SessionRow: React.FC<{ session: ComposeSession; onPress: () => void }> = ({ session, onPress }) => {
  const status = effectiveStatus(session);
  const working = isComposeWorking(status);
  const problem = status === 'declined' || status === 'failed';
  return (
    <TouchableOpacity style={[cs.card, styles.row]} onPress={onPress} accessibilityRole="button">
      <View style={[styles.rowIcon, problem && styles.rowIconProblem]}>
        {working ? (
          <ActivityIndicator size="small" color={COMPOSE_ACCENT} />
        ) : (
          <Ionicons
            name={problem ? 'alert-circle-outline' : session.kind === 'imagery' ? 'eye-outline' : 'leaf-outline'}
            size={20}
            color={problem ? Colors.gray : COMPOSE_ACCENT}
          />
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={cs.title} numberOfLines={1}>
          {composeDisplayTitle(session)}
        </Text>
        <Text style={cs.muted} numberOfLines={1}>
          {status === 'ready' ? composeSessionMeta(session) : COMPOSE_STATUS_LABEL[status]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  intro: { gap: Spacing.sm, alignItems: 'flex-start' },
  introTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  bold: { fontFamily: Fonts.secondaryBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: COMPOSE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconProblem: { backgroundColor: Colors.lightGray },
  rowText: { flex: 1, gap: 2 },
});

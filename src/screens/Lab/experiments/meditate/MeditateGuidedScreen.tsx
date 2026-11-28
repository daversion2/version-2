import React, { useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { MeditateStackParamList } from '../../../../types/meditate';
import { describeSession } from '../../../../services/meditateMath';
import { showConfirm } from '../../../../utils/alert';
import { KEEP_SCREEN_ON_WHILE_PLAYING, SessionPlayer } from '../../../../components/audio/SessionPlayer';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateGuided'>;

/**
 * A guided sit (or breath, or NSDR): one of the founder's approved recordings
 * plays. It counts only if it plays to the end — then it hands over to the
 * usual Done screen, which saves it and offers the habit check-off. Leaving
 * before the end discards it. Loaded lazily (getComponent in MeditateApp), so
 * expo-audio is only touched when a guided session starts.
 */
export const MeditateGuidedScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { session, guided, guidedStatus, reloadGuided, end, discardSession } = useMeditate();
  const recording = guided.find((r) => r.id === session?.guidedId);

  // Resumed after the catalog failed to load: try again on the way in.
  useEffect(() => {
    if (guidedStatus === 'error') reloadGuided();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = useCallback(() => {
    end(false);
    navigation.replace('MeditateDone');
  }, [end, navigation]);

  const leave = () =>
    showConfirm(
      t('meditate.guided.leave.title', 'Leave this session?'),
      t('meditate.guided.leave.message', 'Guided sessions count when they play to the end, so this one won’t be saved.'),
      async () => {
        await discardSession();
        navigation.popToTop();
      },
      t('meditate.guided.leave.confirm', 'Leave'),
      t('meditate.guided.leave.cancel', 'Keep listening'),
    );

  if (!session || session.style !== 'guided') {
    return <View style={ms.screen} />;
  }

  return (
    <View style={[ms.screen, styles.screen, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.md }]}>
      <View style={styles.middle}>
        <Ionicons name="headset-outline" size={40} color={MEDITATE_ACCENT} />
        {session.guidedTitle ? (
          <Text style={styles.title}>{session.guidedTitle}</Text>
        ) : (
          <Copy id="meditate.guided.defaultTitle" style={styles.title}>Guided session</Copy>
        )}
        <Text style={[ms.muted, styles.center]}>
          {describeSession({ mode: session.mode, technique: session.technique, pattern: session.pattern, style: session.style })}
          {recording ? ` · ${recording.voice}` : ''}
        </Text>

        {recording ? (
          <View style={[ms.card, styles.player]}>
            <SessionPlayer
              url={recording.audio_url}
              title={recording.title}
              durationSec={recording.duration_sec}
              accent={MEDITATE_ACCENT}
              onFinish={onFinish}
            />
          </View>
        ) : guidedStatus === 'loading' ? (
          <View style={[ms.card, styles.waiting]}>
            <ActivityIndicator color={MEDITATE_ACCENT} />
            <Copy id="meditate.guided.loading" style={ms.muted}>Loading the recording…</Copy>
          </View>
        ) : guidedStatus === 'error' ? (
          <View style={[ms.card, styles.waiting]}>
            <Copy id="meditate.guided.loadFail" style={[ms.body, styles.center]}>Couldn’t load the recording. Check your connection, then try again.</Copy>
            <TouchableOpacity onPress={reloadGuided} style={styles.retry} accessibilityRole="button">
              <Copy id="meditate.guided.retry" style={ms.link}>Try again</Copy>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ms.card}>
            <Copy id="meditate.guided.gone" style={ms.body}>This recording isn’t available any more. Leave, and pick another one or the timer.</Copy>
          </View>
        )}

        <Copy id="meditate.guided.hint" style={[ms.muted, styles.center]}>
          Find a comfortable seat, press play, and close your eyes. It counts when it plays to the end.
        </Copy>
        {KEEP_SCREEN_ON_WHILE_PLAYING && (
          <Copy id="meditate.guided.screenOn" style={[ms.muted, styles.center]}>
            Leave the screen on — it stays lit while the recording plays. Locking your phone pauses it.
          </Copy>
        )}
      </View>

      <TouchableOpacity onPress={leave} style={ms.textBtn} accessibilityRole="button">
        <Copy id="meditate.guided.leave" style={ms.textBtnText}>Leave</Copy>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { paddingHorizontal: Spacing.lg, justifyContent: 'space-between' },
  middle: { flex: 1, justifyContent: 'center', gap: Spacing.md, alignItems: 'stretch' },
  title: { ...TextStyles.title2, color: Colors.dark, textAlign: 'center', alignSelf: 'center' },
  center: { textAlign: 'center' },
  player: { paddingVertical: Spacing.lg },
  waiting: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
});

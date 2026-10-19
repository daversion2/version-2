import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { formatClock } from '../../services/labCompose';

interface Props {
  url: string;
  title: string;
  /** Known up front (a catalog or a session doc) — shown before the file has loaded. */
  durationSec?: number;
  /** The host app's one colour. */
  accent: string;
  /** Called once, when the recording plays through to its end. */
  onFinish?: () => void;
}

const SKIP_SEC = 15;
/** How long "Loading…" shows before saying something's wrong. */
const SLOW_LOAD_MS = 15_000;

/**
 * STOPGAP — keeps the screen on while a session plays. The 2.2.0 store build
 * has no background audio (UIBackgroundModes audio arrived in app.json after
 * it), so there auto-lock would cut a session off mid-way. Turn this off in
 * the first store build that includes background audio: playing with the
 * screen off is the intended experience.
 */
const KEEP_SCREEN_ON_WHILE_PLAYING = true;
const KEEP_AWAKE_TAG = 'guided-session';

/**
 * setAudioModeAsync replaces the whole mode — anything left out goes back to
 * its default (no background playback) — and the picker previews set their
 * own. So this is set in full before every play, not once.
 */
const SESSION_AUDIO_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
  allowsRecording: false,
} as const;

/**
 * Plays a guided recording — a Compose session or a Meditate guided sit. Keeps playing with the screen locked or the app in
 * the background (UIBackgroundModes audio, app.json), with play/pause and a
 * scrubber on the lock screen. Pauses when its screen loses focus, so a
 * session never plays on under another screen.
 */
export const SessionPlayer: React.FC<Props> = ({ url, title, durationSec, accent, onFinish }) => {
  const tint = accent + '14';
  const player = useAudioPlayer({ uri: url }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [barWidth, setBarWidth] = useState(0);
  const [slow, setSlow] = useState(false);
  const lockScreenOn = useRef(false);

  const loaded = status.isLoaded;
  const duration = status.duration || durationSec || 0;
  const position = Math.min(status.currentTime, duration);
  const finished = status.didJustFinish || (loaded && duration > 0 && position >= duration - 0.25 && !status.playing);
  const progress = duration > 0 ? position / duration : 0;

  // Leaving the screen (back, or forward to "Make another like this") pauses,
  // and takes the session off the lock screen so it can't be restarted from
  // there under another screen. The next play puts it back.
  useFocusEffect(
    useCallback(
      () => () => {
        try {
          player.pause();
          if (lockScreenOn.current) player.clearLockScreenControls();
        } catch {
          /* already released */
        }
        lockScreenOn.current = false;
      },
      [player],
    ),
  );

  // Lock-screen controls: switched on at the first play (each switch-on is
  // costly in expo-audio — see patches/expo-audio+1.1.1.patch), kept in step
  // with a rename, cleared on the way out.
  useEffect(() => {
    if (!lockScreenOn.current) return;
    try {
      player.updateLockScreenMetadata({ title, artist: 'Neuro-Nudge' });
    } catch {
      /* a nicety */
    }
  }, [player, title]);
  useEffect(
    () => () => {
      if (!lockScreenOn.current) return;
      try {
        player.clearLockScreenControls();
      } catch {
        /* player already released */
      }
    },
    [player],
  );

  useEffect(() => {
    if (!KEEP_SCREEN_ON_WHILE_PLAYING || !status.playing) return undefined;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [status.playing]);

  // Tell the host once, when it plays through (not on a seek to the end).
  const finishedOnce = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !finishedOnce.current) {
      finishedOnce.current = true;
      onFinish?.();
    }
  }, [status.didJustFinish, onFinish]);

  useEffect(() => {
    if (loaded) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  // Seeking before the audio is ready throws inside AVFoundation and takes the
  // app down, so every seek waits for isLoaded.
  const seek = (sec: number): Promise<void> => {
    if (!loaded || duration <= 0) return Promise.resolve();
    return player.seekTo(Math.max(0, Math.min(duration, sec))).catch(() => undefined);
  };

  const togglePlay = async () => {
    if (!loaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync(SESSION_AUDIO_MODE).catch(() => undefined);
    if (!lockScreenOn.current) {
      try {
        player.setActiveForLockScreen(true, { title, artist: 'Neuro-Nudge' });
        lockScreenOn.current = true;
      } catch {
        /* a nicety */
      }
    }
    if (finished) await seek(0);
    player.play();
  };

  const onBarPress = (e: GestureResponderEvent) => {
    if (barWidth > 0) seek((e.nativeEvent.locationX / barWidth) * duration);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onBarPress}
        disabled={!loaded}
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        style={styles.barHit}
        accessibilityRole="adjustable"
        accessibilityLabel="Position"
        accessibilityValue={{ text: `${formatClock(position)} of ${formatClock(duration)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => seek(position + (e.nativeEvent.actionName === 'increment' ? SKIP_SEC : -SKIP_SEC))}
      >
        <View style={[styles.bar, { backgroundColor: tint }]}>
          <View style={[styles.fill, { backgroundColor: accent, width: `${progress * 100}%` }]} />
        </View>
      </TouchableOpacity>
      <View style={styles.times}>
        <Text style={styles.time}>{formatClock(position)}</Text>
        <Text style={styles.time}>-{formatClock(duration - position)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => seek(position - SKIP_SEC)}
          disabled={!loaded}
          style={[styles.skip, !loaded && styles.off]}
          accessibilityLabel={`Back ${SKIP_SEC} seconds`}
        >
          <Ionicons name="play-back" size={26} color={Colors.dark} />
          <Text style={styles.skipText}>{SKIP_SEC}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={togglePlay}
          style={[styles.play, { backgroundColor: accent }, !loaded && styles.off]}
          disabled={!loaded}
          accessibilityLabel={status.playing ? 'Pause' : finished ? 'Play again' : 'Play'}
        >
          <Ionicons
            name={status.playing ? 'pause' : finished ? 'refresh' : 'play'}
            size={34}
            color={Colors.white}
            style={!status.playing && !finished ? { marginLeft: 4 } : undefined}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => seek(position + SKIP_SEC)}
          disabled={!loaded}
          style={[styles.skip, !loaded && styles.off]}
          accessibilityLabel={`Forward ${SKIP_SEC} seconds`}
        >
          <Ionicons name="play-forward" size={26} color={Colors.dark} />
          <Text style={styles.skipText}>{SKIP_SEC}</Text>
        </TouchableOpacity>
      </View>
      {!loaded && (
        <Text style={styles.loading}>
          {slow ? 'Still loading. Check your connection, then come back to this session.' : 'Loading…'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  barHit: { paddingVertical: 10 },
  bar: { height: 6, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: 6 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.sm },
  play: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.4 },
  skip: { alignItems: 'center', padding: Spacing.sm },
  skipText: { fontFamily: Fonts.secondaryBold, fontSize: 10, color: Colors.gray, marginTop: -2 },
  loading: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, textAlign: 'center' },
});

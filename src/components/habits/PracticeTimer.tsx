import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Slider } from '../common/Slider';

const CHIME = require('../../../assets/sounds/chime.wav');

interface Props {
  accentColor: string;
  /** Seed length (clamped to 1–30); from the practice's default session length. */
  defaultMinutes: number;
  /** Fires with the minutes actually spent — full length, or elapsed on early end. */
  onDone: (minutes: number) => void;
  /** "I already did it" — go straight to logging without timing. */
  onSkip: () => void;
}

const MIN_MINUTES = 1;
const MAX_MINUTES = 30;
// Stop the looping chime after this long even if the user hasn't tapped through.
const ALARM_MAX_MS = 30_000;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// Haptics are iOS/Android-only and can throw on unsupported platforms — never let
// a buzz break the timer.
const haptic = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* no-op */
  }
};

/**
 * Countdown timer step shown as phase 1 of completing a time-in-stillness
 * practice (meditation, breathwork): pick 1–30 min, run a focused countdown.
 * At the end an alarm chime rings (looping, and audible even on silent) until
 * acknowledged; then the measured minutes are handed back to reflect and log.
 *
 * The screen is kept awake while a session runs. The chime uses expo-audio, a
 * native module — shipping it requires a new native build, not an OTA update.
 */
export const PracticeTimer: React.FC<Props> = ({ accentColor, defaultMinutes, onDone, onSkip }) => {
  const seed = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, defaultMinutes));
  const [phase, setPhase] = useState<'setup' | 'running' | 'finished'>('setup');
  const [paused, setPaused] = useState(false);
  const [minutes, setMinutes] = useState(seed);
  const [remaining, setRemaining] = useState(seed * 60);

  const player = useAudioPlayer(CHIME);

  // Keep the screen awake for the whole active session, so the device doesn't
  // auto-lock mid-meditation. Released when the session ends or the timer unmounts.
  useEffect(() => {
    if (phase === 'setup') return;
    activateKeepAwakeAsync('practice-timer');
    return () => {
      deactivateKeepAwake('practice-timer');
    };
  }, [phase]);

  // Countdown tick — one second at a time while running and not paused.
  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const id = setInterval(() => setRemaining((r) => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Reaching zero → ring the alarm and move to the "time's up" state.
  useEffect(() => {
    if (phase === 'running' && remaining === 0) {
      setPhase('finished');
    }
  }, [remaining, phase]);

  // Drive the chime + a safety auto-stop while in the finished state.
  useEffect(() => {
    if (phase !== 'finished') return;
    let stopTimeout: ReturnType<typeof setTimeout>;
    (async () => {
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      try {
        // Play even when the ringer is on silent — that's the point of an alarm.
        await setAudioModeAsync({ playsInSilentMode: true });
        player.loop = true;
        player.seekTo(0);
        player.play();
      } catch {
        /* audio is best-effort — the haptic + UI still fire */
      }
    })();
    stopTimeout = setTimeout(() => {
      try {
        player.pause();
      } catch {
        /* no-op */
      }
    }, ALARM_MAX_MS);
    return () => {
      clearTimeout(stopTimeout);
      try {
        player.pause();
      } catch {
        /* no-op */
      }
    };
  }, [phase, player]);

  const start = () => {
    setRemaining(minutes * 60);
    setPaused(false);
    setPhase('running');
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  };

  const endEarly = () => {
    const elapsed = minutes * 60 - remaining;
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    onDone(Math.max(1, Math.round(elapsed / 60)));
  };

  // Setup — pick a duration.
  if (phase === 'setup') {
    return (
      <View style={styles.wrap}>
        <View style={[styles.ring, { borderColor: Colors.border }]}>
          <Text style={[styles.big, { color: accentColor }]}>{minutes}</Text>
          <Text style={styles.unit}>min</Text>
        </View>
        <View style={styles.sliderWrap}>
          <View style={styles.sliderLabels}>
            <Text style={styles.edge}>{MIN_MINUTES} min</Text>
            <Text style={styles.edge}>{MAX_MINUTES} min</Text>
          </View>
          <Slider
            value={minutes}
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={1}
            onChange={(m) => {
              setMinutes(m);
              setRemaining(m * 60);
            }}
            color={accentColor}
          />
        </View>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: accentColor }]} onPress={start} activeOpacity={0.85}>
          <Ionicons name="play" size={18} color={Colors.white} />
          <Text style={styles.startText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>I already did it · skip timer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Time's up — alarm ringing until acknowledged.
  if (phase === 'finished') {
    return (
      <View style={styles.wrap}>
        <View style={[styles.ring, { borderColor: accentColor }]}>
          <Ionicons name="notifications" size={60} color={accentColor} />
          <Text style={[styles.unit, { marginTop: Spacing.xs }]}>time&apos;s up</Text>
        </View>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: accentColor }]}
          onPress={() => {
            try {
              player.pause();
            } catch {
              /* no-op */
            }
            onDone(minutes);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={Colors.white} />
          <Text style={styles.startText}>Stop &amp; reflect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Running — countdown.
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: accentColor }]}>
        <Text style={[styles.big, { color: accentColor }]}>{fmt(remaining)}</Text>
        <Text style={styles.unit}>{paused ? 'paused' : 'remaining'}</Text>
      </View>
      <View style={styles.runRow}>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: accentColor }]}
          onPress={() => setPaused((p) => !p)}
          activeOpacity={0.85}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={16} color={accentColor} />
          <Text style={[styles.secondaryText, { color: accentColor }]}>{paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: Colors.gray }]}
          onPress={endEarly}
          activeOpacity={0.85}
        >
          <Ionicons name="stop" size={16} color={Colors.gray} />
          <Text style={[styles.secondaryText, { color: Colors.gray }]}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  ring: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { fontFamily: Fonts.primaryBold, fontSize: 48 },
  unit: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  sliderWrap: { width: '100%', paddingHorizontal: Spacing.sm },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  edge: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    minWidth: 200,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  skip: { paddingVertical: Spacing.xs },
  skipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textDecorationLine: 'underline' },
  runRow: { flexDirection: 'row', gap: Spacing.md },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  secondaryText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, Spacing } from '../../../../constants/theme';
import type { HotColdStackParamList, ThermalKind } from '../../../../types/hotcold';
import { KIND_LABEL } from '../../../../data/hotcold';
import { clampDuration, formatClock, formatDuration, looksForgotten } from '../../../../services/hotcoldMath';
import { elapsedSec } from '../../../../services/sessionTimer';
import { Stepper } from '../../../../components/common/Stepper';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { showChoice, showConfirm } from '../../../../utils/alert';
import { useHotCold } from './HotColdContext';
import { hcs, KIND_COLOR } from './components/hotcoldStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<HotColdStackParamList, 'HotColdTimer'>;

/**
 * A count-up clock for a plunge. It's a start time, not a ticking counter, so
 * it keeps going with the phone locked or the app closed; the bell is a
 * scheduled notification (services/sessionBell.ts). Done hands the real time
 * to the log sheet on Home.
 */
export const HotColdTimerScreen: React.FC<Props> = ({ navigation, route }) => {
  const t = useCopy();
  const { timer, prefs, updatePrefs, startTimer, stopTimer, cancelTimer } = useHotCold();
  const [kind, setKind] = useState<ThermalKind>(route.params?.kind ?? 'cold');
  const [targetSec, setTargetSec] = useState(prefs.cold_target_sec);
  const [starting, setStarting] = useState(false);
  // State lags a fast double tap; a ref doesn't — one Start, one bell.
  const startingRef = useRef(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!timer) return;
    const tick = setInterval(() => setNow(new Date()), 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, [timer]);

  const start = async () => {
    if (startingRef.current || timer) return;
    startingRef.current = true;
    setStarting(true);
    try {
      if (kind === 'cold' && targetSec !== prefs.cold_target_sec) updatePrefs({ cold_target_sec: targetSec });
      // Heat gets no bell: the phone is usually outside the sauna.
      await startTimer(kind, kind === 'cold' ? targetSec : undefined);
      setNow(new Date());
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  const finish = (durationSec?: number) => {
    stopTimer(durationSec);
    navigation.goBack();
  };

  // A clock far past the bell was probably left running: ask before logging it.
  const done = () => {
    if (!timer) return;
    const elapsed = elapsedSec({ startedAt: timer.startedAt, plannedSec: 0 }, new Date());
    if (!looksForgotten(timer.kind, elapsed, timer.targetSec)) return finish();
    const kept = clampDuration(elapsed, timer.kind);
    const keepLabel = t('hotcold.timer.log', 'Log {time}', { time: formatDuration(kept) });
    if (timer.targetSec === undefined) {
      showConfirm(
        t('hotcold.timer.stillTiming.title', 'Still timing?'),
        t('hotcold.timer.stillTiming.message', 'The clock says {time}. If it kept running after you got out, set the real time on the next screen.', { time: formatDuration(elapsed) }),
        () => finish(),
        t('hotcold.timer.stillTiming.confirm', 'Log it')
      );
      return;
    }
    const bell = timer.targetSec;
    showChoice(
      t('hotcold.timer.stillCold.title', 'Still in the cold?'),
      t('hotcold.timer.stillCold.message', 'The clock says {time}, well past your {bell} bell. If it kept running after you got out, log your bell time and fix it on the next screen.', { time: formatDuration(elapsed), bell: formatDuration(bell) }),
      [
        { label: t('hotcold.timer.log', 'Log {time}', { time: formatDuration(bell) }), onPress: () => finish(bell) },
        { label: keepLabel, onPress: () => finish() },
      ]
    );
  };

  const cancel = () =>
    showConfirm(
      t('hotcold.timer.stop.title', 'Stop without logging?'),
      t('hotcold.timer.stop.message', 'The time won’t be saved.'),
      async () => {
        await cancelTimer();
        navigation.goBack();
      },
      t('hotcold.timer.stop.confirm', 'Stop'),
    );

  if (!timer) {
    return (
      <View style={[hcs.screen, styles.wrap]}>
        <SegmentedControl<ThermalKind>
          options={[
            { value: 'cold', label: t('hotcold.timer.cold', 'Cold') },
            { value: 'heat', label: t('hotcold.timer.heat', 'Heat') },
          ]}
          value={kind}
          onChange={setKind}
          accessibilityLabel="What you’re timing"
        />
        <View style={styles.middle}>
          {kind === 'cold' ? (
            <>
              <Copy id="hotcold.timer.bellAt" style={styles.label}>Bell at</Copy>
              <Stepper
                value={targetSec}
                onChange={setTargetSec}
                min={15}
                max={10 * 60}
                step={15}
                format={formatDuration}
                accessibilityLabel="Bell at"
              />
              <Copy id="hotcold.timer.keepsCounting" style={[hcs.muted, styles.centerText]}>
                The clock keeps counting after the bell. Lock your phone if you like.
              </Copy>
            </>
          ) : (
            <Copy id="hotcold.timer.noBellHeat" style={[hcs.body, styles.centerText]}>
              No bell for heat. Heat is hard on phones, so most people log afterwards instead.
            </Copy>
          )}
        </View>
        <TouchableOpacity
          style={[hcs.primaryBtn, { backgroundColor: KIND_COLOR[kind] }, starting && styles.dim]}
          onPress={start}
          disabled={starting}
        >
          <Copy id="hotcold.timer.start" style={hcs.primaryBtnText}>Start</Copy>
        </TouchableOpacity>
      </View>
    );
  }

  const elapsed = elapsedSec({ startedAt: timer.startedAt, plannedSec: 0 }, now);
  const past = timer.targetSec !== undefined && elapsed >= timer.targetSec;
  const color = KIND_COLOR[timer.kind];

  return (
    <View style={[hcs.screen, styles.wrap]}>
      <Text style={[styles.label, styles.centerText]}>{KIND_LABEL[timer.kind]}</Text>
      <View style={styles.middle}>
        <Text style={[styles.clock, { color }]} accessibilityRole="timer">
          {formatClock(elapsed)}
        </Text>
        <Copy
          id={timer.targetSec === undefined ? 'hotcold.timer.noBell' : past ? 'hotcold.timer.past' : 'hotcold.timer.bellAtTime'}
          style={[hcs.body, styles.centerText]}
          vars={{ time: timer.targetSec === undefined ? '' : formatDuration(timer.targetSec) }}
        >
          {timer.targetSec === undefined
            ? 'No bell'
            : past
              ? 'Past your {time}. Get out when you’re ready.'
              : 'Bell at {time}'}
        </Copy>
      </View>
      <TouchableOpacity style={[hcs.primaryBtn, { backgroundColor: color }]} onPress={done}>
        <Copy id="hotcold.timer.done" style={hcs.primaryBtnText}>Done</Copy>
      </TouchableOpacity>
      <TouchableOpacity style={hcs.textBtn} onPress={cancel}>
        <Copy id="hotcold.timer.stopLink" style={hcs.textBtnText}>Stop without logging</Copy>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  label: { fontFamily: Fonts.secondaryBold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: Colors.gray },
  clock: { fontFamily: Fonts.primaryBold, fontSize: 76, fontVariant: ['tabular-nums'] },
  centerText: { textAlign: 'center' },
  dim: { opacity: 0.5 },
});

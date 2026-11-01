import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, Spacing } from '../../../../constants/theme';
import type { HotColdStackParamList, ThermalKind } from '../../../../types/hotcold';
import { KIND_LABEL } from '../../../../data/hotcold';
import { formatClock, formatDuration } from '../../../../services/hotcoldMath';
import { elapsedSec } from '../../../../services/sessionTimer';
import { Stepper } from '../../../../components/common/Stepper';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { showConfirm } from '../../../../utils/alert';
import { useHotCold } from './HotColdContext';
import { hcs, KIND_COLOR } from './components/hotcoldStyle';

type Props = NativeStackScreenProps<HotColdStackParamList, 'HotColdTimer'>;

/**
 * A count-up clock for a plunge. It's a start time, not a ticking counter, so
 * it keeps going with the phone locked or the app closed; the bell is a
 * scheduled notification (services/sessionBell.ts). Done hands the real time
 * to the log sheet on Home.
 */
export const HotColdTimerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { timer, prefs, updatePrefs, startTimer, stopTimer, cancelTimer } = useHotCold();
  const [kind, setKind] = useState<ThermalKind>(route.params?.kind ?? 'cold');
  const [targetSec, setTargetSec] = useState(prefs.cold_target_sec);
  const [starting, setStarting] = useState(false);
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
    setStarting(true);
    if (kind === 'cold' && targetSec !== prefs.cold_target_sec) updatePrefs({ cold_target_sec: targetSec });
    // Heat gets no bell: the phone is usually outside the sauna.
    await startTimer(kind, kind === 'cold' ? targetSec : undefined);
    setNow(new Date());
    setStarting(false);
  };

  const done = () => {
    stopTimer();
    navigation.goBack();
  };

  const cancel = () =>
    showConfirm('Stop without logging?', 'The time won’t be saved.', async () => {
      await cancelTimer();
      navigation.goBack();
    }, 'Stop');

  if (!timer) {
    return (
      <View style={[hcs.screen, styles.wrap]}>
        <SegmentedControl<ThermalKind>
          options={[
            { value: 'cold', label: 'Cold' },
            { value: 'heat', label: 'Heat' },
          ]}
          value={kind}
          onChange={setKind}
          accessibilityLabel="What you’re timing"
        />
        <View style={styles.middle}>
          {kind === 'cold' ? (
            <>
              <Text style={styles.label}>Bell at</Text>
              <Stepper
                value={targetSec}
                onChange={setTargetSec}
                min={15}
                max={10 * 60}
                step={15}
                format={formatDuration}
                accessibilityLabel="Bell at"
              />
              <Text style={[hcs.muted, styles.centerText]}>
                The clock keeps counting after the bell. Lock your phone if you like.
              </Text>
            </>
          ) : (
            <Text style={[hcs.body, styles.centerText]}>
              No bell for heat. Heat is hard on phones, so most people log afterwards instead.
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[hcs.primaryBtn, { backgroundColor: KIND_COLOR[kind] }, starting && styles.dim]}
          onPress={start}
          disabled={starting}
        >
          <Text style={hcs.primaryBtnText}>Start</Text>
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
        <Text style={[hcs.body, styles.centerText]}>
          {timer.targetSec === undefined
            ? 'No bell'
            : past
              ? `Past your ${formatDuration(timer.targetSec)}. Get out when you’re ready.`
              : `Bell at ${formatDuration(timer.targetSec)}`}
        </Text>
      </View>
      <TouchableOpacity style={[hcs.primaryBtn, { backgroundColor: color }]} onPress={done}>
        <Text style={hcs.primaryBtnText}>Done</Text>
      </TouchableOpacity>
      <TouchableOpacity style={hcs.textBtn} onPress={cancel}>
        <Text style={hcs.textBtnText}>Stop without logging</Text>
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

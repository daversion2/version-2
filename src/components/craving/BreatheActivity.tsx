import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { BREATHING_CADENCES } from '../../data/cravings';

/**
 * Guided breathing with a user-chosen cadence. The circle grows on inhale,
 * settles on exhale, holds steady on holds; a light haptic marks each phase
 * change so it works eyes-closed.
 */
export const BreatheActivity: React.FC = () => {
  const [cadenceId, setCadenceId] = useState(BREATHING_CADENCES[0].id);
  const cadence = useMemo(
    () => BREATHING_CADENCES.find((c) => c.id === cadenceId) ?? BREATHING_CADENCES[0],
    [cadenceId]
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(cadence.phases[0].seconds);
  const [cycle, setCycle] = useState(1);
  const scale = useRef(new Animated.Value(0.8)).current;

  // Restart from the top whenever the cadence changes.
  useEffect(() => {
    setPhaseIndex(0);
    setCycle(1);
    scale.setValue(0.8);
  }, [cadenceId, scale]);

  // On a cadence switch, a render/effect can arrive before the reset effect
  // runs, with an index past the new cadence's phase list — clamp to phase 0.
  const safePhaseIndex = phaseIndex < cadence.phases.length ? phaseIndex : 0;

  // Drive one phase: animate the circle, count it down, then advance.
  useEffect(() => {
    const phase = cadence.phases[safePhaseIndex];
    setPhaseSecondsLeft(phase.seconds);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (phase.direction !== 'hold') {
      Animated.timing(scale, {
        toValue: phase.direction === 'in' ? 1.25 : 0.8,
        duration: phase.seconds * 1000,
        useNativeDriver: true,
      }).start();
    }

    let remaining = phase.seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setPhaseSecondsLeft(remaining);
        return;
      }
      clearInterval(interval);
      if (safePhaseIndex + 1 >= cadence.phases.length) {
        setCycle((c) => c + 1);
        setPhaseIndex(0);
      } else {
        setPhaseIndex(safePhaseIndex + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePhaseIndex, cadenceId]);

  const phase = cadence.phases[safePhaseIndex];

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Text style={styles.phaseLabel}>
          {phase.label} · {phaseSecondsLeft}
        </Text>
        <View style={styles.ring}>
          <Animated.View style={[styles.ball, { transform: [{ scale }] }]} />
        </View>
        <Text style={styles.cycleLabel}>Cycle {cycle} · follow the circle</Text>
      </View>

      <View style={styles.cadenceBlock}>
        <Text style={styles.cadenceLabel}>CADENCE</Text>
        <View style={styles.cadenceRow}>
          {BREATHING_CADENCES.map((c) => {
            const selected = c.id === cadenceId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCadenceId(c.id)}
              >
                <Text style={styles.chipName}>{c.label}</Text>
                <Text style={styles.chipDetail}>{c.detail}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  phaseLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#7AB8C0',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  ring: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: 'rgba(33,113,128,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
  },
  cycleLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
  },
  cadenceBlock: { paddingBottom: Spacing.md },
  cadenceLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cadenceRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(33,113,128,0.2)',
  },
  chipName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  chipDetail: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
});

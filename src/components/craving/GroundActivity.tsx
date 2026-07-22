import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { GROUND_STEPS } from '../../data/cravings';

/**
 * 5-4-3-2-1 sensory grounding. Tap-to-check only — no typing, because fine
 * motor + composition is exactly what's unavailable at peak urge.
 */
export const GroundActivity: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState(0);
  const [done, setDone] = useState(false);

  const step = GROUND_STEPS[stepIndex];

  const handleCheck = () => {
    const next = checked + 1;
    if (next < step.count) {
      setChecked(next);
      return;
    }
    if (stepIndex + 1 < GROUND_STEPS.length) {
      setStepIndex(stepIndex + 1);
      setChecked(0);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <Text style={styles.doneEmoji}>🖐</Text>
        <Text style={styles.doneTitle}>Grounded.</Text>
        <Text style={styles.doneText}>
          All five senses checked in. Notice where the craving is now compared
          to when you started — quieter waves are how this works.
        </Text>
        <TouchableOpacity
          style={styles.againButton}
          onPress={() => {
            setStepIndex(0);
            setChecked(0);
            setDone(false);
          }}
        >
          <Text style={styles.againText}>Go around again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remainingPath = GROUND_STEPS.slice(stepIndex + 1)
    .map((s) => `${s.count} ${s.title.replace('Things you can ', '').replace('Thing you can ', '')}`)
    .join(' · ');

  return (
    <View style={styles.container}>
      <Text style={styles.stepNum}>{step.count}</Text>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepSub}>{step.sub}</Text>

      <View style={styles.slots}>
        {Array.from({ length: step.count }, (_, i) => {
          const isChecked = i < checked;
          const isNext = i === checked;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.slot, isChecked && styles.slotChecked]}
              onPress={isNext ? handleCheck : undefined}
              disabled={!isNext}
              activeOpacity={0.7}
            >
              <View style={[styles.check, isChecked && styles.checkFilled]}>
                {isChecked && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={isChecked ? styles.slotTextDone : styles.slotText}>
                {isChecked
                  ? 'Found one'
                  : isNext
                    ? 'Tap when you’ve found one…'
                    : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {remainingPath.length > 0 && (
        <Text style={styles.pathline}>Next: {remainingPath}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.sm },
  stepNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: 72,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 76,
  },
  stepTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  stepSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  slots: { gap: Spacing.sm, marginTop: Spacing.lg },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  slotChecked: { backgroundColor: 'rgba(33,113,128,0.15)' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  slotText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  slotTextDone: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  pathline: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  doneEmoji: { fontSize: 44, marginBottom: Spacing.md },
  doneTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  doneText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 21,
  },
  againButton: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  againText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, BorderRadius, Spacing } from '../../../../../constants/theme';
import { CALM_LEVELS } from '../../../../../services/meditateMath';
import { MEDITATE_ACCENT, MEDITATE_TINT } from './meditateStyle';

interface Props {
  /** "How calm do you feel?" / "How calm do you feel now?" */
  question: string;
  value?: number;
  /** Tapping the chosen number again clears it — the answer is always optional. */
  onChange: (value: number | undefined) => void;
}

/**
 * One optional row, 1 (tense) to 5 (calm). Never blocks anything: skip it and
 * the session runs and saves the same.
 */
export const CalmScale: React.FC<Props> = ({ question, value, onChange }) => (
  <View style={styles.wrap}>
    <View style={styles.head}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.optional}>Optional</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.end}>Tense</Text>
      {CALM_LEVELS.map((n) => {
        const on = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.pill, on && styles.pillOn]}
            onPress={() => onChange(on ? undefined : n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Calm ${n} of 5${n === 1 ? ', tense' : n === 5 ? ', calm' : ''}`}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[styles.pillText, on && styles.pillTextOn]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.end}>Calm</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  question: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  optional: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  end: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, width: 38, textAlign: 'center' },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { borderColor: MEDITATE_ACCENT, backgroundColor: MEDITATE_TINT },
  pillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  pillTextOn: { color: MEDITATE_ACCENT },
});

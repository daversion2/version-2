import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { CALM_LEVELS } from '../../../../../services/meditateMath';
import { MEDITATE_ACCENT } from './meditateStyle';

interface Props {
  /** "How calm do you feel?" / "How calm do you feel now?" */
  question: string;
  /** A line under the question, e.g. "You started at 2." Defaults to "Optional". */
  note?: string;
  value?: number;
  /** Tapping the chosen number again clears it — the answer is always optional. */
  onChange: (value: number | undefined) => void;
}

/**
 * One optional row, 1 (tense) to 5 (calm). Never blocks anything: skip it and
 * the session runs and saves the same. Drawn to sit inside a white card.
 */
export const CalmScale: React.FC<Props> = ({ question, note = 'Optional', value, onChange }) => (
  <View style={styles.wrap}>
    <View style={styles.head}>
      <Text style={styles.question} accessibilityRole="header">
        {question}
      </Text>
      <Text style={styles.note}>{note}</Text>
    </View>
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={question}>
      {CALM_LEVELS.map((n) => {
        const on = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.tile, on && styles.tileOn]}
            onPress={() => onChange(on ? undefined : n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Calm ${n} of 5${n === 1 ? ', tense' : n === 5 ? ', calm' : ''}`}
          >
            <Text style={[styles.tileText, on && styles.tileTextOn]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <View style={styles.ends}>
      <Text style={styles.note}>Tense</Text>
      <Text style={styles.note}>Calm</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm + 4 },
  head: { gap: 2 },
  question: { ...TextStyles.headline, color: Colors.dark },
  note: { ...TextStyles.footnote, color: Colors.gray },
  row: { flexDirection: 'row', gap: Spacing.sm },
  tile: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: { backgroundColor: MEDITATE_ACCENT },
  tileText: { ...TextStyles.title3, color: Colors.dark },
  tileTextOn: { color: Colors.white },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
});

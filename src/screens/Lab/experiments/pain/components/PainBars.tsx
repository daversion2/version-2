import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { PAIN_ACCENT } from './painStyle';

/**
 * The last couple of weeks of pain, oldest first. A day with no check-in is a
 * grey dot, which reads differently from a day at 0 (a small accent stub).
 * MiniBars can't tell those apart, hence this one.
 */
export const PainBars: React.FC<{ values: (number | null)[]; height?: number }> = ({ values, height = 64 }) => (
  <View style={styles.wrap}>
    <View style={[styles.bars, { height }]}>
      {values.map((v, i) => (
        <View key={i} style={styles.col}>
          {v === null ? (
            <View style={styles.missing} />
          ) : (
            <View
              style={[
                styles.bar,
                { height: Math.max(3, (v / 10) * height), opacity: i === values.length - 1 ? 1 : 0.55 },
              ]}
            />
          )}
        </View>
      ))}
    </View>
    <View style={styles.ends}>
      <Text style={styles.end}>{values.length - 1} days ago</Text>
      <Text style={styles.end}>Today</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: 3, backgroundColor: PAIN_ACCENT },
  missing: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});

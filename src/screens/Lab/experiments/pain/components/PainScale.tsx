import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { PAIN_LEVELS } from '../../../../../services/painMath';
import { PAIN_ACCENT } from './painStyle';

/**
 * A 0–10 row: one tap picks a number. Used for pain (no pain → worst) and for
 * the activities (can't do it → as before). No red-to-green colouring: a high
 * number isn't a failure.
 */
export const PainScale: React.FC<{
  value?: number;
  onChange: (n: number) => void;
  low: string;
  high: string;
  accessibilityLabel: string;
}> = ({ value, onChange, low, high, accessibilityLabel }) => (
  <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
    <View style={styles.row}>
      {PAIN_LEVELS.map((n) => {
        const on = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.dot, on && styles.dotOn]}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${accessibilityLabel}: ${n}`}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[styles.num, on && styles.numOn]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <View style={styles.ends}>
      <Text style={styles.end}>{low}</Text>
      <Text style={styles.end}>{high}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 3 },
  dot: {
    flex: 1,
    maxWidth: 40,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { borderColor: PAIN_ACCENT, backgroundColor: PAIN_ACCENT },
  num: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  numOn: { color: Colors.white },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});

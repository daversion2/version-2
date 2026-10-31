import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Colors, TextStyles } from '../../constants/theme';
import { triggerTapHaptic } from '../../utils/haptics';

/**
 * iOS-style segmented control: a grey track with the chosen option on a raised
 * white pill. For 2–4 short options (Sit / Breathe / NSDR, W / M / 6M).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.segment, on && styles.segmentOn]}
            onPress={() => {
              if (on) return;
              triggerTapHaptic();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: Colors.fill },
  segment: { flex: 1, minHeight: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segmentOn: {
    backgroundColor: Colors.white,
    shadowColor: Colors.dark,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  label: { ...TextStyles.subhead, fontWeight: '500', color: Colors.dark },
  labelOn: { fontWeight: '600' },
});

import React from 'react';
import { View } from 'react-native';
import { Colors } from '../../constants/theme';

/**
 * A row-sized bar chart: the latest bar solid, the earlier ones faded, all
 * scaled to the tallest. An empty bar keeps a sliver so zero still reads as a
 * bar. Decorative — the row it sits in says the numbers.
 */
export const MiniBars: React.FC<{ values: number[]; color: string; width?: number; height?: number }> = ({
  values,
  color,
  width = 84,
  height = 28,
}) => {
  const max = Math.max(1, ...values);
  const gap = values.length > 5 ? 3 : 6;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  return (
    <View
      style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: v > 0 ? Math.max(4, (v / max) * height) : 3,
            borderRadius: 3,
            backgroundColor: v > 0 ? color : Colors.fill,
            opacity: v > 0 && i < values.length - 1 ? 0.4 : 1,
          }}
        />
      ))}
    </View>
  );
};

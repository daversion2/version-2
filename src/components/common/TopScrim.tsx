import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

/**
 * A strip of background behind the status bar, for redesigned screens that hide
 * the navigation bar: without it, content scrolls up under the clock. Render it
 * after the ScrollView, inside a flex: 1 container.
 */
export const TopScrim: React.FC = () => {
  const { top } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top, backgroundColor: Colors.lightGray }}
    />
  );
};

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { AvoidanceTab } from '../Home/AvoidanceTab';

// Thin screen wrapper so the self-contained AvoidanceTab component can live as a
// destination in the Training tab. (AvoidanceTab brings its own scroll + data.)
export const AvoidanceTrainingScreen: React.FC = () => (
  <View style={styles.screen}>
    <AvoidanceTab />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
});

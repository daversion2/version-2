import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { HomeSectionProps } from './types';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const GreetingSection: React.FC<HomeSectionProps> = React.memo(() => {
  return <Text style={styles.greeting}>{getGreeting()}</Text>;
});

const styles = StyleSheet.create({
  greeting: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
});

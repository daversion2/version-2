import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

const logo = require('../../../assets/Neuro-Nudge_Logo_Blue.png');

interface ScreenHeaderProps {
  title?: string;
  showGreeting?: boolean;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, showGreeting = false }) => {
  const displayText = showGreeting ? getGreeting() : title;

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      {displayText && <Text style={styles.title}>{displayText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
});

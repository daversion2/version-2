import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';

/**
 * Entry point for the Craving Crusher urge-surfing timer. Kept deliberately
 * lightweight — the moment a user needs this, every extra tap costs them.
 */
export const CravingCrusherSection: React.FC<HomeSectionProps> = React.memo(
  ({ callbacks }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => callbacks.onNavigate('CravingCrusher')}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="flash" size={20} color={Colors.white} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Craving Crusher</Text>
        <Text style={styles.sub}>
          Notice a pull? Start a timer and ride it out — urges peak, then pass.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
    </TouchableOpacity>
  )
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
    lineHeight: 16,
  },
});

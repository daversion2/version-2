import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  label: string;
  /** Ionicons name — the mini-app's manifest icon. */
  icon: string;
  accentColor: string;
  onPress: () => void;
}

/**
 * "Start workout" on a Today row whose habit has a mini-app behind it. Sits
 * under the row rather than replacing the 1–3 chips: the mini-app is one way
 * to do the habit, never the only way to check it off.
 */
export const MiniAppStartButton: React.FC<Props> = ({ label, icon, accentColor, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, { backgroundColor: accentColor }]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={Colors.white} />
    <Text style={styles.text}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  text: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Rule } from '../../types/rules';

interface Props {
  rule: Rule | null;
  onDismiss: () => void;
}

/**
 * Generic inline banner for admin-configured rules (surface: 'banner').
 * Rendered at the top of the Home screen; the X dismisses it for the session
 * (re-showing is governed by the rule's frequency cap).
 */
export const RuleBanner: React.FC<Props> = ({ rule, onDismiss }) => {
  if (!rule) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="megaphone-outline" size={20} color={Colors.primary} style={styles.icon} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{rule.content.title}</Text>
        <Text style={styles.body}>{rule.content.body}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.close} hitSlop={8}>
        <Ionicons name="close" size={18} color={Colors.gray} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary + '40',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 18,
  },
  close: {
    marginLeft: Spacing.sm,
  },
});

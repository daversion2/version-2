import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';
import { Rule } from '../../types/rules';

interface Props {
  rule: Rule | null;
  visible: boolean;
  onDismiss: () => void;
  /** Called when the CTA button is pressed (instead of onDismiss); the
   * handler is responsible for dismissing and executing the rule's
   * cta_target. Tapping outside the card always just dismisses. */
  onCtaPress?: () => void;
}

/**
 * Generic modal for admin-configured rules (surface: 'modal'). Title, body,
 * CTA label, and CTA target all come from the rule document — no code
 * deploy to change them.
 */
export const RuleModal: React.FC<Props> = ({ rule, visible, onDismiss, onCtaPress }) => {
  if (!rule) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="sparkles" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>{rule.content.title}</Text>
          <Text style={styles.body}>{rule.content.body}</Text>
          <Button
            title={rule.content.cta?.trim() || 'Got it'}
            onPress={onCtaPress ?? onDismiss}
            style={styles.button}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
});

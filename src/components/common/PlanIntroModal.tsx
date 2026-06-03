import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const PlanIntroModal: React.FC<Props> = ({ visible, onDismiss }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="clipboard" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Your habits have a game plan</Text>
          <Text style={styles.body}>
            Each habit comes with a built-in action plan — your cues, environment tweaks, and a minimum version for rough days.
          </Text>
          <View style={styles.tipRow}>
            <Ionicons name="hand-left-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.tipText}>
              Tap <Text style={styles.tipBold}>"My Plan"</Text> on any habit to see it. You can edit it anytime to make it yours.
            </Text>
          </View>
          <Button title="Got it" onPress={onDismiss} style={styles.button} />
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
    marginBottom: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    flex: 1,
  },
  tipBold: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  button: {
    width: '100%',
  },
});

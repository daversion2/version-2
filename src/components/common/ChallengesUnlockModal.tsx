import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onBrowse: () => void;
  onDismiss: () => void;
}

export const ChallengesUnlockModal: React.FC<Props> = ({ visible, onBrowse, onDismiss }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconContainer}>
            <Ionicons name="flash" size={40} color={Colors.white} />
          </View>
          <Text style={styles.unlocked}>Unlocked</Text>
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.body}>
            Habits are absolutely foundational — but challenges are what keep you growing and pushing your limits.
          </Text>
          <View style={styles.tipRow}>
            <Ionicons name="flash-outline" size={16} color={Colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.tipText}>
              Neuroscience shows that by purposefully getting outside of your comfort zone, you strengthen areas of your brain responsible for willpower. That's what challenges are all about.
            </Text>
          </View>
          <Text style={styles.flowText}>
            Pick or create a challenge, do it, reflect and lock it in.
          </Text>
          <Button title="Browse Challenges" onPress={onBrowse} style={styles.button} />
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  unlocked: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
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
    alignSelf: 'stretch',
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    flex: 1,
  },
  flowText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
});

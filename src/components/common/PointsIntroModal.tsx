import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const PointsIntroModal: React.FC<Props> = ({ visible, onDismiss }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="flash" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>XP</Text>
          <Text style={styles.body}>
            XP is the total friction you’ve pushed through. Every habit you log adds to it.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>
              <Text style={styles.bulletBold}>Harder days earn more</Text> — if it felt tough but you did it anyway, it counts for more.
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bulletBold}>It only goes up</Text> — a missed day never takes XP away. It’s a record of what you’ve already overcome.
            </Text>
          </View>
          <Text style={styles.footer}>Streaks show consistency. XP shows how much you’ve taken on.</Text>
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
  bulletList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bullet: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  bulletBold: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.dark,
  },
  footer: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
});

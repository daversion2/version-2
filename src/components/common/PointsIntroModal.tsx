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
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="flash" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Willpower Points</Text>
          <Text style={styles.body}>
            Every time you complete a habit, challenge, or reflection, you earn Willpower Points.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>
              <Text style={styles.bulletBold}>Streaks multiply your points</Text> — the more consecutive days you show up, the bigger the bonus.
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bulletBold}>Harder days earn more</Text> — if it felt tough but you did it anyway, you get extra credit.
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bulletBold}>Level up over time</Text> — your total points unlock new levels and titles.
            </Text>
          </View>
          <Text style={styles.footer}>Just keep showing up. The points take care of themselves.</Text>
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

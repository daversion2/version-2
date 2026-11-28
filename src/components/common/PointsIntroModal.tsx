import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';
import { Copy } from './Copy';
import { useCopy } from '../../context/CopyContext';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const PointsIntroModal: React.FC<Props> = ({ visible, onDismiss }) => {
  const t = useCopy();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="flash" size={36} color={Colors.primary} style={styles.icon} />
          <Copy id="common.points.title" style={styles.title}>{'XP'}</Copy>
          <Copy id="common.points.body" style={styles.body}>
            {'XP is the total friction you’ve pushed through. Every session you rate adds to it.'}
          </Copy>
          <View style={styles.bulletList}>
            <Copy id="common.points.harder" style={styles.bullet} boldStyle={styles.bulletBold}>
              {'**Harder days earn more** — if it felt tough but you did it anyway, it counts for more.'}
            </Copy>
            <Copy id="common.points.onlyUp" style={styles.bullet} boldStyle={styles.bulletBold}>
              {'**It only goes up** — a missed day never takes XP away. It’s a record of what you’ve already overcome.'}
            </Copy>
          </View>
          <Copy id="common.points.footer" style={styles.footer}>
            {'Streaks show consistency. XP shows how much you’ve taken on.'}
          </Copy>
          <Button title={t('common.points.gotIt', 'Got it')} onPress={onDismiss} style={styles.button} />
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

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

/**
 * The Training unlock, fired once the user has a few practices behind them.
 *
 * Replaces the challenges-only unlock: the Training tab holds both Challenges
 * and Avoidance Training, and the latter previously had no introduction
 * anywhere in the app. Both are named here so the tab's contents are known
 * rather than discovered by accident — one moment, not two interruptions.
 */
interface Props {
  visible: boolean;
  onOpenTraining: () => void;
  onDismiss: () => void;
}

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'flash',
    title: 'Challenges',
    body: 'Set yourself a deliberate test — a single push past what today already asks of you.',
  },
  {
    icon: 'barbell',
    title: 'Avoidance Training',
    body: 'Take on the things you keep putting off, one at a time, until they stop having a hold.',
  },
];

export const TrainingUnlockModal: React.FC<Props> = ({ visible, onOpenTraining, onDismiss }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconContainer}>
            <Ionicons name="barbell" size={40} color={Colors.white} />
          </View>
          <Text style={styles.unlocked}>Unlocked</Text>
          <Text style={styles.title}>Training</Text>
          <Text style={styles.body}>
            Your practices are the foundation. Training is where you go past them — two ways to
            put yourself somewhere uncomfortable on purpose.
          </Text>

          <View style={styles.list}>
            {ITEMS.map((item) => (
              <View key={item.title} style={styles.item}>
                <View style={styles.itemIcon}>
                  <Ionicons name={item.icon} size={18} color={Colors.primary} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemText}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tipRow}>
            <Ionicons name="flash-outline" size={16} color={Colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.tipText}>
              Choosing discomfort — rather than having it chosen for you — is what recruits the
              prefrontal circuits behind self-control. The difficulty isn't the cost of training.
              It's the mechanism.
            </Text>
          </View>

          <Text style={styles.flowText}>Find both under the Training tab.</Text>
          <Button title="Open Training" onPress={onOpenTraining} style={styles.button} />
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
    marginBottom: Spacing.lg,
  },
  list: { alignSelf: 'stretch', gap: Spacing.md, marginBottom: Spacing.lg },
  item: { flexDirection: 'row', gap: Spacing.sm + 2, alignItems: 'flex-start' },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(33,113,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: 2,
  },
  itemText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
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

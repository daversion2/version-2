import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { NeuroscienceTidbit } from '../../types';

interface HabitTidbitModalProps {
  visible: boolean;
  tidbit: NeuroscienceTidbit | null;
  onLearnMore: () => void;
  onDismiss: () => void;
}

export const HabitTidbitModal: React.FC<HabitTidbitModalProps> = ({
  visible,
  tidbit,
  onLearnMore,
  onDismiss,
}) => {
  if (!tidbit) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Ionicons name="flash" size={18} color={Colors.primary} />
            <Text style={styles.headerLabel}>Your brain right now</Text>
          </View>

          <Text style={styles.tidbitText}>{tidbit.text}</Text>

          {tidbit.extended_text ? (
            <TouchableOpacity style={styles.learnMoreRow} onPress={onLearnMore} activeOpacity={0.7}>
              <Text style={styles.learnMoreText}>Learn more</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.gotItButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  learnMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.lg,
  },
  learnMoreText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  gotItButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  gotItText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

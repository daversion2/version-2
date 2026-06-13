import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface AddActivityMenuProps {
  visible: boolean;
  challengesUnlocked: boolean;
  habitsRemaining: number;
  onSelectHabit: () => void;
  onSelectChallenge: () => void;
  onClose: () => void;
}

/**
 * Bottom-sheet chooser for adding a new activity (Habit or Challenge).
 * Challenges appear locked until the user has completed 3 habits.
 */
export const AddActivityMenu: React.FC<AddActivityMenuProps> = ({
  visible,
  challengesUnlocked,
  habitsRemaining,
  onSelectHabit,
  onSelectChallenge,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add activity</Text>
          <Text style={styles.subtitle}>What would you like to add?</Text>

          {/* Habit */}
          <TouchableOpacity style={styles.option} onPress={onSelectHabit} activeOpacity={0.7}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="repeat" size={22} color={Colors.primary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionName}>Habit</Text>
              <Text style={styles.optionDesc}>A repeatable action you do each week</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </TouchableOpacity>

          {/* Challenge */}
          {challengesUnlocked ? (
            <TouchableOpacity style={styles.option} onPress={onSelectChallenge} activeOpacity={0.7}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.secondary + '15' }]}>
                <Ionicons name="flash" size={22} color={Colors.secondary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>Challenge</Text>
                <Text style={styles.optionDesc}>A focused push toward a specific goal</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.option, styles.optionLocked]}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.lightGray }]}>
                <Ionicons name="lock-closed" size={20} color={Colors.gray} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionName, { color: Colors.gray }]}>Challenge</Text>
                <Text style={styles.optionDesc}>
                  {habitsRemaining} more habit{habitsRemaining !== 1 ? 's' : ''} to unlock
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  optionLocked: {
    opacity: 0.7,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  optionDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});

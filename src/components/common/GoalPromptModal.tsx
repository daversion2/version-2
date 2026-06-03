import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onSetupGoal: () => void;
  onDismiss: () => void;
}

export const GoalPromptModal: React.FC<Props> = ({ visible, onSetupGoal, onDismiss }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="flag" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Ready to set a goal?</Text>
          <Text style={styles.body}>
            You've been building your habits — nice work. A goal gives them direction and purpose, so every small action adds up to something bigger.
          </Text>
          <Button title="Set My Goal" onPress={onSetupGoal} style={styles.button} />
          <TouchableOpacity onPress={onDismiss} style={styles.laterBtn}>
            <Text style={styles.laterText}>I'll do this later</Text>
          </TouchableOpacity>
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
  laterBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
  },
  laterText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

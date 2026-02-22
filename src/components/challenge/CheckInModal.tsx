import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  dayNumber: number;
  onConfirm: (succeeded: boolean, note?: string) => void;
  onClose: () => void;
}

export const CheckInModal: React.FC<Props> = ({
  visible,
  dayNumber,
  onConfirm,
  onClose,
}) => {
  const [succeeded, setSucceeded] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (succeeded === null) return;
    setLoading(true);
    await onConfirm(succeeded, note.trim() || undefined);
    setLoading(false);
    // Reset state
    setSucceeded(null);
    setNote('');
  };

  const handleClose = () => {
    setSucceeded(null);
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Day {dayNumber} Check-in</Text>

          <Text style={styles.question}>
            Did you stick to your challenge today?
          </Text>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                succeeded === true && styles.optionSelected,
                succeeded === true && styles.successSelected,
              ]}
              onPress={() => setSucceeded(true)}
            >
              <Text style={[styles.optionIcon, succeeded === true && styles.optionIconSelected]}>
                ✓
              </Text>
              <Text style={[styles.optionText, succeeded === true && styles.optionTextSelected]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                succeeded === false && styles.optionSelected,
                succeeded === false && styles.failSelected,
              ]}
              onPress={() => setSucceeded(false)}
            >
              <Text style={[styles.optionIcon, succeeded === false && styles.optionIconSelected]}>
                ✗
              </Text>
              <Text style={[styles.optionText, succeeded === false && styles.optionTextSelected]}>
                No
              </Text>
            </TouchableOpacity>
          </View>

          <InputField
            label="Quick note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="How did today go?"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Confirm Check-in"
            onPress={handleConfirm}
            disabled={succeeded === null}
            loading={loading}
            style={styles.confirmButton}
          />

          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  question: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionSelected: {
    borderWidth: 2,
  },
  successSelected: {
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success,
  },
  failSelected: {
    backgroundColor: Colors.fail + '15',
    borderColor: Colors.fail,
  },
  optionIcon: {
    fontSize: 24,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  optionIconSelected: {
    color: Colors.dark,
  },
  optionText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  optionTextSelected: {
    color: Colors.dark,
  },
  confirmButton: {
    marginTop: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    padding: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});

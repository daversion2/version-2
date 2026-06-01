import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';

interface LogProgressModalProps {
  visible: boolean;
  metricName: string;
  onLog: (value: number) => void;
  onDismiss: () => void;
}

export const LogProgressModal: React.FC<LogProgressModalProps> = ({
  visible,
  metricName,
  onLog,
  onDismiss,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleLog = () => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) return;
    onLog(num);
    setInputValue('');
  };

  const handleDismiss = () => {
    setInputValue('');
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="add-circle-outline" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Log today's progress</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="e.g., 20"
              placeholderTextColor={Colors.gray}
              keyboardType="numeric"
              autoFocus
            />
            {metricName ? (
              <Text style={styles.metricLabel}>{metricName}</Text>
            ) : null}
          </View>

          <Button
            title="Log"
            onPress={handleLog}
            style={styles.button}
          />

          <Pressable onPress={handleDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
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
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  button: {
    width: '100%',
  },
  cancelButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});

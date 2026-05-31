import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { VisualizationSettings } from '../../types';

interface VisualizationPromptModalProps {
  visible: boolean;
  onSave: (settings: VisualizationSettings) => void;
  onDismiss: () => void;
}

export const VisualizationPromptModal: React.FC<VisualizationPromptModalProps> = ({
  visible,
  onSave,
  onDismiss,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  const handleSave = () => {
    if (enabled) {
      onSave({ enabled: true, frequency });
    } else {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="eye-outline" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Visualize your success</Text>
          <Text style={styles.body}>
            Research shows that regularly picturing yourself achieving a goal strengthens neural pathways
            associated with the actions needed to get there.
          </Text>

          {/* Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setEnabled(!enabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleLabel}>Visualize regularly</Text>
            <View style={[styles.toggle, enabled && styles.toggleActive]}>
              <View style={[styles.toggleKnob, enabled && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

          {/* Frequency picker */}
          {enabled && (
            <View style={styles.frequencyRow}>
              <TouchableOpacity
                style={[styles.frequencyOption, frequency === 'daily' && styles.frequencyOptionActive]}
                onPress={() => setFrequency('daily')}
              >
                <Text style={[styles.frequencyText, frequency === 'daily' && styles.frequencyTextActive]}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.frequencyOption, frequency === 'weekly' && styles.frequencyOptionActive]}
                onPress={() => setFrequency('weekly')}
              >
                <Text style={[styles.frequencyText, frequency === 'weekly' && styles.frequencyTextActive]}>Weekly</Text>
              </TouchableOpacity>
            </View>
          )}

          <Button title="Get started" onPress={handleSave} style={styles.button} />

          <TouchableOpacity onPress={onDismiss} style={styles.skipButton}>
            <Text style={styles.skipText}>Not now</Text>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  frequencyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  frequencyText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  frequencyTextActive: {
    color: Colors.primary,
  },
  button: {
    width: '100%',
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});

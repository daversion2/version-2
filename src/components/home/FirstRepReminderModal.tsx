import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface FirstRepReminderModalProps {
  visible: boolean;
  /** Display name of the practice the reminder will attach to. */
  practiceName: string;
  /** Called with an 'HH:mm' time when the user picks a slot. */
  onPickTime: (time: string) => void;
  onDismiss: () => void;
}

const TIME_OPTIONS: { time: string; label: string; caption: string }[] = [
  { time: '07:00', label: 'Morning', caption: '7:00 AM' },
  { time: '12:00', label: 'Midday', caption: '12:00 PM' },
  { time: '18:00', label: 'Evening', caption: '6:00 PM' },
];

/**
 * Shown once, right after the user's first-ever completed rep — the moment
 * they're most willing to commit to the next one. Picking a time sets a daily
 * reminder on their practice (and requests notification permission while
 * goodwill is highest).
 */
export const FirstRepReminderModal: React.FC<FirstRepReminderModalProps> = ({
  visible,
  practiceName,
  onPickTime,
  onDismiss,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="alarm-outline" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Lock in tomorrow's rep</Text>
        <Text style={styles.body}>
          You did the thing today. Pick a time and we'll call the next one — {practiceName},
          tomorrow.
        </Text>

        <View style={styles.options}>
          {TIME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.time}
              style={styles.option}
              onPress={() => onPickTime(option.time)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionCaption}>{option.caption}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
          <Text style={styles.dismissText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.md,
  },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  optionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  optionCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  dismiss: { paddingVertical: Spacing.sm },
  dismissText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';
import { hidePointsAlertForToday } from '../../services/alertPreferences';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

export const PointsAlertModal: React.FC<Props> = ({
  visible,
  title,
  message,
  onDismiss,
}) => {
  const [dontShowChecked, setDontShowChecked] = useState(false);

  const handleDismiss = async () => {
    if (dontShowChecked) {
      await hidePointsAlertForToday();
    }
    setDontShowChecked(false);
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setDontShowChecked(!dontShowChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, dontShowChecked && styles.checkboxChecked]}>
              {dontShowChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Don't show for the rest of the day</Text>
          </TouchableOpacity>

          <Button title="OK" onPress={handleDismiss} style={styles.okButton} />
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
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    flex: 1,
  },
  okButton: {
    width: '100%',
  },
});

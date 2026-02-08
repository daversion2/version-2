import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  habitName: string;
  onSubmit: (difficulty: 'easy' | 'challenging', notes?: string) => void;
  onCancel: () => void;
}

export const HabitCompletionModal: React.FC<Props> = ({
  visible,
  habitName,
  onSubmit,
  onCancel,
}) => {
  const [selected, setSelected] = useState<'easy' | 'challenging' | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected, notes.trim() || undefined);
    setSelected(null);
    setNotes('');
  };

  const handleCancel = () => {
    setSelected(null);
    setNotes('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{habitName}</Text>
          <Text style={styles.subtitle}>How was it?</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.option,
                selected === 'easy' && styles.optionActiveEasy,
              ]}
              onPress={() => setSelected('easy')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionNum, selected === 'easy' && styles.optionTextActive]}>
                1
              </Text>
              <Text style={[styles.optionLabel, selected === 'easy' && styles.optionTextActive]}>
                Easy day
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selected === 'challenging' && styles.optionActiveChallenging,
              ]}
              onPress={() => setSelected('challenging')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionNum, selected === 'challenging' && styles.optionTextActive]}>
                2
              </Text>
              <Text style={[styles.optionLabel, selected === 'challenging' && styles.optionTextActive]}>
                Challenging today
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add notes (optional)"
            placeholderTextColor={Colors.gray}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />

          <View style={styles.actions}>
            <Button
              title="Log Habit"
              onPress={handleSubmit}
              disabled={!selected}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
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
    maxWidth: 400,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActiveEasy: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  optionActiveChallenging: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
  },
  optionNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  optionLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  optionTextActive: {
    color: Colors.white,
  },
  notesInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

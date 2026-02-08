import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  challengeName: string;
  currentDifficulty: number;
  onSubmit: (newDifficulty: number) => void;
  onCancel: () => void;
}

const DIFFICULTIES = [1, 2, 3, 4, 5];

export const EditDifficultyModal: React.FC<Props> = ({
  visible,
  challengeName,
  currentDifficulty,
  onSubmit,
  onCancel,
}) => {
  const [selected, setSelected] = useState(currentDifficulty);

  // Reset to current difficulty when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(currentDifficulty);
    }
  }, [visible, currentDifficulty]);

  const handleSubmit = () => {
    onSubmit(selected);
  };

  const handleCancel = () => {
    setSelected(currentDifficulty);
    onCancel();
  };

  const pointsDelta = selected - currentDifficulty;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Edit Difficulty</Text>
          <Text style={styles.challengeName} numberOfLines={2}>
            {challengeName}
          </Text>

          <Text style={styles.sectionLabel}>Select actual difficulty:</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.difficultyOption,
                  selected === diff && styles.difficultySelected,
                ]}
                onPress={() => setSelected(diff)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.difficultyNum,
                    selected === diff && styles.difficultyNumSelected,
                  ]}
                >
                  {diff}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pointsPreview}>
            <Text style={styles.pointsLabel}>Points change:</Text>
            <Text
              style={[
                styles.pointsDelta,
                pointsDelta > 0 && styles.pointsPositive,
                pointsDelta < 0 && styles.pointsNegative,
              ]}
            >
              {pointsDelta > 0 ? '+' : ''}
              {pointsDelta}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Update"
              onPress={handleSubmit}
              disabled={selected === currentDifficulty}
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
  challengeName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultySelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
  },
  difficultyNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  difficultyNumSelected: {
    color: Colors.white,
  },
  pointsPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
  },
  pointsLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  pointsDelta: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  pointsPositive: {
    color: Colors.success,
  },
  pointsNegative: {
    color: Colors.fail,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { Nudge } from '../../types';

interface HabitLinkingModalProps {
  visible: boolean;
  habits: Nudge[];
  onLink: (habitId: string) => void;
  onCreateNew: () => void;
  onSkip: () => void;
}

export const HabitLinkingModal: React.FC<HabitLinkingModalProps> = ({
  visible,
  habits,
  onLink,
  onCreateNew,
  onSkip,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      onLink(selectedId);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onSkip}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons name="link-outline" size={36} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Link a tracking habit</Text>
          <Text style={styles.body}>
            Each time you complete this habit, it'll automatically count toward your total.
          </Text>

          {habits.length > 0 ? (
            <ScrollView style={styles.habitList} nestedScrollEnabled>
              {habits.map((habit) => (
                <TouchableOpacity
                  key={habit.id}
                  style={[
                    styles.habitRow,
                    selectedId === habit.id && styles.habitRowSelected,
                  ]}
                  onPress={() => setSelectedId(habit.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.radio,
                    selectedId === habit.id && styles.radioSelected,
                  ]}>
                    {selectedId === habit.id && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                    <Text style={styles.habitMeta}>
                      {habit.target_count_per_week}x per week
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noHabitsContainer}>
              <Text style={styles.noHabitsText}>
                No active habits yet.
              </Text>
            </View>
          )}

          {selectedId ? (
            <Button title="Link this habit" onPress={handleConfirm} style={styles.button} />
          ) : (
            <Button
              title="Create a new habit"
              variant="outline"
              onPress={onCreateNew}
              style={styles.button}
            />
          )}

          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
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
    maxHeight: '80%',
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
  habitList: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  habitRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  habitInfo: {
    flex: 1,
    gap: 2,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  habitMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  noHabitsContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  noHabitsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
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

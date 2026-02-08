import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { Nudge, HabitDifficulty } from '../../types';

interface Props {
  visible: boolean;
  date: string;
  habits: Nudge[];
  loading?: boolean;
  onSubmit: (habitId: string, habitName: string, difficulty: HabitDifficulty) => void;
  onCancel: () => void;
}

export const BackdateHabitModal: React.FC<Props> = ({
  visible,
  date,
  habits,
  loading = false,
  onSubmit,
  onCancel,
}) => {
  const [selectedHabit, setSelectedHabit] = useState<Nudge | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<HabitDifficulty | null>(null);

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedHabit(null);
      setSelectedDifficulty(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!selectedHabit || !selectedDifficulty) return;
    onSubmit(selectedHabit.id, selectedHabit.name, selectedDifficulty);
  };

  const handleCancel = () => {
    setSelectedHabit(null);
    setSelectedDifficulty(null);
    onCancel();
  };

  const renderHabitItem = ({ item }: { item: Nudge }) => (
    <TouchableOpacity
      style={[
        styles.habitItem,
        selectedHabit?.id === item.id && styles.habitItemSelected,
      ]}
      onPress={() => setSelectedHabit(item)}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.habitName,
          selectedHabit?.id === item.id && styles.habitNameSelected,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Add Forgotten Habit</Text>
          <Text style={styles.subtitle}>For {date}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : habits.length === 0 ? (
            <Text style={styles.emptyText}>All habits have been logged for this day.</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Select a habit:</Text>
              <FlatList
                data={habits}
                keyExtractor={(item) => item.id}
                renderItem={renderHabitItem}
                style={styles.habitList}
                showsVerticalScrollIndicator={false}
              />

              {selectedHabit && (
                <>
                  <Text style={styles.sectionLabel}>How was it?</Text>
                  <View style={styles.difficultyRow}>
                    <TouchableOpacity
                      style={[
                        styles.difficultyOption,
                        selectedDifficulty === 'easy' && styles.difficultyActiveEasy,
                      ]}
                      onPress={() => setSelectedDifficulty('easy')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.difficultyNum,
                          selectedDifficulty === 'easy' && styles.difficultyTextActive,
                        ]}
                      >
                        1
                      </Text>
                      <Text
                        style={[
                          styles.difficultyLabel,
                          selectedDifficulty === 'easy' && styles.difficultyTextActive,
                        ]}
                      >
                        Easy day
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.difficultyOption,
                        selectedDifficulty === 'challenging' && styles.difficultyActiveChallenging,
                      ]}
                      onPress={() => setSelectedDifficulty('challenging')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.difficultyNum,
                          selectedDifficulty === 'challenging' && styles.difficultyTextActive,
                        ]}
                      >
                        2
                      </Text>
                      <Text
                        style={[
                          styles.difficultyLabel,
                          selectedDifficulty === 'challenging' && styles.difficultyTextActive,
                        ]}
                      >
                        Challenging
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          <View style={styles.actions}>
            {habits.length > 0 && (
              <Button
                title="Add Habit"
                onPress={handleSubmit}
                disabled={!selectedHabit || !selectedDifficulty}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={habits.length === 0 ? 'Close' : 'Cancel'}
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
    maxHeight: '80%',
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
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  habitList: {
    maxHeight: 150,
    marginBottom: Spacing.sm,
  },
  habitItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  habitItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  habitName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  habitNameSelected: {
    color: Colors.white,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  difficultyActiveEasy: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  difficultyActiveChallenging: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
  },
  difficultyNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  difficultyLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  difficultyTextActive: {
    color: Colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
});

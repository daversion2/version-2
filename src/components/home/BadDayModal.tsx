import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Nudge } from '../../types';

interface BadDayModalProps {
  visible: boolean;
  habits: Nudge[];
  onCommit: (habitId: string) => void;
  onDismiss: () => void;
}

export const BadDayModal: React.FC<BadDayModalProps> = ({
  visible,
  habits,
  onCommit,
  onDismiss,
}) => {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setSelectedHabitId(null);
  }, [visible]);

  if (!visible) return null;

  const handleGotIt = () => {
    if (selectedHabitId) {
      onCommit(selectedHabitId);
    } else {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconRow}>
            <Ionicons name="sunny-outline" size={36} color={Colors.secondary} />
          </View>

          {/* Header */}
          <Text style={styles.title}>Tomorrow is a fresh start</Text>

          {/* Neuroscience tidbit */}
          <View style={styles.tidbitCard}>
            <Ionicons name="bulb-outline" size={16} color={Colors.primary} style={styles.tidbitIcon} />
            <Text style={styles.tidbitText}>
              When you plan ahead, your prefrontal cortex pre-activates the neural pathways you'll need — making follow-through 2-3x more likely. Even a tiny action keeps the habit circuit alive.
            </Text>
          </View>

          {/* Prompt */}
          <Text style={styles.prompt}>
            Pick one habit for tomorrow — even a tiny version counts:
          </Text>

          {/* Habit list */}
          <ScrollView style={styles.habitList} showsVerticalScrollIndicator={false}>
            {habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  selectedHabitId === habit.id && styles.habitCardSelected,
                ]}
                onPress={() => setSelectedHabitId(habit.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.habitText,
                    selectedHabitId === habit.id && styles.habitTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {habit.name}
                </Text>
                {selectedHabitId === habit.id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Got It button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGotIt}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {selectedHabitId ? "I'm In" : 'Got It'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    padding: Spacing.xs,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tidbitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '0A',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tidbitIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    flex: 1,
  },
  prompt: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  habitList: {
    maxHeight: 200,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  habitCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  habitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  habitTextSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

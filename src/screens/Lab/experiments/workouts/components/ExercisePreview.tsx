import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { hasHowTo, thumbFor } from './exerciseHowTo';
import { KIND_LABELS } from '../../../../../data/workoutExercises';
import { exerciseSubtitle } from '../../../../../services/exerciseLibrary';
import { Exercise } from '../../../../../types/workouts';
import { ExerciseDemoCard } from './ExerciseDemoCard';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

const THUMB = 52;

/** Is there anything to show for this exercise — photos or a written how-to? */
export const hasPreview = hasHowTo;

/**
 * The exercise's start photo, small, for a list row: you can tell a pull-up
 * from a chin-up before picking. A plain tile when there's no photo, so rows
 * line up. Tapping it opens the preview, when there's one to open.
 */
export const ExerciseThumb: React.FC<{ exercise: Exercise; onPress?: () => void }> = ({ exercise, onPress }) => {
  const photo = thumbFor(exercise.id);
  const tile = photo ? (
    <Image source={photo} style={styles.thumb} resizeMode="cover" />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty]}>
      <Ionicons name="barbell-outline" size={22} color={Colors.gray} />
    </View>
  );
  if (!onPress || !hasPreview(exercise.id)) return <View style={styles.thumbWrap}>{tile}</View>;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={6}
      style={styles.thumbWrap}
      accessibilityRole="button"
      accessibilityLabel={`See how to do ${exercise.name}`}
    >
      {tile}
      <View style={styles.expand}>
        <Ionicons name="expand" size={10} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
};

/**
 * A closer look before picking: the start and end photos with their cues (or
 * the written positions, when there are no photos yet), and a button to add it.
 */
export const ExercisePreviewModal: React.FC<{
  exercise: Exercise | null;
  addLabel: string;
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
}> = ({ exercise, addLabel, onAdd, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!exercise} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {exercise && (
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxl + insets.bottom + 70 }]}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={ws.muted}>{exerciseSubtitle(exercise, KIND_LABELS[exercise.kind])}</Text>
            <ExerciseDemoCard exerciseId={exercise.id} />
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <TouchableOpacity style={ws.primaryBtn} onPress={() => onAdd(exercise)} accessibilityRole="button">
              <Text style={ws.primaryBtnText}>{addLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  thumbWrap: { marginRight: Spacing.md },
  thumb: { width: THUMB, height: THUMB, borderRadius: BorderRadius.sm, backgroundColor: Colors.lightGray },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  expand: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: { flex: 1, backgroundColor: Colors.lightGray },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  close: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: WORKOUTS_ACCENT },
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.lightGray,
  },
});

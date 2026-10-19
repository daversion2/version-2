import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { Exercise, MuscleGroup } from '../../../../../types/workouts';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../../../../data/workoutExercises';
import { WORKOUTS_ACCENT, WORKOUTS_TINT } from './workoutsStyle';

const ICONS: Record<MuscleGroup, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  chest: 'weight-lifter',
  back: 'rowing',
  shoulders: 'human-handsup',
  legs: 'run',
  arms: 'arm-flex',
  core: 'yoga',
  full_body: 'human',
};

interface Props {
  exercises: Exercise[];
  onOpen: (muscle: MuscleGroup) => void;
  /** Ids already picked, repeats included — each tile shows how many of its own are in. */
  selectedIds?: string[];
}

/**
 * The library's front door: one tile per body part, two to a row. A tap
 * opens that body part's exercises; search skips past this altogether.
 */
export const BodyPartTiles: React.FC<Props> = ({ exercises, onOpen, selectedIds = [] }) => (
  <View style={styles.grid}>
    {MUSCLE_GROUP_ORDER.map((muscle) => {
      const inGroup = exercises.filter((e) => e.muscle === muscle);
      // Counts repeats: pull-ups picked twice is two.
      const picked = selectedIds.filter((id) => inGroup.some((e) => e.id === id)).length;
      return (
        <TouchableOpacity
          key={muscle}
          style={[styles.tile, picked > 0 && styles.tilePicked]}
          onPress={() => onOpen(muscle)}
          accessibilityRole="button"
          accessibilityLabel={`${MUSCLE_GROUP_LABELS[muscle]}, ${inGroup.length} exercises${
            picked ? `, ${picked} picked` : ''
          }`}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={ICONS[muscle]} size={26} color={WORKOUTS_ACCENT} />
          </View>
          <Text style={styles.label}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
          <Text style={styles.count}>
            {inGroup.length} {inGroup.length === 1 ? 'exercise' : 'exercises'}
          </Text>
          {picked > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{picked}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tile: {
    width: '48.5%',
    gap: 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tilePicked: { borderColor: WORKOUTS_ACCENT, backgroundColor: WORKOUTS_TINT },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WORKOUTS_TINT,
    marginBottom: Spacing.xs,
  },
  label: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  count: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WORKOUTS_ACCENT,
  },
  badgeText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
});

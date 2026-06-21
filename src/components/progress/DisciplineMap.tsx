import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ArenaStat } from '../../services/arenaProgress';

interface DisciplineMapProps {
  breakdown: ArenaStat[];
}

/**
 * Visual of which arenas the user trains vs avoids. Trained arenas are tinted with
 * their color; untrained ones stay muted — surfacing avoidance patterns over time.
 */
export const DisciplineMap: React.FC<DisciplineMapProps> = ({ breakdown }) => {
  if (breakdown.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Discipline Map</Text>
      <Text style={styles.subheading}>Which arenas you're training — and avoiding</Text>
      <View style={styles.grid}>
        {breakdown.map((a) => {
          const trained = a.reps > 0;
          return (
            <View
              key={a.arenaId}
              style={[
                styles.tile,
                trained
                  ? { backgroundColor: a.color + '14', borderColor: a.color }
                  : { backgroundColor: Colors.lightGray, borderColor: Colors.border },
              ]}
            >
              <Ionicons
                name={a.icon as any}
                size={20}
                color={trained ? a.color : Colors.gray}
              />
              <Text
                style={[styles.tileName, { color: trained ? Colors.dark : Colors.gray }]}
                numberOfLines={2}
              >
                {a.name}
              </Text>
              <Text style={[styles.tileReps, { color: trained ? a.color : Colors.gray }]}>
                {trained ? `${a.reps} rep${a.reps === 1 ? '' : 's'}` : 'Untrained'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: 2,
  },
  subheading: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '31%',
    minHeight: 96,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
  tileReps: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
});

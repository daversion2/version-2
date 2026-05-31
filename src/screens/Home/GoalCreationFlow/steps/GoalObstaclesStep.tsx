import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ObstaclePlanPair } from '../../../../components/goals/ObstaclePlanPair';
import { NeuroscienceBlurb } from '../../../../components/goals/NeuroscienceBlurb';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { NEUROSCIENCE_BLURBS } from '../../../../constants/goals';
import { GoalObstacle } from '../../../../types';

interface GoalObstaclesStepProps {
  obstacles: GoalObstacle[];
  onChangeObstacles: (obstacles: GoalObstacle[]) => void;
}

export const GoalObstaclesStep: React.FC<GoalObstaclesStepProps> = ({
  obstacles,
  onChangeObstacles,
}) => {
  const handleUpdate = (index: number, updated: GoalObstacle) => {
    const next = [...obstacles];
    next[index] = updated;
    onChangeObstacles(next);
  };

  const handleRemove = (index: number) => {
    const next = obstacles.filter((_, i) => i !== index);
    onChangeObstacles(next);
  };

  const handleAdd = () => {
    onChangeObstacles([
      ...obstacles,
      {
        id: Date.now().toString(),
        obstacle: '',
        when_then_plan: '',
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.prompt}>Anticipate your obstacles</Text>
      <Text style={styles.subtitle}>
        Pre-deciding how you'll respond to setbacks roughly doubles your follow-through rate.
      </Text>

      {obstacles.map((obs, idx) => (
        <ObstaclePlanPair
          key={obs.id}
          obstacle={obs}
          onChange={(updated) => handleUpdate(idx, updated)}
          onRemove={obstacles.length > 1 ? () => handleRemove(idx) : undefined}
          isFirst={idx === 0}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.gray} />
        <Text style={styles.addButtonText}>Add another obstacle</Text>
      </TouchableOpacity>

      <NeuroscienceBlurb
        title={NEUROSCIENCE_BLURBS.obstacles.title}
        content={NEUROSCIENCE_BLURBS.obstacles.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

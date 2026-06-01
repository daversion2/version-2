import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoalSummarySection } from '../../../../components/goals/GoalSummarySection';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { MeasurementType, MeasurementConfig, GoalObstacle } from '../../../../types';
import { MEASUREMENT_TYPES } from '../../../../constants/goals';

interface GoalCommitStepProps {
  name: string;
  deeperWhy: string;
  identityStatement: string;
  measurementType: MeasurementType | null;
  measurementConfig: Partial<MeasurementConfig>;
  obstacles: GoalObstacle[];
  onEditStep: (step: number) => void;
}

const getMeasurementSummary = (
  type: MeasurementType | null,
  config: Partial<MeasurementConfig>
): string => {
  if (!type) return 'Not set';

  const meta = MEASUREMENT_TYPES.find((m) => m.type === type);
  const label = meta?.label || type;

  switch (type) {
    case 'done_by_date': {
      const c = config as any;
      return c.target_date ? `${label} — ${c.target_date}` : label;
    }
    case 'reach_number': {
      const c = config as any;
      if (c.metric_name) {
        return `${c.metric_name}: ${c.starting_value ?? '?'} → ${c.target_value ?? '?'}`;
      }
      return label;
    }
    default:
      return label;
  }
};

export const GoalCommitStep: React.FC<GoalCommitStepProps> = ({
  name,
  deeperWhy,
  identityStatement,
  measurementType,
  measurementConfig,
  obstacles,
  onEditStep,
}) => {
  const filledObstacles = obstacles.filter((o) => o.obstacle.trim());

  return (
    <View>
      <Text style={styles.prompt}>Your goal at a glance</Text>
      <Text style={styles.subtitle}>Tap any section to edit.</Text>

      <View style={styles.summaryCard}>
        <GoalSummarySection
          icon="flag-outline"
          label="Goal"
          value={name || 'Not set'}
          onEdit={() => onEditStep(1)}
        />
        <GoalSummarySection
          icon="heart-outline"
          label="Why"
          value={deeperWhy || 'Not set'}
          onEdit={() => onEditStep(2)}
        />
        {identityStatement.trim().length > 0 && (
          <GoalSummarySection
            icon="person-outline"
            label="Identity"
            value={`I am becoming someone who ${identityStatement}`}
            onEdit={() => onEditStep(2)}
          />
        )}
        <GoalSummarySection
          icon="analytics-outline"
          label="Measurement"
          value={getMeasurementSummary(measurementType, measurementConfig)}
          onEdit={() => onEditStep(3)}
        />
        {filledObstacles.length > 0 && (
          <GoalSummarySection
            icon="shield-outline"
            label="Obstacles"
            value={`${filledObstacles.length} obstacle${filledObstacles.length > 1 ? 's' : ''} planned for`}
            onEdit={() => onEditStep(4)}
          />
        )}
      </View>
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
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MeasurementTypeCard } from '../../../../components/goals/MeasurementTypeCard';
import { MeasurementConfigPanel } from '../../../../components/goals/MeasurementConfigPanel';
import { NeuroscienceBlurb } from '../../../../components/goals/NeuroscienceBlurb';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { MEASUREMENT_TYPES, NEUROSCIENCE_BLURBS } from '../../../../constants/goals';
import { MeasurementType, MeasurementConfig } from '../../../../types';

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDefaultConfig = (type: MeasurementType): Partial<MeasurementConfig> => {
  switch (type) {
    case 'done_by_date': {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return { type: 'done_by_date', target_date: toYYYYMMDD(d) } as any;
    }
    case 'reach_number':
      return { type: 'reach_number', direction: 'up' } as any;
    case 'hit_total':
      return { type: 'hit_total' } as any;
    case 'rate_yourself':
      return { type: 'rate_yourself', scale_max: 5 } as any;
    default:
      return { type } as any;
  }
};

interface GoalMeasurementStepProps {
  measurementType: MeasurementType | null;
  measurementConfig: Partial<MeasurementConfig>;
  onChangeType: (type: MeasurementType) => void;
  onChangeConfig: (config: Partial<MeasurementConfig>) => void;
}

export const GoalMeasurementStep: React.FC<GoalMeasurementStepProps> = ({
  measurementType,
  measurementConfig,
  onChangeType,
  onChangeConfig,
}) => {
  return (
    <View>
      <Text style={styles.prompt}>How will you measure success?</Text>

      <View style={styles.grid}>
        {MEASUREMENT_TYPES.map((mt) => (
          <MeasurementTypeCard
            key={mt.type}
            icon={mt.icon}
            label={mt.label}
            description={mt.description}
            selected={measurementType === mt.type}
            onPress={() => {
              onChangeType(mt.type);
              if (measurementType !== mt.type) {
                onChangeConfig(getDefaultConfig(mt.type));
              }
            }}
          />
        ))}
      </View>

      {measurementType && (
        <MeasurementConfigPanel
          type={measurementType}
          config={measurementConfig}
          onChange={onChangeConfig}
        />
      )}

      <NeuroscienceBlurb
        title={NEUROSCIENCE_BLURBS.measurement.title}
        content={NEUROSCIENCE_BLURBS.measurement.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});

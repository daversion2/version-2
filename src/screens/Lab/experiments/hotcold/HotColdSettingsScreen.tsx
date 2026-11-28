import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Spacing } from '../../../../constants/theme';
import type { HotColdStackParamList, TempUnit } from '../../../../types/hotcold';
import { SAFETY_LINE } from '../../../../data/hotcold';
import { formatDuration } from '../../../../services/hotcoldMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { Stepper } from '../../../../components/common/Stepper';
import { useHotCold } from './HotColdContext';
import { hcs } from './components/hotcoldStyle';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<HotColdStackParamList, 'HotColdSettings'>;

/** Everything here is optional: the app works on its defaults. */
export const HotColdSettingsScreen: React.FC<Props> = () => {
  const t = useCopy();
  const { prefs, updatePrefs } = useHotCold();

  return (
    <ScrollView style={hcs.screen} contentContainerStyle={hcs.scroll}>
      <ListGroup
        title={t('hotcold.settings.temp.title', 'Temperature')}
        footer={t('hotcold.settings.temp.footer', 'Changing it never changes what you logged.')}
      >
        <View style={styles.pad}>
          <SegmentedControl<TempUnit>
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
            value={prefs.unit}
            onChange={(unit) => updatePrefs({ unit })}
            accessibilityLabel="Temperature unit"
          />
        </View>
      </ListGroup>

      <ListGroup
        title={t('hotcold.settings.goal.title', 'Weekly goal')}
        footer={t('hotcold.settings.goal.footer', 'Cold and heat sessions together, Monday to Sunday.')}
      >
        <ListRow
          title={t('hotcold.settings.goal.row', 'Sessions a week')}
          right={
            <Stepper
              value={prefs.weekly_goal}
              onChange={(weekly_goal) => updatePrefs({ weekly_goal })}
              min={1}
              max={14}
              accessibilityLabel="Sessions a week"
            />
          }
        />
      </ListGroup>

      <ListGroup title={t('hotcold.settings.plunge.title', 'Plunge timer')} footer={SAFETY_LINE}>
        <ListRow
          title={t('hotcold.settings.plunge.row', 'Bell at')}
          right={
            <Stepper
              value={prefs.cold_target_sec}
              onChange={(cold_target_sec) => updatePrefs({ cold_target_sec })}
              min={15}
              max={10 * 60}
              step={15}
              format={formatDuration}
              accessibilityLabel="Plunge timer bell"
            />
          }
        />
      </ListGroup>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pad: { padding: Spacing.md },
});

import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AvoidanceStackParamList } from '../../../../types/avoidance';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { Stepper } from '../../../../components/common/Stepper';
import { useAvoidance } from './AvoidanceContext';
import { avs } from './components/avoidanceStyle';

type Props = NativeStackScreenProps<AvoidanceStackParamList, 'AvoidanceSettings'>;

/** Optional: the app works on its defaults. */
export const AvoidanceSettingsScreen: React.FC<Props> = () => {
  const { prefs, updatePrefs, oldToImport, importOld } = useAvoidance();
  const [brought, setBrought] = useState<number | null>(null);

  return (
    <ScrollView style={avs.screen} contentContainerStyle={avs.scroll}>
      <ListGroup title="Weekly goal" footer="Things cleared, Monday to Sunday.">
        <ListRow
          title="Cleared a week"
          right={
            <Stepper
              value={prefs.weekly_goal}
              onChange={(weekly_goal) => updatePrefs({ weekly_goal })}
              min={1}
              max={14}
              accessibilityLabel="Cleared a week"
            />
          }
        />
      </ListGroup>

      <ListGroup
        title="The old Avoidance Training"
        footer="Brings over what you hadn’t cleared, keeping the days you’d already avoided it. The old list isn’t changed."
      >
        <ListRow
          title={oldToImport.length ? `Bring over ${oldToImport.length}` : 'Nothing to bring over'}
          value={brought !== null ? `${brought} brought over` : undefined}
          onPress={oldToImport.length ? async () => setBrought(await importOld()) : undefined}
        />
      </ListGroup>
    </ScrollView>
  );
};

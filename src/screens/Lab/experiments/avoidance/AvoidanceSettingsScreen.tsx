import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AvoidanceStackParamList } from '../../../../types/avoidance';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { Stepper } from '../../../../components/common/Stepper';
import { useAvoidance } from './AvoidanceContext';
import { avs } from './components/avoidanceStyle';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<AvoidanceStackParamList, 'AvoidanceSettings'>;

/** Optional: the app works on its defaults. */
export const AvoidanceSettingsScreen: React.FC<Props> = () => {
  const t = useCopy();
  const { prefs, updatePrefs, oldToImport, importOld } = useAvoidance();
  const [brought, setBrought] = useState<number | null>(null);

  return (
    <ScrollView style={avs.screen} contentContainerStyle={avs.scroll}>
      <ListGroup
        title={t('avoidance.settings.goal.title', 'Weekly goal')}
        footer={t('avoidance.settings.goal.footer', 'Things cleared, Monday to Sunday.')}
      >
        <ListRow
          title={t('avoidance.settings.goal.row', 'Cleared a week')}
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
        title={t('avoidance.settings.old.title', 'The old Avoidance Training')}
        footer={t('avoidance.settings.old.footer', 'Brings over what you hadn’t cleared, keeping the days you’d already avoided it. The old list isn’t changed.')}
      >
        <ListRow
          title={
            oldToImport.length
              ? t('avoidance.settings.old.bring', 'Bring over {n}', { n: oldToImport.length })
              : t('avoidance.settings.old.nothing', 'Nothing to bring over')
          }
          value={brought !== null ? t('avoidance.settings.old.brought', '{n} brought over', { n: brought }) : undefined}
          onPress={oldToImport.length ? async () => setBrought(await importOld()) : undefined}
        />
      </ListGroup>
    </ScrollView>
  );
};

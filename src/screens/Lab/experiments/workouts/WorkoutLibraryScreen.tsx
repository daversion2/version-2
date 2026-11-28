import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Spacing } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { useAuth } from '../../../../context/AuthContext';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import type { LibraryGear, LibraryLevel, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  LIBRARY_FOCUS_LABELS,
  LIBRARY_GEAR_LABELS,
  LIBRARY_GEAR_ORDER,
  LIBRARY_LEVELS,
} from '../../../../data/workoutLibrary';
import { canSeeWorkoutLibrary, findLibraryCopy, listLibrary } from '../../../../services/workoutLibrary';
import { useWorkouts } from './WorkoutsContext';
import { ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutLibrary'>;

/**
 * The Workout library: premade workouts by level, each fitted to the
 * equipment ticked here (services/workoutLibrary.ts). Open to everyone.
 */
export const WorkoutLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const t = useCopy();
  const { prefs, updatePrefs, workouts } = useWorkouts();
  const [level, setLevel] = useState<LibraryLevel>(prefs.library_level ?? 'beginner');
  const [gear, setGear] = useState<LibraryGear[]>(prefs.library_gear ?? []);

  if (!canSeeWorkoutLibrary(userProfile)) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Copy id="workouts.library.unavailable" style={ws.muted}>
          The Workout library isn’t available on this account yet.
        </Copy>
      </View>
    );
  }

  // Remembered for next time; a failed save just means picking again.
  const save = (changes: { library_level?: LibraryLevel; library_gear?: LibraryGear[] }) => {
    updatePrefs(changes).catch(() => {});
  };
  const pickLevel = (next: LibraryLevel) => {
    setLevel(next);
    save({ library_level: next });
  };
  const toggleGear = (g: LibraryGear) => {
    const next = gear.includes(g) ? gear.filter((x) => x !== g) : LIBRARY_GEAR_ORDER.filter((x) => x === g || gear.includes(x));
    setGear(next);
    save({ library_gear: next });
  };
  const bodyweightOnly = () => {
    setGear([]);
    save({ library_gear: [] });
  };

  const { fits, needMoreGear } = listLibrary(level, gear);
  const levelHint = LIBRARY_LEVELS.find((l) => l.value === level)?.hint;

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <Copy id="workouts.library.lead" style={ws.lead}>
        Premade workouts that start with movement prep, then power, strength and core. Tick what you have and each one
        fits itself to it.
      </Copy>

      <SegmentedControl
        options={LIBRARY_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
        value={level}
        onChange={pickLevel}
        accessibilityLabel="Level"
      />
      {levelHint ? <Text style={[ws.muted, styles.hint]}>{levelHint}</Text> : null}

      <Copy id="workouts.library.whatYouHave" style={ws.sectionLabel}>
        WHAT YOU HAVE
      </Copy>
      <View style={[ws.card, styles.chips]}>
        <Chip label={t('workouts.library.bodyweight', 'Bodyweight only')} on={gear.length === 0} onPress={bodyweightOnly} />
        {LIBRARY_GEAR_ORDER.map((g) => (
          <Chip key={g} label={LIBRARY_GEAR_LABELS[g]} on={gear.includes(g)} onPress={() => toggleGear(g)} />
        ))}
      </View>

      <ListGroup
        title={
          fits.length === 1
            ? t('workouts.library.countOne', '{n} workout', { n: fits.length })
            : t('workouts.library.countOther', '{n} workouts', { n: fits.length })
        }
        footer={
          needMoreGear > 0
            ? needMoreGear === 1
              ? t('workouts.library.needMoreOne', '{n} more at this level needs equipment you haven’t ticked.', {
                  n: needMoreGear,
                })
              : t('workouts.library.needMoreOther', '{n} more at this level need equipment you haven’t ticked.', {
                  n: needMoreGear,
                })
            : undefined
        }
      >
        {fits.map(({ template }) => (
          <ListRow
            key={template.id}
            title={template.name}
            subtitle={`${t('workouts.library.rowMeta', '{minutes} min · {focus}', {
              minutes: template.minutes,
              focus: LIBRARY_FOCUS_LABELS[template.focus],
            })}${
              findLibraryCopy(workouts, template.id) ? t('workouts.library.inYours', ' · In your workouts') : ''
            }\n${template.summary}`}
            onPress={() => navigation.navigate('WorkoutLibraryDetail', { libraryId: template.id })}
          />
        ))}
      </ListGroup>
    </ScrollView>
  );
};

const Chip: React.FC<{ label: string; on: boolean; onPress: () => void }> = ({ label, on, onPress }) => (
  <TouchableOpacity
    style={[ws.chip, on && ws.chipActive]}
    onPress={onPress}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: on }}
  >
    <Text style={[ws.chipText, on && ws.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  hint: { paddingHorizontal: 4, marginTop: -Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});

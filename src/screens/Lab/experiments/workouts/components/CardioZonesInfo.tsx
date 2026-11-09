import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../../constants/theme';
import { FeatureInfoModal } from '../../../../../components/common/FeatureInfoModal';
import { CARDIO_ZONES } from '../../../../../data/cardioZones';
import { WORKOUTS_ACCENT } from './workoutsStyle';

/**
 * The ⓘ beside anything that says VT1 or VT2: what the two thresholds are,
 * how to tell which zone you were in, and why the split matters. Opens over
 * whatever it sits in, sheets included.
 */
export const CardioZonesInfo: React.FC<{ size?: number }> = ({ size = 20 }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="What VT1 and VT2 mean"
      >
        <Ionicons name="information-circle-outline" size={size} color={Colors.gray} />
      </TouchableOpacity>
      <FeatureInfoModal
        visible={open}
        onDismiss={() => setOpen(false)}
        icon="heart"
        accent={WORKOUTS_ACCENT}
        title="VT1 and VT2"
        intro="Two points where your breathing changes as you work harder. VT1 (the first ventilatory threshold) is where it first picks up: the top of easy. VT2 (the second) is where it turns hard and ragged. Between them, they split cardio into three zones."
        points={[
          {
            label: `${CARDIO_ZONES[1].label} · ${CARDIO_ZONES[1].short}.`,
            text: 'You could talk in full sentences. You could keep this up for an hour or more: a long walk, an easy run or ride.',
          },
          {
            label: `${CARDIO_ZONES[2].label} · ${CARDIO_ZONES[2].short}.`,
            text: 'Short phrases only. Comfortably hard: a tempo run, a steady hard row. Something you could hold for 20 to 60 minutes.',
          },
          {
            label: `${CARDIO_ZONES[3].label} · ${CARDIO_ZONES[3].short}.`,
            text: 'A word or two at most. Intervals, hill sprints, racing a mile. Minutes at a time, not an hour.',
          },
          {
            label: 'Pick by how talking felt.',
            text: 'No watch needed. If you know your heart rate at VT1 and VT2 from a test, add it in Workouts → Settings and each zone shows its range too.',
          },
        ]}
        science={[
          {
            label: 'Your breathing tells on your metabolism.',
            text: 'At VT1, lactate starts to build and you breathe faster to clear the extra carbon dioxide. At VT2, lactate builds faster than your body can clear it, and breathing climbs steeply. That is why these points can be felt without a lab.',
          },
          {
            label: 'The talk test is surprisingly accurate.',
            text: 'In studies, the point where speaking stops being comfortable lines up closely with a lab-measured VT1. It is a validated way to find your zone with nothing but your voice.',
          },
          {
            label: 'Mostly easy, some hard.',
            text: 'Endurance athletes in many sports spend roughly 80% of their training below VT1 and most of the rest above VT2. Easy minutes build your aerobic base with little fatigue; hard minutes raise your ceiling. Too much time in the middle tires you without building either as well.',
          },
          {
            label: 'Why minutes above VT1 count double.',
            text: 'Health guidelines (WHO) recommend 150 minutes of moderate or 75 of vigorous activity a week, or a mix. Minutes above VT1 are vigorous, so each counts as two toward 150.',
          },
        ]}
      />
    </>
  );
};

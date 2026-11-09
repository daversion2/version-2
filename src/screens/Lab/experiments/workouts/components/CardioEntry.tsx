import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { CardioZone, SetValues, WeightUnit } from '../../../../../types/workouts';
import { CARDIO_ZONES, CARDIO_ZONE_ORDER } from '../../../../../data/cardioZones';
import { zoneHeartRate } from '../../../../../services/cardio';
import {
  cardioDistanceUnit,
  formatPace,
  fromDisplayDistance,
  stepDistance,
  toDisplayDistance,
} from '../../../../../services/workoutMath';
import { NumberStepper } from './NumberStepper';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

const MAX_MIN = 24 * 60;
const clampMin = (n: number) => Math.min(MAX_MIN, Math.max(1, Math.round(n)));

/**
 * The zone, by how talking felt — the talk test tracks VT1 closely and needs
 * no gear. With the user's threshold heart rates (Settings), each zone shows
 * its range too. `compact`: three chips, for planning a workout.
 */
export const CardioZonePicker: React.FC<{
  value: CardioZone;
  onChange: (zone: CardioZone) => void;
  vt1?: number;
  vt2?: number;
  compact?: boolean;
}> = ({ value, onChange, vt1, vt2, compact }) => {
  if (compact) {
    return (
      <View style={styles.chips}>
        {CARDIO_ZONE_ORDER.map((z) => {
          const on = z === value;
          return (
            <TouchableOpacity
              key={z}
              style={[ws.chip, on && ws.chipActive]}
              onPress={() => onChange(z)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityHint={CARDIO_ZONES[z].talk}
            >
              <Text style={[ws.chipText, on && ws.chipTextActive]}>{CARDIO_ZONES[z].label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
  return (
    <View accessibilityRole="radiogroup">
      {CARDIO_ZONE_ORDER.map((z, i) => {
        const info = CARDIO_ZONES[z];
        const on = z === value;
        const hr = zoneHeartRate(z, vt1, vt2);
        return (
          <TouchableOpacity
            key={z}
            style={[styles.zoneRow, i < CARDIO_ZONE_ORDER.length - 1 && ws.separator]}
            onPress={() => onChange(z)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${info.label}, ${info.short}. ${info.talk}${hr ? `, ${hr}` : ''}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneTitle}>
                {info.label} <Text style={styles.zoneShort}>· {info.short}</Text>
              </Text>
              <Text style={ws.muted}>
                {info.talk}
                {hr ? ` · ${hr}` : ''}
              </Text>
            </View>
            <Ionicons
              name={on ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={on ? WORKOUTS_ACCENT : Colors.separator}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * A cardio set: minutes, distance if it was measured (0 = not measured), and
 * the zone. Distance goes with the weight unit: lb → miles, kg → km.
 */
export const CardioEntry: React.FC<{
  values: SetValues;
  onChange: (values: SetValues) => void;
  unit: WeightUnit;
  vt1?: number;
  vt2?: number;
  /** 'row' inside a white panel (the set screen); 'tile' on a sheet. */
  layout?: 'row' | 'tile';
}> = ({ values, onChange, unit, vt1, vt2, layout = 'tile' }) => {
  const minutes = Math.round((values.seconds ?? 0) / 60);
  const metres = values.distanceM ?? 0;
  const du = cardioDistanceUnit(unit);
  const pace = metres > 0 ? formatPace(values.seconds ?? 0, metres, unit) : null;
  const setMetres = (m: number) => {
    const next = { ...values };
    if (m > 0) next.distanceM = m;
    else delete next.distanceM;
    onChange(next);
  };
  const row = layout === 'row';

  return (
    <View style={styles.wrap}>
      <View style={row ? ws.panel : styles.tiles}>
        <NumberStepper
          layout={layout}
          separator={row}
          label="Minutes"
          value={minutes}
          onDecrement={() => onChange({ ...values, seconds: clampMin(minutes - 1) * 60 })}
          onIncrement={() => onChange({ ...values, seconds: clampMin(minutes + 1) * 60 })}
          onSubmitValue={(v) => onChange({ ...values, seconds: clampMin(v) * 60 })}
        />
        <NumberStepper
          layout={layout}
          label={`Distance (${du})`}
          value={toDisplayDistance(metres, unit)}
          allowDecimal
          onDecrement={() => setMetres(stepDistance(metres, unit, -1))}
          onIncrement={() => setMetres(stepDistance(metres, unit, 1))}
          onSubmitValue={(v) => setMetres(fromDisplayDistance(v, unit))}
        />
      </View>
      <Text style={[ws.muted, styles.hint]}>
        {pace ? `Pace ${pace}` : 'Distance is optional — leave it at 0 if you didn’t measure it.'}
      </Text>
      <Text style={[ws.sectionLabel, styles.zoneLabel]}>How hard?</Text>
      <View style={ws.panel}>
        <CardioZonePicker value={values.zone ?? 1} onChange={(zone) => onChange({ ...values, zone })} vt1={vt1} vt2={vt2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  hint: { paddingHorizontal: Spacing.md, paddingVertical: 2 },
  zoneLabel: { marginBottom: 0, marginTop: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 52 },
  zoneTitle: { ...TextStyles.body, color: Colors.dark },
  zoneShort: { color: Colors.gray },
});

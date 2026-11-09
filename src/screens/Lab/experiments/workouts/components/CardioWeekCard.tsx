import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { CARDIO_ZONE_ORDER } from '../../../../../data/cardioZones';
import { CardioWeek, describeCardioCredit, zoneInLine } from '../../../../../services/cardio';
import { ProgressBar } from './PhaseParts';
import { CardioZonesInfo } from './CardioZonesInfo';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

/** One accent, three strengths: easy is lightest, above VT2 is full. */
const ZONE_FILL = { 1: WORKOUTS_ACCENT + '55', 2: WORKOUTS_ACCENT + 'AA', 3: WORKOUTS_ACCENT } as const;

/**
 * This week's cardio: minutes toward 150 (above VT1 counts double), and the
 * split by zone as one bar with a key. Logic in services/cardio.ts.
 */
export const CardioWeekCard: React.FC<{ week: CardioWeek }> = ({ week }) => {
  const shown = CARDIO_ZONE_ORDER.filter((z) => Math.round(week.minutesByZone[z]) > 0);
  return (
    <View style={[ws.card, styles.card]}>
      <View style={styles.head}>
        <Text style={ws.title}>Cardio</Text>
        <CardioZonesInfo size={18} />
        <View style={{ flex: 1 }} />
        <Text style={styles.credit}>{describeCardioCredit(week)}</Text>
      </View>
      <View
        style={styles.card}
        accessible
        accessibilityLabel={`Cardio this week: ${describeCardioCredit(week)}. ${shown
          .map((z) => `${Math.round(week.minutesByZone[z])} minutes ${zoneInLine(z)}`)
          .join(', ')}`}
      >
      <ProgressBar value={week.creditMin} max={week.goalMin} />

      {week.totalMin > 0 ? (
        <>
          <View style={styles.split}>
            {shown.map((z) => (
              <View key={z} style={{ flex: week.minutesByZone[z], backgroundColor: ZONE_FILL[z] }} />
            ))}
          </View>
          <View style={styles.key}>
            {shown.map((z) => (
              <View key={z} style={styles.keyItem}>
                <View style={[styles.swatch, { backgroundColor: ZONE_FILL[z] }]} />
                <Text style={ws.muted}>
                  {Math.round(week.minutesByZone[z])} min {zoneInLine(z)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={ws.muted}>Minutes above VT1 count double toward 150.</Text>
        </>
      ) : (
        <Text style={ws.muted}>
          Nothing yet this week. Add a run, ride or row with + Add exercise, or put one in a workout. Minutes above VT1
          count double toward 150.
        </Text>
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  credit: { ...TextStyles.subhead, color: Colors.dark, fontVariant: ['tabular-nums'] },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  key: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.md, rowGap: 4 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});

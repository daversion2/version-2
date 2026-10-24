import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { TestType, WeightUnit } from '../../../../../types/workouts';
import { formatTestResult, TestHistoryEntry } from '../../../../../services/exerciseTests';
import { describeComparison } from '../../../../../services/trainingPhases';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** One row per test, standalone or from a phase, each against the one before it tested the same way. */
export const TestHistoryRows: React.FC<{ entries: TestHistoryEntry[]; type: TestType; unit: WeightUnit }> = ({
  entries,
  type,
  unit,
}) => (
  <View style={[ws.card, styles.list]}>
    {entries.map((e, i) => (
      <View key={e.key} style={[styles.row, i > 0 && styles.divider]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={ws.title}>{formatTestResult(type, e.value, unit, e.weightKg)}</Text>
          <Text style={ws.muted}>
            {shortDate(e.at)} · {e.label}
          </Text>
        </View>
        {e.comparison && (
          <Text
            style={[
              styles.change,
              e.comparison.state === 'up' && { color: WORKOUTS_ACCENT },
              e.comparison.state === 'down' && { color: Colors.gray },
            ]}
          >
            {describeComparison(type, e.comparison)}
          </Text>
        )}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  change: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark, maxWidth: 130, textAlign: 'right' },
});

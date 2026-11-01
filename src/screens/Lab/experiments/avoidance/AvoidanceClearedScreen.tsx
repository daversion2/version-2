import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { AvoidanceStackParamList, AvoidanceTask } from '../../../../types/avoidance';
import {
  clearedStats,
  clearedTasks,
  dayLabel,
  describeAvoided,
  daysAvoided,
  dreadVsReality,
  Outcome,
  OUTCOME_LABEL,
  outcome,
} from '../../../../services/avoidanceMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { showConfirm } from '../../../../utils/alert';
import { useAvoidance } from './AvoidanceContext';
import { avs, AVOIDANCE_ACCENT, levelLabel } from './components/avoidanceStyle';

type Props = NativeStackScreenProps<AvoidanceStackParamList, 'AvoidanceCleared'>;

const OUTCOME_ORDER: Outcome[] = ['easier', 'as_expected', 'harder'];

/**
 * The proof: how often starting was easier than you feared, then everything
 * you've cleared with what you expected and how it went.
 */
export const AvoidanceClearedScreen: React.FC<Props> = () => {
  const { tasks, today, deleteTask } = useAvoidance();
  const dread = useMemo(() => dreadVsReality(tasks), [tasks]);
  const stats = useMemo(() => clearedStats(tasks), [tasks]);
  const cleared = useMemo(() => clearedTasks(tasks), [tasks]);

  const remove = (t: AvoidanceTask) =>
    showConfirm('Remove from your log?', `“${t.text}” comes off the cleared list and your counts.`, () => deleteTask(t.id), 'Remove');

  const subtitle = (t: AvoidanceTask): string => {
    const o = outcome(t.forecast, t.resistance);
    const how = o
      ? `${levelLabel(t.forecast)} → ${levelLabel(t.resistance)}`
      : t.resistance
        ? levelLabel(t.resistance)
        : 'Not rated';
    return `${how} · ${describeAvoided(daysAvoided(t, today)).replace('Avoided for', 'avoided')}`;
  };

  return (
    <ScrollView style={avs.screen} contentContainerStyle={avs.scroll}>
      <View style={avs.card}>
        <Text style={avs.eyebrow}>Dread vs reality</Text>
        {dread.rated === 0 ? (
          <Text style={avs.body}>
            Add a task with how hard you expect starting to be, then rate it when you’ve done it. This is where the two
            meet.
          </Text>
        ) : (
          <>
            <Text style={avs.big}>
              Easier than you feared: {dread.easier} of {dread.rated}
            </Text>
            {OUTCOME_ORDER.map((o) => (
              <View key={o} style={styles.barRow}>
                <Text style={[avs.muted, styles.barLabel]}>{OUTCOME_LABEL[o]}</Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${(dread[o] / dread.rated) * 100}%`, opacity: o === 'easier' ? 1 : 0.45 },
                    ]}
                  />
                </View>
                <Text style={styles.count}>{dread[o]}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={[avs.card, styles.stats]}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.count}</Text>
          <Text style={avs.muted}>Cleared</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.avgDaysAvoided ?? '—'}</Text>
          <Text style={avs.muted}>Days avoided, on average</Text>
        </View>
      </View>

      {cleared.length === 0 ? (
        <Text style={[avs.muted, styles.centerText]}>Nothing cleared yet. Today’s rep is a good place to start.</Text>
      ) : (
        <ListGroup title="Cleared" footer="Tap one to remove it from your log.">
          {cleared.map((t) => (
            <ListRow
              key={t.id}
              title={t.text}
              subtitle={subtitle(t)}
              value={t.done_date ? dayLabel(t.done_date, today) : undefined}
              onPress={() => remove(t)}
              chevron={false}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerText: { textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { width: 150 },
  track: { flex: 1, height: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.fill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full, backgroundColor: AVOIDANCE_ACCENT },
  count: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark, minWidth: 20, textAlign: 'right' },
  stats: { flexDirection: 'row', gap: Spacing.md },
  stat: { flex: 1, gap: 2 },
  statNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
});

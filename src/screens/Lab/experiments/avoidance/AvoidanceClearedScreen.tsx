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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<AvoidanceStackParamList, 'AvoidanceCleared'>;

const OUTCOME_ORDER: Outcome[] = ['easier', 'as_expected', 'harder'];

/**
 * The proof: how often starting was easier than you feared, then everything
 * you've cleared with what you expected and how it went.
 */
export const AvoidanceClearedScreen: React.FC<Props> = () => {
  const t = useCopy();
  const { tasks, today, deleteTask } = useAvoidance();
  const dread = useMemo(() => dreadVsReality(tasks), [tasks]);
  const stats = useMemo(() => clearedStats(tasks), [tasks]);
  const cleared = useMemo(() => clearedTasks(tasks), [tasks]);

  const remove = (task: AvoidanceTask) =>
    showConfirm(
      t('avoidance.cleared.remove.title', 'Remove from your log?'),
      t('avoidance.cleared.remove.message', '“{task}” comes off the cleared list and your counts.', { task: task.text }),
      () => deleteTask(task.id),
      t('avoidance.cleared.remove.confirm', 'Remove'),
    );

  const subtitle = (task: AvoidanceTask): string => {
    const o = outcome(task.forecast, task.resistance);
    const how = o
      ? `${levelLabel(task.forecast)} → ${levelLabel(task.resistance)}`
      : task.resistance
        ? levelLabel(task.resistance)
        : t('avoidance.cleared.notRated', 'Not rated');
    return `${how} · ${describeAvoided(daysAvoided(task, today)).replace('Avoided for', 'avoided')}`;
  };

  return (
    <ScrollView style={avs.screen} contentContainerStyle={avs.scroll}>
      <View style={avs.card}>
        <Copy id="avoidance.cleared.dread" style={avs.eyebrow}>Dread vs reality</Copy>
        {dread.rated === 0 ? (
          <Copy id="avoidance.cleared.dreadEmpty" style={avs.body}>
            Add a task with how hard you expect starting to be, then rate it when you’ve done it. This is where the two meet.
          </Copy>
        ) : (
          <>
            <Copy id="avoidance.cleared.easier" style={avs.big} vars={{ easier: dread.easier, rated: dread.rated }}>
              {'Easier than you feared: {easier} of {rated}'}
            </Copy>
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
          <Copy id="avoidance.cleared.statCleared" style={avs.muted}>Cleared</Copy>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.avgDaysAvoided ?? '—'}</Text>
          <Copy id="avoidance.cleared.statDays" style={avs.muted}>Days avoided, on average</Copy>
        </View>
      </View>

      {cleared.length === 0 ? (
        <Copy id="avoidance.cleared.empty" style={[avs.muted, styles.centerText]}>
          Nothing cleared yet. Today’s rep is a good place to start.
        </Copy>
      ) : (
        <ListGroup
          title={t('avoidance.cleared.list.title', 'Cleared')}
          footer={t('avoidance.cleared.list.footer', 'Tap one to remove it from your log.')}
        >
          {cleared.map((task) => (
            <ListRow
              key={task.id}
              title={task.text}
              subtitle={subtitle(task)}
              value={task.done_date ? dayLabel(task.done_date, today) : undefined}
              onPress={() => remove(task)}
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

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { formatSeconds, formatSetValues, formatVolume } from '../../../../services/workoutMath';
import { recordLines } from './components/StatsParts';
import { WorkoutStatsPanel } from './components/WorkoutStatsPanel';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

export const WorkoutHistoryScreen: React.FC = () => {
  const { sessions, records, exercise, prefs } = useWorkouts();
  const [tab, setTab] = useState<'sessions' | 'stats' | 'records'>('sessions');
  const [open, setOpen] = useState<string | null>(null);
  const unit = prefs.unit;

  const recordList = useMemo(
    () =>
      Object.values(records)
        .map((r) => ({ record: r, name: exercise(r.exerciseId).name, lines: recordLines(r, unit) }))
        .filter((r) => r.lines.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records, exercise, unit]
  );

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <View style={styles.tabs}>
        {(['sessions', 'stats', 'records'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'sessions' ? 'Sessions' : t === 'stats' ? 'Stats' : 'Records'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'stats' ? (
        <WorkoutStatsPanel />
      ) : tab === 'sessions' ? (
        sessions.length === 0 ? (
          <Text style={ws.muted}>No workouts finished yet. They’ll show up here.</Text>
        ) : (
          sessions.map((s) => {
            const isOpen = open === s.id;
            return (
              <TouchableOpacity key={s.id} style={ws.card} onPress={() => setOpen(isOpen ? null : s.id)}>
                <View style={styles.head}>
                  <View style={{ flex: 1 }}>
                    <Text style={ws.title}>{s.workout_name}</Text>
                    <Text style={ws.muted}>
                      {formatDayHeader(toLocalDateString(new Date(s.finished_at)))} · {formatSeconds(s.duration_sec)} ·{' '}
                      {s.total_sets} sets
                      {s.total_volume_kg > 0 ? ` · ${formatVolume(s.total_volume_kg, unit)}` : ''}
                    </Text>
                  </View>
                  {s.prs.length > 0 && (
                    <View style={styles.prBadge}>
                      <Ionicons name="trophy" size={12} color={Colors.white} />
                      <Text style={styles.prBadgeText}>{s.prs.length}</Text>
                    </View>
                  )}
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
                </View>
                {isOpen && (
                  <View style={styles.detail}>
                    {s.blocks.map((b) => {
                      const multi = b.items.length > 1;
                      return (
                        <View key={b.id} style={{ gap: 2 }}>
                          <Text style={styles.detailTitle}>
                            {multi ? b.name || 'Circuit' : exercise(b.items[0].exerciseId).name}
                          </Text>
                          <Text style={ws.muted}>
                            {b.sets
                              .map((set) => {
                                const ex = exercise(set.exerciseId);
                                const v = formatSetValues(set, ex.kind, unit);
                                return multi ? `${ex.name} ${v}` : v;
                              })
                              .join(multi ? '\n' : '  ·  ')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )
      ) : recordList.length === 0 ? (
        <Text style={ws.muted}>
          Records start after your first workout. The next time you beat a number, it’s called out.
        </Text>
      ) : (
        recordList.map(({ record, name, lines }) => (
          <View key={record.exerciseId} style={[ws.card, styles.recordRow]}>
            <Text style={[ws.title, { flex: 1 }]}>{name}</Text>
            <Text style={styles.recordValue}>{lines.join('\n')}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: BorderRadius.full },
  tabOn: { backgroundColor: WORKOUTS_ACCENT },
  tabText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  tabTextOn: { color: Colors.white },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
  },
  prBadgeText: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.white },
  detail: { marginTop: Spacing.md, gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  detailTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordValue: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT, textAlign: 'right' },
});

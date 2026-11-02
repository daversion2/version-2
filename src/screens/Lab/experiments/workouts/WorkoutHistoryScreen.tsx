import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type { CompletedWorkoutSession, Exercise, WeightUnit } from '../../../../types/workouts';
import { formatSeconds, formatSetValues, formatVolume } from '../../../../services/workoutMath';
import { recordLines } from './components/StatsParts';
import { WorkoutStatsPanel } from './components/WorkoutStatsPanel';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

/** One finished session; tap to see its sets. */
const SessionRow = React.memo(function SessionRow({
  session: s,
  isOpen,
  onToggle,
  exercise,
  unit,
}: {
  session: CompletedWorkoutSession;
  isOpen: boolean;
  onToggle: (id: string) => void;
  exercise: (id: string) => Exercise;
  unit: WeightUnit;
}) {
  return (
    <TouchableOpacity style={ws.card} onPress={() => onToggle(s.id)}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={ws.title}>{s.workout_name}</Text>
          <Text style={ws.muted}>
            {formatDayHeader(toLocalDateString(new Date(s.finished_at)))} ·{' '}
            {/* Logged sets have no clock: added on This week, not timed. */}
            {s.logged_sets ? '' : `${formatSeconds(s.duration_sec)} · `}
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
});

export const WorkoutHistoryScreen: React.FC = () => {
  const { sessions, records, exercise, prefs } = useWorkouts();
  const [tab, setTab] = useState<'sessions' | 'stats' | 'records'>('sessions');
  const [open, setOpen] = useState<string | null>(null);
  const unit = prefs.unit;
  const toggle = useCallback((id: string) => setOpen((current) => (current === id ? null : id)), []);

  const recordList = useMemo(
    () =>
      Object.values(records)
        .map((r) => ({ record: r, name: exercise(r.exerciseId).name, lines: recordLines(r, unit) }))
        .filter((r) => r.lines.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records, exercise, unit]
  );

  // Years of sessions: a list that only renders what's on screen. The tabs,
  // and the Stats and Records tabs, ride along as its header.
  const header = (
    <View style={styles.header}>
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
        sessions.length === 0 && <Text style={ws.muted}>No workouts finished yet. They’ll show up here.</Text>
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
    </View>
  );

  return (
    <FlatList
      style={ws.screen}
      contentContainerStyle={ws.scroll}
      data={tab === 'sessions' ? sessions : []}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={header}
      extraData={open}
      renderItem={({ item }) => (
        <SessionRow session={item} isOpen={open === item.id} onToggle={toggle} exercise={exercise} unit={unit} />
      )}
      initialNumToRender={12}
      windowSize={7}
    />
  );
};

const styles = StyleSheet.create({
  header: { gap: Spacing.md },
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

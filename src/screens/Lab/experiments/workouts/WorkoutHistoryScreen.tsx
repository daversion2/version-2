import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import type { CompletedWorkoutSession, Exercise, WeightUnit, WorkoutsStackParamList } from '../../../../types/workouts';
import { PhaseRow } from './components/PhaseRow';
import { formatSeconds, formatSetValues, formatVolume } from '../../../../services/workoutMath';
import { canEditLength, recordSources } from '../../../../services/workoutEdit';
import { WorkoutStatsPanel } from './components/WorkoutStatsPanel';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { swapTag, insteadOfLine, sessionSwaps } from '../../../../services/exerciseSwap';

/** One finished session; tap to see its sets. */
const SessionRow = React.memo(function SessionRow({
  session: s,
  isOpen,
  onToggle,
  onEdit,
  exercise,
  unit,
}: {
  session: CompletedWorkoutSession;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
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
            {/* Logged sets have no clock, unless a quick-logged run kept its minutes. */}
            {canEditLength(s) ? `${formatSeconds(s.duration_sec)} · ` : ''}
            {s.total_sets} sets
            {s.total_volume_kg > 0 ? ` · ${formatVolume(s.total_volume_kg, unit)}` : ''}
            {swapTag(s) ? ` · ${swapTag(s)}` : ''}
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
                {sessionSwaps({ blocks: [b] }).map((w) => (
                  <Text key={`${b.id}-${w.itemIndex}`} style={styles.swapLine}>
                    {multi ? `${exercise(w.toId).name}: ` : ''}
                    {insteadOfLine(exercise(w.fromId).name, w.reason)}
                  </Text>
                ))}
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
          <TouchableOpacity
            style={styles.edit}
            onPress={() => onEdit(s.id)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${s.workout_name}`}
          >
            <Ionicons name="pencil" size={15} color={WORKOUTS_ACCENT} />
            <Text style={ws.link}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});

/** Progress: everything that looks back. Stats, records, past sessions, phases and tests. */
export const WorkoutHistoryScreen: React.FC<NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutHistory'>> = ({
  navigation,
}) => {
  const { sessions, records, exercise, prefs } = useWorkouts();
  const [tab, setTab] = useState<'stats' | 'records' | 'sessions'>('stats');
  const [open, setOpen] = useState<string | null>(null);
  const unit = prefs.unit;
  const toggle = useCallback((id: string) => setOpen((current) => (current === id ? null : id)), []);
  const openEditor = useCallback(
    (sessionId: string, exerciseId?: string) => navigation.navigate('WorkoutEditSession', { sessionId, exerciseId }),
    [navigation]
  );
  const editSessionRow = useCallback((id: string) => openEditor(id), [openEditor]);

  const recordList = useMemo(
    () =>
      Object.values(records)
        .map((r) => ({ record: r, name: exercise(r.exerciseId).name, sources: recordSources(r, sessions, unit) }))
        .filter((r) => r.sources.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records, exercise, unit, sessions]
  );

  // Years of sessions: a list that only renders what's on screen. The tabs,
  // and the Stats and Records tabs, ride along as its header.
  const header = (
    <View style={styles.header}>
      <ListGroup>
        <PhaseRow />
        <ListRow
          title="Test an exercise"
          subtitle="See if you’re getting better — no program needed"
          icon={{ name: 'speedometer', color: WORKOUTS_ACCENT }}
          onPress={() => navigation.navigate('ExerciseTest')}
        />
      </ListGroup>

      <View style={styles.tabs}>
        {(['stats', 'records', 'sessions'] as const).map((t) => (
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
        recordList.map(({ record, name, sources }) => (
          <View key={record.exerciseId} style={[ws.card, styles.recordRow]}>
            <Text style={[ws.title, { flex: 1 }]}>{name}</Text>
            <View style={styles.recordLines}>
              {sources.map(({ line, sessionId }) =>
                sessionId ? (
                  <TouchableOpacity
                    key={line}
                    style={styles.recordLine}
                    onPress={() => openEditor(sessionId, record.exerciseId)}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, ${line}. Open the workout that set it`}
                  >
                    <Text style={styles.recordValue}>{line}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.gray} />
                  </TouchableOpacity>
                ) : (
                  <Text key={line} style={styles.recordValue}>
                    {line}
                  </Text>
                )
              )}
            </View>
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
        <SessionRow
          session={item}
          isOpen={open === item.id}
          onToggle={toggle}
          onEdit={editSessionRow}
          exercise={exercise}
          unit={unit}
        />
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
  swapLine: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordLines: { alignItems: 'flex-end' },
  recordLine: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  edit: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 44 },
  recordValue: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT, textAlign: 'right' },
});

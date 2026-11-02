import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { MeditateMode } from '../../../../types/meditate';
import {
  breakdown,
  calmInsight,
  computeRecords,
  describeCalm,
  describeCalmInsight,
  describeSession,
  MODE_ORDER,
  RECORD_LABELS,
  totals,
  weeklyTotals,
} from '../../../../services/meditateMath';
import { formatMinutes } from '../../../../services/sessionTimer';
import { formatRelativeDay } from '../../../../utils/date';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';

const WEEKS = 8;
const CHART_HEIGHT = 120;
const RECENT = 30;

/** "Oct 12" from a YYYY-MM-DD Monday. */
const shortDate = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Minutes as a plain number for the tiles — hours once it's worth it. */
const bigNumber = (sec: number): { value: string; unit: string } => {
  const min = Math.round(sec / 60);
  if (min < 120) return { value: String(min), unit: 'min' };
  return { value: (min / 60).toFixed(min < 600 ? 1 : 0), unit: 'hrs' };
};

/**
 * Proof of time put in: totals, the last eight weeks, records, where the
 * minutes went, and every session. Only sessions done in Meditate — check-ins
 * from before it existed aren't counted here.
 */
export const MeditateHistoryScreen: React.FC = () => {
  const { sessions, loading, reload } = useMeditate();
  const now = useMemo(() => new Date(), []);
  const t = useMemo(() => totals(sessions, now), [sessions, now]);
  const bars = useMemo(() => weeklyTotals(sessions, now, WEEKS), [sessions, now]);
  const records = useMemo(() => computeRecords(sessions), [sessions]);
  const rows = useMemo(() => breakdown(sessions), [sessions]);
  const calm = useMemo(() => calmInsight(sessions), [sessions]);
  const [selected, setSelected] = useState(WEEKS - 1);

  const maxSec = Math.max(...bars.map((b) => b.sec), 60);
  const bar = bars[selected];

  const tiles = [
    { label: 'This week', sec: t.weekSec },
    { label: 'This month', sec: t.monthSec },
    { label: 'All time', sec: t.allSec },
  ];

  return (
    <ScrollView
      style={ms.screen}
      contentContainerStyle={ms.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={MEDITATE_ACCENT} />}
    >
      {!loading && sessions.length === 0 && (
        <View style={ms.card}>
          <Text style={ms.title}>Nothing here yet</Text>
          <Text style={ms.muted}>Finish a session and your minutes, weeks and records start here.</Text>
        </View>
      )}

      <View style={styles.tiles}>
        {tiles.map((tile) => {
          const n = bigNumber(tile.sec);
          return (
            <View key={tile.label} style={[ms.card, styles.tile]}>
              <Text style={styles.tileValue}>
                {n.value}
                <Text style={styles.tileUnit}> {n.unit}</Text>
              </Text>
              <Text style={ms.muted}>{tile.label}</Text>
            </View>
          );
        })}
      </View>

      {calm && (
        <View style={[ms.card, styles.calmCard]}>
          <Text style={styles.calmText}>{describeCalmInsight(calm)}</Text>
          <Text style={ms.muted}>
            From {calm.sessions} sessions where you said how calm you felt before and after (1 tense, 5 calm).
          </Text>
        </View>
      )}

      <Text style={ms.sectionLabel}>Minutes per week</Text>
      <View style={ms.card}>
        <Text style={styles.readout}>
          {bar.sec ? formatMinutes(bar.sec) : 'No sessions'}
          <Text style={ms.muted}>
            {'  '}
            {selected === WEEKS - 1 ? 'this week' : `week of ${shortDate(bar.weekStart)}`}
          </Text>
        </Text>
        <View style={styles.chart} accessibilityLabel="Minutes per week, last eight weeks">
          {bars.map((b, i) => (
            <TouchableOpacity
              key={b.weekStart}
              style={styles.barSlot}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={`Week of ${shortDate(b.weekStart)}: ${formatMinutes(b.sec)}`}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: b.sec ? Math.max(4, (b.sec / maxSec) * CHART_HEIGHT) : 0,
                    opacity: i === selected ? 1 : 0.45,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.axis}>
          <Text style={ms.muted}>{shortDate(bars[0].weekStart)}</Text>
          <Text style={ms.muted}>This week</Text>
        </View>
      </View>

      <ListGroup title="Records">
        {[
          ...MODE_ORDER.map((m: MeditateMode) => {
            const r = records.longest[m];
            return <ListRow key={m} title={RECORD_LABELS[m]} value={r ? formatMinutes(r.duration_sec) : '—'} />;
          }),
          <ListRow
            key="week"
            title="Most minutes in a week"
            value={records.bestWeek ? formatMinutes(records.bestWeek.sec) : '—'}
          />,
        ]}
      </ListGroup>

      {rows.length > 0 && (
        <ListGroup title="Where the minutes went">
          {rows.map((r) => (
            <ListRow
              key={r.key}
              title={r.label}
              subtitle={`${r.sessions} ${r.sessions === 1 ? 'session' : 'sessions'}`}
              value={formatMinutes(r.sec)}
            />
          ))}
        </ListGroup>
      )}

      {sessions.length > 0 && (
        <ListGroup
          title="Sessions"
          footer={
            sessions.length > RECENT ? `Showing the latest ${RECENT}. Every session counts in the totals above.` : undefined
          }
        >
          {sessions.slice(0, RECENT).map((s) => (
            <ListRow
              key={s.id}
              title={describeSession(s)}
              subtitle={[
                formatRelativeDay(s.date),
                s.ended_early ? `ended early of ${formatMinutes(s.planned_sec)}` : null,
                describeCalm(s) || null,
              ]
                .filter(Boolean)
                .join(' · ')}
              value={formatMinutes(s.duration_sec)}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 },
  tileValue: { ...TextStyles.title2, fontWeight: '600', color: Colors.dark },
  tileUnit: { ...TextStyles.footnote, color: Colors.gray },
  readout: { ...TextStyles.headline, color: Colors.dark, marginBottom: Spacing.sm },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '62%',
    backgroundColor: MEDITATE_ACCENT,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  calmCard: { gap: 4 },
  calmText: { ...TextStyles.headline, color: MEDITATE_ACCENT },
});

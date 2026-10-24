import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
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

      <Text style={ms.sectionLabel}>Records</Text>
      <View style={ms.card}>
        {MODE_ORDER.map((m: MeditateMode) => {
          const r = records.longest[m];
          return (
            <View key={m} style={styles.recordRow}>
              <Text style={[ms.body, { flex: 1 }]}>{RECORD_LABELS[m]}</Text>
              <Text style={ms.title}>{r ? formatMinutes(r.duration_sec) : '—'}</Text>
            </View>
          );
        })}
        <View style={styles.recordRow}>
          <Text style={[ms.body, { flex: 1 }]}>Most minutes in a week</Text>
          <Text style={ms.title}>{records.bestWeek ? formatMinutes(records.bestWeek.sec) : '—'}</Text>
        </View>
      </View>

      {rows.length > 0 && (
        <>
          <Text style={ms.sectionLabel}>Where the minutes went</Text>
          <View style={ms.card}>
            {rows.map((r) => (
              <View key={r.key} style={styles.recordRow}>
                <Text style={[ms.body, { flex: 1 }]}>{r.label}</Text>
                <Text style={ms.muted}>
                  {r.sessions} {r.sessions === 1 ? 'session' : 'sessions'} ·{' '}
                </Text>
                <Text style={ms.title}>{formatMinutes(r.sec)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {sessions.length > 0 && <Text style={ms.sectionLabel}>Sessions</Text>}
      {sessions.slice(0, RECENT).map((s) => (
        <View key={s.id} style={[ms.card, styles.sessionRow]}>
          <View style={{ flex: 1 }}>
            <Text style={ms.title}>{describeSession(s)}</Text>
            <Text style={ms.muted}>
              {formatRelativeDay(s.date)}
              {s.ended_early ? ` · ended early of ${formatMinutes(s.planned_sec)}` : ''}
              {describeCalm(s) ? ` · ${describeCalm(s)}` : ''}
            </Text>
          </View>
          <Text style={ms.title}>{formatMinutes(s.duration_sec)}</Text>
        </View>
      ))}
      {sessions.length > RECENT && (
        <Text style={ms.muted}>Showing the latest {RECENT}. Every session counts in the totals above.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, gap: 2, paddingVertical: Spacing.md },
  tileValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  tileUnit: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  readout: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.sm },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '62%',
    backgroundColor: MEDITATE_ACCENT,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: Spacing.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  calmCard: { gap: 4 },
  calmText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: MEDITATE_ACCENT },
});

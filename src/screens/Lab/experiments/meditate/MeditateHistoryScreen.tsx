import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing, TextStyles } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { CompletedMeditateSession, MeditateMode, MeditateStackParamList } from '../../../../types/meditate';
import {
  breakdown,
  computeRecords,
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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

const WEEKS = 8;
const CHART_HEIGHT = 120;

type Tab = 'stats' | 'records' | 'sessions';
const TABS: { key: Tab; label: string }[] = [
  { key: 'stats', label: 'Stats' },
  { key: 'records', label: 'Records' },
  { key: 'sessions', label: 'Sessions' },
];

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

/** One finished session; tap to correct it. */
const SessionRow = React.memo(function SessionRow({
  session: s,
  onEdit,
}: {
  session: CompletedMeditateSession;
  onEdit: (id: string) => void;
}) {
  const t = useCopy();
  return (
    <TouchableOpacity
      style={[ms.card, styles.sessionRow]}
      onPress={() => onEdit(s.id)}
      accessibilityRole="button"
      accessibilityHint="Opens this session to edit it"
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={ms.title}>{describeSession(s)}</Text>
        <Text style={ms.muted}>
          {[formatRelativeDay(s.date), s.ended_early ? t('meditate.history.endedEarlyOf', 'ended early of {planned}', { planned: formatMinutes(s.planned_sec) }) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text style={styles.sessionValue}>{formatMinutes(s.duration_sec)}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );
});

/**
 * Progress: proof of time put in. Stats, records, and every session, each
 * session a tap from being corrected. Only sessions done in Meditate; check-ins
 * from before it existed aren't counted here.
 */
export const MeditateHistoryScreen: React.FC<NativeStackScreenProps<MeditateStackParamList, 'MeditateHistory'>> = ({
  navigation,
}) => {
  const t = useCopy();
  const { sessions, loading, reload } = useMeditate();
  const [tab, setTab] = useState<Tab>('stats');
  const now = useMemo(() => new Date(), []);
  const tot = useMemo(() => totals(sessions, now), [sessions, now]);
  const bars = useMemo(() => weeklyTotals(sessions, now, WEEKS), [sessions, now]);
  const records = useMemo(() => computeRecords(sessions), [sessions]);
  const rows = useMemo(() => breakdown(sessions), [sessions]);
  const [selected, setSelected] = useState(WEEKS - 1);
  const openEditor = useCallback(
    (sessionId: string) => navigation.navigate('MeditateEditSession', { sessionId }),
    [navigation]
  );

  const maxSec = Math.max(...bars.map((b) => b.sec), 60);
  const bar = bars[selected];
  const tiles = [
    { key: 'week', label: 'This week', sec: tot.weekSec },
    { key: 'month', label: 'This month', sec: tot.monthSec },
    { key: 'all', label: 'All time', sec: tot.allSec },
  ];

  const stats = (
    <>
      <View style={styles.tiles}>
        {tiles.map((tile) => {
          const n = bigNumber(tile.sec);
          return (
            <View key={tile.label} style={[ms.card, styles.tile]}>
              <Text style={styles.tileValue}>
                {n.value}
                <Text style={styles.tileUnit}> {n.unit}</Text>
              </Text>
              <Copy id={`meditate.history.tile.${tile.key}`} style={ms.muted}>{tile.label}</Copy>
            </View>
          );
        })}
      </View>

      <Copy id="meditate.history.perWeek" style={ms.sectionLabel}>Minutes per week</Copy>
      <View style={ms.card}>
        <Text style={styles.readout}>
          {bar.sec ? formatMinutes(bar.sec) : t('meditate.history.noSessions', 'No sessions')}
          <Text style={ms.muted}>
            {'  '}
            {selected === WEEKS - 1
              ? t('meditate.history.thisWeekLower', 'this week')
              : t('meditate.history.weekOf', 'week of {date}', { date: shortDate(bar.weekStart) })}
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
          <Copy id="meditate.history.axisThisWeek" style={ms.muted}>This week</Copy>
        </View>
      </View>

      {rows.length > 0 && (
        <ListGroup title={t('meditate.history.whereMinutes', 'Where the minutes went')}>
          {rows.map((r) => (
            <ListRow
              key={r.key}
              title={r.label}
              subtitle={
                r.sessions === 1
                  ? t('meditate.history.sessionCount.one', '{n} session', { n: r.sessions })
                  : t('meditate.history.sessionCount.other', '{n} sessions', { n: r.sessions })
              }
              value={formatMinutes(r.sec)}
            />
          ))}
        </ListGroup>
      )}
    </>
  );

  const recordList = (
    <ListGroup title={t('meditate.history.records', 'Records')}>
      {[
        ...MODE_ORDER.map((m: MeditateMode) => {
          const r = records.longest[m];
          return (
            <ListRow
              key={m}
              title={RECORD_LABELS[m]}
              value={r ? formatMinutes(r.duration_sec) : '—'}
              onPress={r ? () => openEditor(r.id) : undefined}
              accessibilityLabel={r ? `${RECORD_LABELS[m]}, ${formatMinutes(r.duration_sec)}. Open the session that set it` : undefined}
            />
          );
        }),
        <ListRow
          key="week"
          title={t('meditate.history.mostWeek', 'Most minutes in a week')}
          value={records.bestWeek ? formatMinutes(records.bestWeek.sec) : '—'}
        />,
      ]}
    </ListGroup>
  );

  // Years of sessions: a list that only renders what's on screen. The tabs,
  // and the Stats and Records tabs, ride along as its header.
  const header = (
    <View style={styles.header}>
      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabOn]}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
          >
            <Copy id={`meditate.history.tab.${key}`} style={[styles.tabText, tab === key && styles.tabTextOn]}>
              {label}
            </Copy>
          </TouchableOpacity>
        ))}
      </View>

      {!loading && sessions.length === 0 && (
        <View style={ms.card}>
          <Copy id="meditate.history.empty.title" style={ms.title}>Nothing here yet</Copy>
          <Copy id="meditate.history.empty.body" style={ms.muted}>Finish a session and your minutes, weeks and records start here.</Copy>
        </View>
      )}
      {tab === 'stats' && stats}
      {tab === 'records' && recordList}
    </View>
  );

  return (
    <FlatList
      style={ms.screen}
      contentContainerStyle={ms.scroll}
      data={tab === 'sessions' ? sessions : []}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={header}
      extraData={tab}
      renderItem={({ item }) => <SessionRow session={item} onEdit={openEditor} />}
      initialNumToRender={12}
      windowSize={7}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={MEDITATE_ACCENT} />}
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
  tabOn: { backgroundColor: MEDITATE_ACCENT },
  tabText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  tabTextOn: { color: Colors.white },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sessionValue: { ...TextStyles.subhead, color: Colors.dark },
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
});

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HotColdSession, HotColdStackParamList } from '../../../../types/hotcold';
import { KIND_LABEL } from '../../../../data/hotcold';
import {
  dayLabel,
  formatDuration,
  formatTemp,
  groupByDay,
  RECORD_LABEL,
  RecordId,
  recentSessions,
  records,
} from '../../../../services/hotcoldMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { useHotCold } from './HotColdContext';
import { LogSheet, LogTarget } from './components/LogSheet';
import { hcs, KIND_COLOR, KIND_ICON, ratingLabel } from './components/hotcoldStyle';

type Props = NativeStackScreenProps<HotColdStackParamList, 'HotColdHistory'>;

const RECORD_ORDER: RecordId[] = ['longestCold', 'coldest', 'longestHeat'];

/** Records from every session, then the last 12 weeks by day. Tap one to edit or delete it. */
export const HotColdHistoryScreen: React.FC<Props> = () => {
  const { sessions, today, prefs } = useHotCold();
  const [target, setTarget] = useState<LogTarget | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const best = useMemo(() => records(sessions), [sessions]);
  const days = useMemo(() => groupByDay(recentSessions(sessions, today)), [sessions, today]);

  const edit = (session: HotColdSession) => {
    setSheetKey((k) => k + 1);
    setTarget({ mode: 'edit', session });
  };

  const recordValue = (id: RecordId, s: HotColdSession | null): string => {
    if (!s) return '—';
    const what = id === 'coldest' ? formatTemp(s.temp_c, prefs.unit) : formatDuration(s.duration_sec);
    return `${what} · ${dayLabel(s.date, today)}`;
  };

  return (
    <View style={hcs.screen}>
      <ScrollView contentContainerStyle={hcs.scroll}>
        <ListGroup title="Records">
          {RECORD_ORDER.map((id) => (
            <ListRow
              key={id}
              icon={{
                name: KIND_ICON[id === 'longestHeat' ? 'heat' : 'cold'],
                color: KIND_COLOR[id === 'longestHeat' ? 'heat' : 'cold'],
              }}
              title={RECORD_LABEL[id]}
              value={recordValue(id, best[id])}
            />
          ))}
        </ListGroup>

        {days.length === 0 ? (
          <Text style={[hcs.muted, styles.centerText]}>Nothing logged yet. Your sessions show up here.</Text>
        ) : (
          days.map((day) => (
            <ListGroup key={day.date} title={dayLabel(day.date, today)}>
              {day.sessions.map((s) => (
                <ListRow
                  key={s.id}
                  icon={{ name: KIND_ICON[s.kind], color: KIND_COLOR[s.kind] }}
                  title={`${KIND_LABEL[s.kind]} · ${formatDuration(s.duration_sec)}`}
                  subtitle={ratingLabel(s.resistance)}
                  value={formatTemp(s.temp_c, prefs.unit)}
                  onPress={() => edit(s)}
                />
              ))}
            </ListGroup>
          ))
        )}
        {days.length > 0 ? <Text style={[hcs.muted, styles.centerText]}>Showing the last 12 weeks.</Text> : null}
      </ScrollView>

      <LogSheet key={sheetKey} target={target} onClose={() => setTarget(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  centerText: { textAlign: 'center' },
});

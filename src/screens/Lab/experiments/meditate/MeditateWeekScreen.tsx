import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import type { MeditateStackParamList } from '../../../../types/meditate';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { buildMeditateWeek, describeMeditateWeek } from '../../../../services/meditateWeek';
import { formatMinutes } from '../../../../services/sessionTimer';
import {
  DEFAULT_WEEK_VIEW,
  describeRating,
  WEEK_VIEW_LABELS,
  WeekView,
  weekWindow,
  windowSpan,
  windowTitle,
} from '../../../../services/workoutWeek';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';
import { MeditateWeekStrip, meditateWeekdayName, useMeditateLogs } from './components/MeditateWeekParts';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateWeek'>;

const VIEWS: { value: WeekView; label: string }[] = [
  { value: 'rolling', label: WEEK_VIEW_LABELS.rolling },
  { value: 'calendar', label: WEEK_VIEW_LABELS.calendar },
];

/**
 * Your week at a glance, the same frame as Workouts': the days you sat, the
 * minutes, what kind, and the two ratings. A day opens its sessions. Logic in
 * services/meditateWeek.ts.
 */
export const MeditateWeekScreen: React.FC<Props> = ({ navigation }) => {
  const t = useCopy();
  const { sessions, prefs, updatePrefs, userId } = useMeditate();
  const logs = useMeditateLogs(userId);
  const view: WeekView = prefs.week_view ?? DEFAULT_WEEK_VIEW;
  const [offset, setOffset] = useState(0);
  const goal = clampWeeklyGoal(prefs.weekly_goal, 'meditate');

  const week = useMemo(() => {
    const now = new Date();
    return buildMeditateWeek({
      sessions,
      logs,
      window: weekWindow(view, now, offset),
      prior: weekWindow(view, now, offset + 1),
      now,
    });
  }, [sessions, logs, view, offset]);

  const changeView = (next: WeekView) => {
    setOffset(0);
    updatePrefs({ week_view: next }).catch(() => {});
  };

  const openDay = (date: string) => navigation.navigate('MeditateDay', { date });
  const daySessions = [...week.days].reverse().flatMap((d) => [...d.sessions].reverse().map((s) => ({ day: d, s })));
  const change = week.changePct === null ? null : `${week.changePct >= 0 ? '↑' : '↓'} ${Math.abs(week.changePct)}%`;
  const modesDone = week.byMode.filter((m) => m.sessions > 0);

  return (
    <ScrollView style={ms.screen} contentContainerStyle={ms.scroll}>
      <SegmentedControl options={VIEWS} value={view} onChange={changeView} accessibilityLabel="Show the week as" />

      <View style={ms.card}>
        <View style={styles.windowHead}>
          <TouchableOpacity
            onPress={() => setOffset((o) => o + 1)}
            style={styles.pager}
            accessibilityRole="button"
            accessibilityLabel="Earlier"
          >
            <Ionicons name="chevron-back" size={22} color={MEDITATE_ACCENT} />
          </TouchableOpacity>
          <View style={styles.windowTitles}>
            <Text style={ms.title}>{windowTitle(week.window)}</Text>
            <Text style={ms.muted}>{windowSpan(week.window)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            style={[styles.pager, offset === 0 && ms.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Later"
            accessibilityState={{ disabled: offset === 0 }}
          >
            <Ionicons name="chevron-forward" size={22} color={MEDITATE_ACCENT} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headline}>{describeMeditateWeek(week, goal)}</Text>
        <MeditateWeekStrip days={week.days} onOpenDay={openDay} />
      </View>

      <View style={styles.tiles}>
        <Tile
          label={t('meditate.week.time', 'Time')}
          value={week.sec > 0 ? formatMinutes(week.sec) : '–'}
          note={
            change
              ? view === 'calendar'
                ? t('meditate.week.changeCalendar', '{change} on the week before', { change })
                : t('meditate.week.changeRolling', '{change} on the 7 days before', { change })
              : undefined
          }
        />
        <Tile label={t('meditate.week.longest', 'Longest')} value={week.longestSec > 0 ? formatMinutes(week.longestSec) : '–'} />
      </View>

      {modesDone.length > 0 && (
        <ListGroup title={t('meditate.week.whatYouDid', 'What you did')}>
          {modesDone.map((m) => (
            <ListRow
              key={m.mode}
              title={m.label}
              subtitle={
                m.sessions === 1
                  ? t('meditate.week.sessionCount.one', '{n} session', { n: m.sessions })
                  : t('meditate.week.sessionCount.other', '{n} sessions', { n: m.sessions })
              }
              value={formatMinutes(m.sec)}
            />
          ))}
        </ListGroup>
      )}

      {daySessions.length > 0 ? (
        <ListGroup title={t('meditate.week.sessions', 'Sessions')}>
          {daySessions.map(({ day, s }, i) => (
            <ListRow
              key={s.session?.id ?? `${day.date}-${i}`}
              title={s.name}
              subtitle={meditateWeekdayName(day.date)}
              value={s.session ? formatMinutes(s.session.duration_sec) : undefined}
              onPress={() => openDay(day.date)}
            />
          ))}
        </ListGroup>
      ) : (
        <Copy
          id={week.window.offset === 0 && view === 'rolling' ? 'meditate.week.nothingRolling' : 'meditate.week.nothingOther'}
          style={ms.lead}
        >
          {week.window.offset === 0 && view === 'rolling' ? 'Nothing logged in the last 7 days.' : 'Nothing logged in these 7 days.'}
        </Copy>
      )}

      <ListGroup title={t('meditate.week.override', 'Your override')}>
        <ListRow
          title={t('meditate.week.gettingStarted', 'Getting started')}
          value={describeRating(week.ratings.start) ?? t('meditate.week.notRated', 'Not rated')}
        />
        <ListRow
          title={t('meditate.week.stayingWithIt', 'Staying with it')}
          value={describeRating(week.ratings.stay) ?? t('meditate.week.notRated', 'Not rated')}
        />
      </ListGroup>
    </ScrollView>
  );
};

const Tile: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
    <Text style={ms.muted}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
    {!!note && <Text style={ms.muted}>{note}</Text>}
  </View>
);

const styles = StyleSheet.create({
  windowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  windowTitles: { flex: 1, alignItems: 'center' },
  pager: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headline: { ...TextStyles.title3, color: Colors.dark, textAlign: 'center', marginBottom: Spacing.sm },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 2 },
  tileValue: { ...TextStyles.title2, color: Colors.dark },
});

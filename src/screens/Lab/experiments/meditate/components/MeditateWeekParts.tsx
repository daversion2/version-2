import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { CompletionLog } from '../../../../../types';
import { appCheckinId, clampWeeklyGoal } from '../../../../../services/appCheckins';
import { MODES } from '../../../../../services/meditateMath';
import { buildMeditateWeek, describeMeditateWeek, MeditateDay, MeditateDayKind } from '../../../../../services/meditateWeek';
import { fetchAllNudgeLogs } from '../../../../../services/practices';
import { DEFAULT_WEEK_VIEW, weekWindow, windowTitle } from '../../../../../services/workoutWeek';
import { toLocalDateString } from '../../../../../utils/date';
import { useMeditate } from '../MeditateContext';
import { MEDITATE_ACCENT, ms } from './meditateStyle';

// =============================================================================
// THE WEEK, DRAWN — shared by the Week screen, the Day screen and the card on
// the Meditate home. The numbers come from services/meditateWeek.ts.
// =============================================================================

/** How far back the ratings are read: the Week screen pages back through these. */
const LOG_DAYS = 120;

/** The account's Meditate check-ins, read on focus. Until they arrive the week draws from sessions alone. */
export const useMeditateLogs = (userId: string): CompletionLog[] => {
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const since = new Date();
      since.setDate(since.getDate() - LOG_DAYS);
      fetchAllNudgeLogs(userId, toLocalDateString(since))
        .then((all) => live && setLogs(all.filter((l) => l.reference_id === appCheckinId('meditate'))))
        .catch((e) => console.warn('Meditate week: loading the ratings failed:', e));
      return () => {
        live = false;
      };
    }, [userId])
  );
  return logs;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const iconFor = (kind: MeditateDayKind): IconName | null => {
  if (kind === 'sit' || kind === 'breathe' || kind === 'nsdr') return MODES[kind].icon as IconName;
  if (kind === 'mixed') return 'sparkles-outline';
  return kind === 'logged' ? 'checkmark' : null;
};

const weekdayLetter = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });

export const meditateWeekdayName = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

const DayMark: React.FC<{ day: MeditateDay; size: number }> = ({ day, size }) => {
  const icon = iconFor(day.kind);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (icon) {
    return (
      <View style={[styles.mark, round, { backgroundColor: MEDITATE_ACCENT }]}>
        <Ionicons name={icon} size={size * 0.52} color={Colors.white} />
      </View>
    );
  }
  if (day.kind === 'ahead') return <View style={[styles.mark, styles.ahead, round]} />;
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <View style={styles.restDot} />
    </View>
  );
};

/** The seven days in a row, each tappable when `onOpenDay` is given. */
export const MeditateWeekStrip: React.FC<{
  days: MeditateDay[];
  onOpenDay?: (date: string) => void;
  size?: number;
}> = ({ days, onOpenDay, size = 32 }) => (
  <View style={styles.strip}>
    {days.map((day) => {
      const what = day.sessions.length > 0 ? day.sessions.map((s) => s.name).join(', ') : day.ahead ? 'still to come' : 'rest';
      const label = `${meditateWeekdayName(day.date)}${day.isToday ? ', today' : ''}: ${what}`;
      const body = (
        <>
          <Text style={[styles.letter, day.isToday && styles.letterToday]}>{weekdayLetter(day.date)}</Text>
          <DayMark day={day} size={size} />
          <Text style={styles.caption} numberOfLines={1}>
            {day.caption}
          </Text>
          {day.isToday && <View style={styles.todayBar} />}
        </>
      );
      return onOpenDay && !day.ahead ? (
        <TouchableOpacity
          key={day.date}
          style={styles.day}
          onPress={() => onOpenDay(day.date)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {body}
        </TouchableOpacity>
      ) : (
        <View key={day.date} style={styles.day} accessible accessibilityLabel={label}>
          {body}
        </View>
      );
    })}
  </View>
);

/** The week at a glance on the home. A tap opens the Week screen. */
export const MeditateWeekCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { sessions, prefs, userId } = useMeditate();
  const logs = useMeditateLogs(userId);
  const view = prefs.week_view ?? DEFAULT_WEEK_VIEW;
  const goal = clampWeeklyGoal(prefs.weekly_goal, 'meditate');
  const week = useMemo(() => {
    const now = new Date();
    return buildMeditateWeek({ sessions, logs, window: weekWindow(view, now, 0), prior: weekWindow(view, now, 1), now });
  }, [sessions, logs, view]);

  return (
    <TouchableOpacity
      style={[ms.card, styles.card]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityHint="Opens your week, day by day"
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{windowTitle(week.window)}</Text>
          <Text style={ms.title}>{describeMeditateWeek(week, goal)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </View>
      <MeditateWeekStrip days={week.days} size={28} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { ...TextStyles.footnote, fontWeight: '600', color: MEDITATE_ACCENT },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4, minHeight: 44 },
  letter: { ...TextStyles.footnote, color: Colors.gray, fontWeight: '600' },
  letterToday: { color: MEDITATE_ACCENT },
  mark: { alignItems: 'center', justifyContent: 'center' },
  ahead: { borderWidth: 1.5, borderColor: Colors.separator, borderStyle: 'dashed' },
  restDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.separator },
  caption: { ...TextStyles.caption, color: Colors.label2, maxWidth: '96%', textAlign: 'center' },
  todayBar: { width: 16, height: 3, borderRadius: 2, backgroundColor: MEDITATE_ACCENT, marginTop: -2 },
});

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TextStyles } from '../../../../../constants/theme';
import type { CompletionLog } from '../../../../../types';
import type { WeightUnit } from '../../../../../types/workouts';
import { fetchAllNudgeLogs } from '../../../../../services/practices';
import { appCheckinId } from '../../../../../services/appCheckins';
import { formatSeconds, formatVolume } from '../../../../../services/workoutMath';
import { DayKind, WeekDay, WorkoutWeek } from '../../../../../services/workoutWeek';
import { toLocalDateString } from '../../../../../utils/date';
import { WORKOUTS_ACCENT } from './workoutsStyle';

// =============================================================================
// THE WEEK, DRAWN — shared by the Week screen, the Day screen and the card on
// the Workouts home. The numbers come from services/workoutWeek.ts.
// =============================================================================

/** How far back the ratings are read: the Week screen pages back through these. */
const LOG_DAYS = 120;

/**
 * The account's Workouts check-ins, read on focus: the week's two ratings,
 * and the workouts logged with no session ("Log a past workout"). Until they
 * arrive the week draws from sessions alone.
 */
export const useWorkoutLogs = (userId: string): CompletionLog[] => {
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const since = new Date();
      since.setDate(since.getDate() - LOG_DAYS);
      fetchAllNudgeLogs(userId, toLocalDateString(since))
        .then((all) => live && setLogs(all.filter((l) => l.reference_id === appCheckinId('workouts'))))
        .catch((e) => console.warn('Week: loading the ratings failed:', e));
      return () => {
        live = false;
      };
    }, [userId])
  );
  return logs;
};

const ICON: Record<DayKind, React.ComponentProps<typeof Ionicons>['name'] | null> = {
  strength: 'barbell',
  cardio: 'heart',
  mixed: 'flash',
  logged: 'checkmark',
  rest: null,
  ahead: null,
};

export const DAY_KIND_WORDS: Record<DayKind, string> = {
  strength: 'strength',
  cardio: 'cardio',
  mixed: 'strength and cardio',
  logged: 'a workout',
  rest: 'rest',
  ahead: 'still to come',
};

const weekdayLetter = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });

const weekdayName = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

/** One mark per day: barbell, heart, both, a plain check for no details, a dot for rest. */
const DayMark: React.FC<{ day: WeekDay; size: number }> = ({ day, size }) => {
  const icon = ICON[day.kind];
  if (icon) {
    return (
      <View
        style={[
          styles.mark,
          { width: size, height: size, borderRadius: size / 2 },
          { backgroundColor: day.kind === 'cardio' ? WORKOUTS_ACCENT + 'B3' : WORKOUTS_ACCENT },
        ]}
      >
        <Ionicons name={icon} size={size * 0.5} color={Colors.white} />
      </View>
    );
  }
  if (day.kind === 'ahead') {
    return <View style={[styles.mark, styles.ahead, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <View style={styles.restDot} />
    </View>
  );
};

/** The seven days in a row, each tappable when `onOpenDay` is given. */
export const WeekStrip: React.FC<{
  days: WeekDay[];
  onOpenDay?: (date: string) => void;
  /** Names under the marks; the compact card leaves them out on small widths. */
  captions?: boolean;
  size?: number;
}> = ({ days, onOpenDay, captions = true, size = 32 }) => (
  <View style={styles.strip}>
    {days.map((day) => {
      const label = `${weekdayName(day.date)}${day.isToday ? ', today' : ''}: ${
        day.sessions.length > 0 ? day.sessions.map((s) => s.name).join(', ') : DAY_KIND_WORDS[day.kind]
      }`;
      const body = (
        <>
          <Text style={[styles.letter, day.isToday && styles.letterToday]}>{weekdayLetter(day.date)}</Text>
          <DayMark day={day} size={size} />
          {captions && (
            <Text style={styles.caption} numberOfLines={1}>
              {day.caption}
            </Text>
          )}
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

/** "2h 50m · 41 sets · 12,400 lb" — the parts there are. */
export const weekTotalsLine = (week: WorkoutWeek, unit: WeightUnit): string =>
  [
    week.durationSec > 0 ? formatSeconds(week.durationSec) : null,
    week.sets > 0 ? `${week.sets} ${week.sets === 1 ? 'set' : 'sets'}` : null,
    week.volumeKg > 0 ? formatVolume(week.volumeKg, unit) : null,
    week.cardio.totalMin >= 1 ? `${Math.round(week.cardio.totalMin)} min cardio` : null,
  ]
    .filter(Boolean)
    .join(' · ');

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4, minHeight: 44 },
  letter: { ...TextStyles.footnote, color: Colors.gray, fontWeight: '600' },
  letterToday: { color: WORKOUTS_ACCENT },
  mark: { alignItems: 'center', justifyContent: 'center' },
  ahead: { borderWidth: 1.5, borderColor: Colors.separator, borderStyle: 'dashed' },
  restDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.separator },
  caption: { ...TextStyles.caption, color: Colors.label2, maxWidth: '96%', textAlign: 'center' },
  todayBar: { width: 16, height: 3, borderRadius: 2, backgroundColor: WORKOUTS_ACCENT, marginTop: -2 },
});

export { weekdayName };

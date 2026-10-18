import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HabitPace } from '../../services/habitPace';
import { Copy } from '../common/Copy';

interface Props {
  name: string;
  pace: HabitPace;
  accentColor: string;
  /** The seven dates of the current week, Monday first. */
  weekDates: string[];
  /** Today as YYYY-MM-DD — the boundary between "can log" and "hasn't happened". */
  today: string;
  /** Does this habit have briefing content worth an "About" route? */
  hasAbout: boolean;
  /** Backfill a specific past day. */
  onLogDay: (date: string) => void;
  /** The briefing: what it is, what will try to stop you. */
  onAbout: () => void;
  /** The full check-in. */
  onLogDetails: () => void;
  /** The habit's page: history, schedule, plan. */
  onHistory: () => void;
}

/** Monday-first initials, matching weekDatesFor's ordering. */
const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * What the › on a Today row opens, under the row: the habit's week (tap a day
 * to log it for that date) and named routes to About, Log details and History.
 * The founder's call, 2026-10-18 — this is the panel the old Today card opened
 * on a tap, kept when the row's tap became the quick log.
 */
export const TodayRowPanel: React.FC<Props> = ({
  name,
  pace,
  accentColor,
  weekDates,
  today,
  hasAbout,
  onLogDay,
  onAbout,
  onLogDetails,
  onHistory,
}) => {
  const doneDates = new Set(pace.doneDates);
  const dueDates = new Set(pace.dueDates);

  return (
    <View style={styles.panel}>
      <View style={styles.weekStrip}>
        {weekDates.map((date, i) => {
          const isDayDone = doneDates.has(date);
          const isToday = date === today;
          const isFuture = date > today;
          const isDue = dueDates.has(date);
          const isMissed = isDue && !isDayDone && date < today;
          const canLog = !isFuture && !isDayDone;
          return (
            <TouchableOpacity
              key={date}
              disabled={!canLog}
              onPress={() => onLogDay(date)}
              hitSlop={4}
              style={[
                styles.day,
                isDue && !isDayDone && styles.dayDue,
                isMissed && styles.dayMissed,
                isToday && !isDayDone && { borderColor: accentColor, borderWidth: 1.5 },
                isDayDone && { backgroundColor: accentColor, borderColor: accentColor },
                isFuture && styles.dayFuture,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isDayDone ? `${name} logged on ${date}` : isFuture ? `${date}, not yet` : `Log ${name} for ${date}`
              }
            >
              <Text style={[styles.dayText, isDayDone && styles.dayTextDone]}>{DAY_INITIALS[i]}</Text>
            </TouchableOpacity>
          );
        })}
        {pace.status === 'no_target' ? (
          <Copy id="today.row.countThisWeek" style={styles.weekCount} vars={{ completed: pace.completed }}>
            {'{completed} this week'}
          </Copy>
        ) : (
          <Copy
            id="today.row.ofTarget"
            style={styles.weekCount}
            vars={{ completed: pace.completed, target: pace.target }}
          >
            {'{completed} of {target}'}
          </Copy>
        )}
      </View>

      <Copy id="today.row.backfillHint" style={styles.backfillHint}>
        {'Tap a day to log it for that date.'}
      </Copy>

      <View style={styles.routes}>
        {hasAbout && (
          <TouchableOpacity style={styles.route} onPress={onAbout} activeOpacity={0.7}>
            <Ionicons name="book-outline" size={14} color={Colors.gray} />
            <Copy id="today.row.about" style={styles.routeText} numberOfLines={1}>
              {'About'}
            </Copy>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.route} onPress={onLogDetails} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={14} color={Colors.gray} />
          <Copy id="today.row.logDetails" style={styles.routeText} numberOfLines={1}>
            {'Log details'}
          </Copy>
        </TouchableOpacity>
        <TouchableOpacity style={styles.route} onPress={onHistory} activeOpacity={0.7}>
          <Ionicons name="stats-chart-outline" size={14} color={Colors.gray} />
          <Copy id="today.row.history" style={styles.routeText} numberOfLines={1}>
            {'History'}
          </Copy>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: Spacing.md - 2,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  weekStrip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  day: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  // A day the habit committed to reads heavier than a day it merely could be done.
  dayDue: { backgroundColor: Colors.lightGray },
  dayMissed: { borderColor: Colors.secondary, borderStyle: 'dashed' },
  dayFuture: { opacity: 0.4 },
  dayText: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray },
  dayTextDone: { color: Colors.white, fontFamily: Fonts.secondaryBold },
  weekCount: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginLeft: Spacing.xs },
  backfillHint: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray },
  routes: { flexDirection: 'row', gap: Spacing.xs, marginTop: 2 },
  route: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
});

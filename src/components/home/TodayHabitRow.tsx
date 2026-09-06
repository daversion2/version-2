import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HabitPace, sectionFor } from '../../services/habitPace';
import { RESISTANCE_LEVELS } from '../../constants/resistance';

interface Props {
  name: string;
  pace: HabitPace;
  accentColor?: string;
  /** The seven dates of the current week, Monday first. */
  weekDates: string[];
  /** Today as YYYY-MM-DD — the boundary between "can log" and "hasn't happened". */
  today: string;
  /** Consecutive days logged. Only shown once it means something (2+). */
  streak?: number;
  /** Open? Only one row is open at a time, so the list never becomes a wall. */
  expanded: boolean;
  /** False for timed and multi-metric habits, which still need the sheet. */
  canQuickLog: boolean;
  /** Does this habit have briefing content worth an "About" route? */
  hasAbout: boolean;

  /** Open/close this row's panel. The card body's tap. */
  onToggleExpand: () => void;
  /** One-tap log at the pressed resistance level (1–3). */
  onQuickLog: (resistance: number) => void;
  /** The full capture sheet — for sheet-only habits, and for adding notes. */
  onOpenSheet: () => void;
  /** Backfill a specific past day. */
  onLogDay: (date: string) => void;
  /** The briefing: what it is, what will try to stop you. */
  onAbout: () => void;
  /** History, adherence, schedule, archive. */
  onDetails: () => void;
}

/** Monday-first initials, matching weekDatesFor's ordering. */
const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Compact chip labels. The full wording lives in RESISTANCE_LEVELS and is used
 * for the accessibility label, so a screen reader hears "Difficult but
 * manageable" while the chip shows what fits in 34 points.
 */
const CHIP_CAPTIONS = ['Easy', 'Push', 'Hard'];

/**
 * What this card adds to what its SECTION already said.
 *
 * The heading carries the status now — "Due today", "Behind this week" — so
 * repeating it on every card would be saying the same thing twice, once per
 * habit. This returns only the part the heading cannot: how short the week is,
 * or which specific days were missed.
 */
const detailFor = (pace: HabitPace): string | null => {
  switch (sectionFor(pace)) {
    case 'due_today':
      return pace.missed > 0
        ? `Missed ${pace.missed} ${pace.missed === 1 ? 'day' : 'days'} this week`
        : null;
    case 'behind':
      return pace.todayTarget > 0
        ? `${pace.completed} of ${pace.target} · do ${pace.todayTarget} today`
        : `${pace.completed} of ${pace.target} this week`;
    case 'open':
      if (pace.status === 'no_target') {
        return pace.completed === 0 ? 'No weekly goal set' : `${pace.completed} this week`;
      }
      return pace.dayScheduled ? pace.scheduleLabel : `${pace.completed} of ${pace.target}`;
    case 'done':
      return pace.doneToday ? 'Logged today' : 'Target hit';
  }
};

/**
 * One habit on Today.
 *
 * Collapsed, it is a name and a way to log — because that is what the screen is
 * for. Tapping it opens the week, the backfill grid, and named routes to the
 * other two things you can do with a habit. The ⋮ menu is gone: everything it
 * hid now has a word on it.
 */
export const TodayHabitRow: React.FC<Props> = ({
  name,
  pace,
  accentColor = Colors.primary,
  weekDates,
  today,
  streak = 0,
  expanded,
  canQuickLog,
  hasAbout,
  onToggleExpand,
  onQuickLog,
  onOpenSheet,
  onLogDay,
  onAbout,
  onDetails,
}) => {
  const { doneToday } = pace;
  const detail = detailFor(pace);
  const isDone = sectionFor(pace) === 'done';
  const doneDates = new Set(pace.doneDates);
  const dueDates = new Set(pace.dueDates);

  return (
    <View style={[styles.card, isDone && styles.cardDim, expanded && styles.cardOpen]}>
      <View style={styles.head}>
        <TouchableOpacity
          style={styles.body}
          onPress={onToggleExpand}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${name}. ${detail ?? ''} Tap for the week and more.`}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.name, isDone && styles.nameDim]} numberOfLines={1}>
              {name}
            </Text>
            {doneToday && <Ionicons name="checkmark-circle" size={16} color={accentColor} />}
            {/* A one-day "streak" is just a day. Two is the first number that
                means the thing came back, which is what a streak is for. */}
            {streak >= 2 && (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={11} color={Colors.secondary} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>
          {!!detail && <Text style={styles.detail}>{detail}</Text>}
        </TouchableOpacity>

        {/*
          The action zone. Three states, and only ever one of them:

            done      a tick, nothing to press
            quick     three chips — the tap that logs is the tap that rates
            sheet     a single control, because a timed or multi-field habit
                      cannot be answered in one tap and should not pretend to be
        */}
        {isDone ? (
          <View style={[styles.doneMark, { backgroundColor: accentColor }]}>
            <Ionicons name="checkmark" size={17} color={Colors.white} />
          </View>
        ) : canQuickLog ? (
          <View style={styles.chips}>
            {RESISTANCE_LEVELS.map((level, i) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => onQuickLog(level.value)}
                style={[styles.chip, CHIP_STYLES[i]]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Log ${name} — ${level.label}. ${level.sublabel}.`}
              >
                <Text style={[styles.chipGlyph, CHIP_TEXT[i]]}>{level.value}</Text>
                <Text style={[styles.chipCap, CHIP_TEXT[i]]}>{CHIP_CAPTIONS[i]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            onPress={onOpenSheet}
            hitSlop={8}
            style={[styles.sheetBtn, { borderColor: accentColor }]}
            accessibilityRole="button"
            accessibilityLabel={`Log ${name}`}
          >
            <Ionicons name="chevron-forward" size={18} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={styles.panel}>
          {/*
            The week as it actually is: seven days, Monday first. It lives here
            rather than on the collapsed card because it is the thing you read
            about ONE habit you are thinking about, not something you scan
            across eight of them.
          */}
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
                    isDayDone
                      ? `${name} logged on ${date}`
                      : isFuture
                        ? `${date}, not yet`
                        : `Log ${name} for ${date}`
                  }
                >
                  <Text
                    style={[
                      styles.dayText,
                      isDayDone && styles.dayTextDone,
                      isFuture && styles.dayTextFuture,
                    ]}
                  >
                    {DAY_INITIALS[i]}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.weekCount}>
              {pace.status === 'no_target'
                ? `${pace.completed} this week`
                : `${pace.completed} of ${pace.target}`}
            </Text>
          </View>

          <Text style={styles.backfillHint}>Tap a day to log it for that date.</Text>

          {/* Named routes, replacing the ⋮ that hid all of this behind a glyph. */}
          <View style={styles.routes}>
            {hasAbout && (
              <TouchableOpacity style={styles.route} onPress={onAbout} activeOpacity={0.7}>
                <Ionicons name="book-outline" size={14} color={Colors.gray} />
                <Text style={styles.routeText}>About</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.route} onPress={onOpenSheet} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={14} color={Colors.gray} />
              <Text style={styles.routeText}>Log with notes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.route} onPress={onDetails} activeOpacity={0.7}>
              <Ionicons name="stats-chart-outline" size={14} color={Colors.gray} />
              <Text style={styles.routeText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// Intensity ramp, reusing the app's own semantics: neutral, then primary, then
// the orange it already spends on effort and attention.
const CHIP_STYLES = [
  { borderColor: '#C9D6D6' },
  { borderColor: Colors.primary },
  { borderColor: Colors.secondary },
];

const CHIP_TEXT = [
  { color: Colors.gray },
  { color: Colors.primary },
  { color: Colors.secondary },
];

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardDim: { opacity: 0.6 },
  cardOpen: { borderColor: Colors.gray + '55' },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flexShrink: 1,
  },
  nameDim: { color: Colors.gray },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.lightGray,
  },
  streakText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary },
  detail: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },

  chips: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: Spacing.sm },
  chip: {
    width: 34,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  chipGlyph: { fontFamily: Fonts.primaryBold, fontSize: 15, lineHeight: 17 },
  chipCap: { fontFamily: Fonts.secondary, fontSize: 8, lineHeight: 10 },

  doneMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sheetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },

  panel: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  weekStrip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  day: {
    width: 22,
    height: 22,
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
  dayText: { fontFamily: Fonts.secondary, fontSize: 10, color: Colors.gray },
  dayTextDone: { color: Colors.white, fontFamily: Fonts.secondaryBold },
  dayTextFuture: { color: Colors.gray },
  weekCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
  backfillHint: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.border },

  routes: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  route: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
});

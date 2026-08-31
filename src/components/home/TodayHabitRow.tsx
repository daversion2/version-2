import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HabitPace } from '../../services/habitPace';
import { resistanceLabel } from '../../constants/resistance';

interface Props {
  name: string;
  pace: HabitPace;
  accentColor?: string;
  /** Primary action — log this habit. */
  onPress: () => void;
  /**
   * Secondary action. Currently opens the habit's detail page, which is where
   * edit and history live. Intended to become a proper overflow menu once a
   * "not doing this today" action exists to put in it.
   */
  onDetails: () => void;
}

// No "can't reach it" state: a habit can be done more than once in a day, so
// being several short late in the week is behind, not impossible.
const STATUS_COPY: Record<HabitPace['status'], string | null> = {
  behind: 'Behind pace',
  on_pace: null,
  no_target: 'No weekly goal set',
  done: 'Target hit',
};

/**
 * One habit on Today.
 *
 * Carries the resistance last recorded for this habit, because that is the
 * number the product is trying to move and this is the moment it matters — the
 * point where someone decides whether to start. Everywhere else it's history;
 * here it's context for a decision.
 *
 * The whole row is the log action. The overflow menu holds everything else so
 * the primary action can't be missed or mis-tapped.
 */
export const TodayHabitRow: React.FC<Props> = ({
  name,
  pace,
  accentColor = Colors.primary,
  onPress,
  onDetails,
}) => {
  const { target, completed, status, lastResistance, doneToday } = pace;
  const statusLine = STATUS_COPY[status];
  // Only a finished habit dims. A habit with no goal set is not finished — it
  // was never measured, and dimming it buries the curated practices, which are
  // seeded with no weekly target.
  const dim = status === 'done';
  const noTarget = status === 'no_target';

  return (
    <TouchableOpacity
      style={[styles.row, dim && styles.rowDim]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Log ${name}. ${completed} of ${target} this week.`}
    >
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, dim && styles.nameDim]} numberOfLines={1}>
            {name}
          </Text>
          {doneToday && (
            <Ionicons name="checkmark-circle" size={16} color={accentColor} />
          )}
        </View>

        {/* Weekly progress: one pip per required rep. Concrete at a glance in a
            way a percentage bar isn't — "2 of 4" is the actual unit of the week.
            With no goal there is nothing to draw pips against, so it reports the
            plain count instead of an incoherent "0 of 0". */}
        {noTarget ? (
          <Text style={styles.progressText}>
            {completed === 0
              ? 'Not done yet this week'
              : `Done ${completed} ${completed === 1 ? 'time' : 'times'} this week`}
          </Text>
        ) : (
          <View style={styles.pipRow}>
            {Array.from({ length: target }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pip,
                  i < completed && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
              />
            ))}
            <Text style={styles.progressText}>
              {completed} of {target} this week
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          {!!statusLine && (
            <Text
              style={[
                styles.status,
                status === 'behind' && { color: Colors.secondary },
                status === 'done' && { color: Colors.gray },
              ]}
            >
              {statusLine}
            </Text>
          )}
          {typeof lastResistance === 'number' && (
            <Text style={styles.resistance}>
              {statusLine ? ' · ' : ''}Last felt like a {lastResistance} — {resistanceLabel(lastResistance).toLowerCase()}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={onDetails}
        hitSlop={12}
        style={styles.menuBtn}
        accessibilityRole="button"
        accessibilityLabel={`Details for ${name}`}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={Colors.gray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  rowDim: { opacity: 0.6 },
  main: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, flexShrink: 1 },
  nameDim: { color: Colors.gray },
  pipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  progressText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  status: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary },
  resistance: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  menuBtn: { padding: Spacing.sm },
});

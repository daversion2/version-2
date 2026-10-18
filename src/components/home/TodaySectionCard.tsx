import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useCopy } from '../../context/CopyContext';

interface Props {
  name: string;
  color: string;
  /** Rows that need you today — rendered as given. */
  rows: React.ReactNode[];
  /** Habits with nothing owed today, behind "N more this week". */
  weekRows: React.ReactNode[];
  /** Habits done today or for the week, behind "N done". */
  doneRows: React.ReactNode[];
}

/**
 * One section on Today (Mind, Movement or Meals): a heading with a dot of the
 * section's colour and a count, then one card. What isn't owed today and what
 * is already done fold into two links at the foot, so the card shows only what
 * needs you.
 */
export const TodaySectionCard: React.FC<Props> = ({ name, color, rows, weekRows, doneRows }) => {
  const t = useCopy();
  const [showWeek, setShowWeek] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const allDone = rows.length === 0;
  const total = rows.length + doneRows.length;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.name} accessibilityRole="header">
          {name}
        </Text>
        <Text style={[styles.count, allDone && { color }]}>
          {allDone
            ? t('today.section.allDone', 'Done')
            : t('today.section.count', '{done} of {total}', { done: doneRows.length, total })}
        </Text>
      </View>

      <View style={styles.card}>
        {rows}
        {allDone && (
          <View style={styles.doneForToday}>
            <Ionicons name="checkmark" size={18} color={color} />
            <Text style={[styles.doneForTodayText, { color }]}>
              {t('today.section.doneForToday', 'Done for today')}
            </Text>
          </View>
        )}
        {showWeek && weekRows.length > 0 && <View style={styles.folded}>{weekRows}</View>}
        {showDone && doneRows.length > 0 && <View style={styles.folded}>{doneRows}</View>}

        {(weekRows.length > 0 || doneRows.length > 0) && (
          <View style={styles.footer}>
            {weekRows.length > 0 ? (
              <TouchableOpacity
                onPress={() => setShowWeek((v) => !v)}
                style={styles.footerBtn}
                accessibilityRole="button"
                accessibilityState={{ expanded: showWeek }}
              >
                <Text style={styles.footerText}>
                  {showWeek
                    ? t('today.section.hideWeek', 'Hide this week')
                    : t('today.section.moreThisWeek', '{count} more this week', { count: weekRows.length })}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            {doneRows.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowDone((v) => !v)}
                style={styles.footerBtn}
                accessibilityRole="button"
                accessibilityState={{ expanded: showDone }}
              >
                <Text style={styles.footerText}>
                  {showDone
                    ? t('today.section.hideDone', 'Hide done')
                    : t('today.section.done', '{count} done', { count: doneRows.length })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: Spacing.lg, gap: Spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: {
    flex: 1,
    fontFamily: Fonts.primaryBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.dark,
  },
  count: { fontFamily: Fonts.secondaryBold, fontSize: 13, color: Colors.gray },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  folded: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  doneForToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.md - 2,
    minHeight: 52,
  },
  doneForTodayText: { fontFamily: Fonts.secondaryBold, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xs,
  },
  footerBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm + 2 },
  footerText: { fontFamily: Fonts.secondaryBold, fontSize: 13, color: Colors.gray },
});

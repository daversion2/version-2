import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import { MetricFamilyReport } from '../../services/metricFamilies';

interface MetricFamiliesSectionProps {
  reports: MetricFamilyReport[];
  onHabitPress: (habitId: string) => void;
}

/**
 * The cross-habit lens on the same reps Training Volume shows per habit.
 *
 * Pick a metric — Time, Distance, Grade — and every habit that logs it rolls up
 * together: run 4 miles, walk 2, cycle 10, one Distance number. Chips only
 * appear for metrics the user has actually logged, so nobody sees an empty
 * Distance tab because they don't track distance.
 */
export const MetricFamiliesSection: React.FC<MetricFamiliesSectionProps> = ({
  reports,
  onHabitPress,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <View style={styles.section}>
        <Copy id="progress.metrics.title" style={styles.title}>
          Totals by Type
        </Copy>
        <Copy id="progress.metrics.empty" style={styles.empty}>
          {'Log a habit that tracks something — minutes, miles, push-ups — and every habit measuring the same thing will roll up here.'}
        </Copy>
      </View>
    );
  }

  // Derived rather than stored: when the time filter changes, a family can drop
  // out of the list entirely, and a stale id would blank the section.
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0];

  return (
    <View style={styles.section}>
      <Copy id="progress.metrics.title" style={styles.title}>
        Totals by Type
      </Copy>
      <Copy id="progress.metrics.note" style={styles.note}>
        Every habit that measures the same thing, added up together.
      </Copy>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {reports.map((report) => {
          const isActive = report.id === selected.id;
          return (
            <TouchableOpacity
              key={report.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedId(report.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={report.icon as any}
                size={14}
                color={isActive ? Colors.white : Colors.gray}
              />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {report.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FamilyDetail report={selected} onHabitPress={onHabitPress} />
    </View>
  );
};

const MIN_CHART_WEEKS = 3;
const CHART_HEIGHT = 96;

const FamilyDetail: React.FC<{
  report: MetricFamilyReport;
  onHabitPress: (habitId: string) => void;
}> = ({ report, onHabitPress }) => {
  const t = useCopy();
  const habitWord =
    report.habits.length === 1
      ? t('progress.metrics.word.habit.one', 'habit')
      : t('progress.metrics.word.habit.other', 'habits');
  const logWord =
    report.logged === 1
      ? t('progress.metrics.word.checkin.one', 'check-in')
      : t('progress.metrics.word.checkin.other', 'check-ins');
  const captionVars = {
    habitCount: report.habits.length,
    habitWord,
    logCount: report.logged,
    logWord,
  };
  const showChart = report.weekly.filter((w) => w.logged > 0).length >= MIN_CHART_WEEKS;
  const maxHabitValue = Math.max(...report.habits.map((h) => h.value), 0);

  return (
    <Card style={styles.card}>
      {report.combinable ? (
        <>
          <Text style={styles.headline}>{report.formattedValue}</Text>
          {report.aggregate === 'avg' ? (
            report.direction === 'down' ? (
              <Copy id="progress.metrics.caption.avg.lowerbetter" style={styles.headlineCaption} vars={captionVars}>
                {'average across {habitCount} {habitWord} · {logCount} {logWord} · lower is better'}
              </Copy>
            ) : (
              <Copy id="progress.metrics.caption.avg" style={styles.headlineCaption} vars={captionVars}>
                {'average across {habitCount} {habitWord} · {logCount} {logWord}'}
              </Copy>
            )
          ) : report.direction === 'down' ? (
            <Copy id="progress.metrics.caption.total.lowerbetter" style={styles.headlineCaption} vars={captionVars}>
              {'total across {habitCount} {habitWord} · {logCount} {logWord} · lower is better'}
            </Copy>
          ) : (
            <Copy id="progress.metrics.caption.total" style={styles.headlineCaption} vars={captionVars}>
              {'total across {habitCount} {habitWord} · {logCount} {logWord}'}
            </Copy>
          )}
        </>
      ) : (
        <>
          <Copy
            id="progress.metrics.mixed.headline"
            style={styles.headline}
            boldStyle={styles.headlineUnit}
            vars={captionVars}
          >
            {'{logCount} **{logWord}**'}
          </Copy>
          <Copy id="progress.metrics.mixed.caption" style={styles.headlineCaption} vars={captionVars}>
            {'across {habitCount} {habitWord}'}
          </Copy>
          {/* Both habits use the Count template, but one counts glasses and the
              other counts pages. Adding them would invent a number. */}
          <Copy id="progress.metrics.mixed.note" style={styles.mixedNote}>
            {'These habits measure different things, so they’re kept separate rather than added up.'}
          </Copy>
        </>
      )}

      {showChart && <WeeklyBars report={report} />}

      <View style={styles.habitList}>
        {report.habits.map((habit) => (
          <TouchableOpacity
            key={habit.habitId}
            style={styles.habitRow}
            onPress={() => onHabitPress(habit.habitId)}
            activeOpacity={0.7}
          >
            <Ionicons name={habit.icon as any} size={16} color={habit.color} />
            <View style={styles.habitBody}>
              <View style={styles.habitTopRow}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={styles.habitValue}>{habit.formattedValue}</Text>
              </View>
              <View style={styles.habitBarTrack}>
                <View
                  style={[
                    styles.habitBarFill,
                    {
                      width: `${maxHabitValue > 0 ? (habit.value / maxHabitValue) * 100 : 0}%`,
                      backgroundColor: habit.color,
                    },
                  ]}
                />
              </View>
              {habit.logged === 1 ? (
                <Copy id="progress.metrics.habit.checkins.one" style={styles.habitReps} vars={{ count: habit.logged }}>
                  {'{count} check-in'}
                </Copy>
              ) : (
                <Copy id="progress.metrics.habit.checkins.other" style={styles.habitReps} vars={{ count: habit.logged }}>
                  {'{count} check-ins'}
                </Copy>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {report.best && (
        <View style={styles.bestRow}>
          <Ionicons name="trophy-outline" size={14} color={Colors.secondary} />
          {report.best.habitName ? (
            <Copy
              id="progress.metrics.best.withhabit"
              style={styles.bestText}
              vars={{ value: report.best.formatted, habit: report.best.habitName }}
            >
              {'Best: {value} · {habit}'}
            </Copy>
          ) : (
            <Copy id="progress.metrics.best" style={styles.bestText} vars={{ value: report.best.formatted }}>
              {'Best: {value}'}
            </Copy>
          )}
        </View>
      )}
    </Card>
  );
};

/**
 * Weeks with nothing logged render as an empty slot, never a zero bar — for an
 * averaging family a zero would read as "your grade was 0 that week".
 */
const WeeklyBars: React.FC<{ report: MetricFamilyReport }> = ({ report }) => {
  const maxValue = Math.max(...report.weekly.filter((w) => w.logged > 0).map((w) => w.value), 0);

  return (
    <View style={styles.chartBlock}>
      <Copy id="progress.metrics.chart.label" style={styles.chartLabel}>
        Per week
      </Copy>
      <View style={styles.chartArea}>
        {report.weekly.map((week) => (
          <View key={week.weekStart} style={styles.barWrapper}>
            {week.logged > 0 ? (
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(2, maxValue > 0 ? (week.value / maxValue) * CHART_HEIGHT : 2),
                  },
                ]}
              />
            ) : (
              <View style={styles.barEmpty} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>{formatWeek(report.weekly[0].weekStart)}</Text>
        <Text style={styles.axisLabel}>
          {formatWeek(report.weekly[report.weekly.length - 1].weekStart)}
        </Text>
      </View>
    </View>
  );
};

function formatWeek(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  note: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  chipTextActive: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.white,
  },
  card: {
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  headline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  headlineUnit: {
    fontSize: FontSizes.lg,
    color: Colors.gray,
  },
  headlineCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  mixedNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  chartBlock: {
    marginTop: Spacing.md,
  },
  chartLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barEmpty: {
    height: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  axisLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
  },
  habitList: {
    marginTop: Spacing.md,
    gap: Spacing.sm + 2,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  habitBody: {
    flex: 1,
    gap: 3,
  },
  habitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  habitName: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.lightGray,
    overflow: 'hidden',
  },
  habitBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  habitReps: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  bestText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

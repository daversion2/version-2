import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import {
  PracticePerformance,
  MetricTrend,
  WeeklyRate,
  WeeklyDose,
  ChoiceBreakdown,
  MIN_SECTION_SESSIONS,
  withUnit,
} from '../../services/practicePerformance';

// =============================================================================
// The "Performance" section of the practice detail screen: insights, per-session
// metric trend, weekly dose (cold/heat), challenge-rating trend, choice
// breakdowns, mind patterns, and records. Charts are plain Views (no SVG dep),
// following WeeklyTrendChart's bar style. Renders nothing chart-like until the
// service's sample-size gates pass — sparse data shows fewer cards, not zeros.
// =============================================================================

const WEEK_LABELS = ['8w', '7w', '6w', '5w', '4w', '3w', '2w', 'Now'];

const formatShortDate = (dateStr: string): string =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

// ---- Per-session metric bars (e.g. plunge time / sit length per session) ----

const SessionTrendCard: React.FC<{ trend: MetricTrend }> = ({ trend }) => {
  const max = Math.max(...trend.points.map((p) => p.value), 1);
  const unit = trend.field.unit;
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{trend.field.label.replace(/\?$/, '')} Per Session</Text>
      <Text style={styles.cardSub}>
        Last {trend.points.length} logged sessions, oldest to newest
      </Text>
      <View style={styles.sessionChart}>
        {trend.points.map((p, i) => (
          <View key={`${p.date}-${i}`} style={styles.sessionBarContainer}>
            <Text style={styles.sessionBarValue}>{p.value}</Text>
            <View style={styles.sessionBarWrapper}>
              <View
                style={[
                  styles.sessionBar,
                  {
                    height: `${Math.max((p.value / max) * 100, 3)}%`,
                    backgroundColor:
                      i === trend.points.length - 1 ? Colors.secondary : Colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      {trend.firstAvg !== null && (
        <View style={styles.avgRow}>
          <Text style={styles.avgText}>
            First 5 avg: <Text style={styles.avgValue}>{withUnit(trend.firstAvg, unit)}</Text>
          </Text>
          <Ionicons name="arrow-forward" size={12} color={Colors.gray} />
          <Text style={styles.avgText}>
            Last 5 avg: <Text style={styles.avgValue}>{withUnit(trend.recentAvg, unit)}</Text>
          </Text>
        </View>
      )}
    </Card>
  );
};

// ---- Weekly dose bars (cold/heat: minutes × degrees past baseline) ----

const WeeklyDoseCard: React.FC<{ dose: WeeklyDose }> = ({ dose }) => {
  const max = Math.max(...dose.values, 1);
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{dose.title}</Text>
      <Text style={styles.cardSub}>{dose.description}</Text>
      <View style={styles.weekChart}>
        {dose.values.map((v, i) => (
          <View key={i} style={styles.weekBarContainer}>
            <View style={styles.weekBarWrapper}>
              <View
                style={[
                  styles.weekBar,
                  {
                    height: `${Math.max((v / max) * 100, 2)}%`,
                    backgroundColor:
                      i === dose.values.length - 1 ? Colors.secondary : Colors.primary,
                    opacity: v === 0 ? 0.3 : 1,
                  },
                ]}
              />
            </View>
            <Text style={styles.weekBarLabel}>{WEEK_LABELS[i]}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

// ---- Weekly challenging-% stacked bars ----

const ChallengeRatingCard: React.FC<{ weeks: WeeklyRate[] }> = ({ weeks }) => (
  <Card style={styles.card}>
    <Text style={styles.cardTitle}>Challenge Rating</Text>
    <Text style={styles.cardSub}>Share of reps rated "challenging" each week</Text>
    <View style={styles.weekChart}>
      {weeks.map((w, i) => {
        const pct = w.rated > 0 ? Math.round((w.challenging / w.rated) * 100) : null;
        return (
          <View key={i} style={styles.weekBarContainer}>
            <Text style={styles.ratePctText}>{pct === null ? '–' : `${pct}`}</Text>
            <View style={styles.rateTrack}>
              {pct !== null && (
                <View style={[styles.rateFill, { height: `${Math.max(pct, 2)}%` }]} />
              )}
            </View>
            <Text style={styles.weekBarLabel}>{WEEK_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
    <View style={styles.legendRow}>
      <View style={[styles.legendSwatch, { backgroundColor: Colors.secondary }]} />
      <Text style={styles.legendText}>Challenging</Text>
      <View style={[styles.legendSwatch, { backgroundColor: Colors.border }]} />
      <Text style={styles.legendText}>Easy day</Text>
    </View>
  </Card>
);

// ---- Choice field distribution + challenging-% per option ----

const ChoiceBreakdownCard: React.FC<{ breakdown: ChoiceBreakdown }> = ({ breakdown }) => {
  const withDifficulty = breakdown.options.filter((o) => o.challengingPct !== null);
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{breakdown.field.label.replace(/\?$/, '')} Mix</Text>
      <Text style={styles.cardSub}>By session count</Text>
      {breakdown.options.map((o) => (
        <View key={o.value} style={styles.hbarRow}>
          <View style={styles.hbarLabelRow}>
            <Text style={styles.hbarLabel}>{o.label}</Text>
            <Text style={styles.hbarCount}>
              {o.count} {o.count === 1 ? 'rep' : 'reps'} · {o.pct}%
            </Text>
          </View>
          <View style={styles.hbarTrack}>
            <View
              style={[styles.hbarFill, { width: `${Math.max(o.pct, 2)}%`, backgroundColor: Colors.primary }]}
            />
          </View>
        </View>
      ))}
      {withDifficulty.length >= 2 && (
        <>
          <View style={styles.cardDivider} />
          <Text style={styles.cardTitle}>Where It Gets Hard</Text>
          <Text style={styles.cardSub}>Share of reps rated "challenging"</Text>
          {[...withDifficulty]
            .sort((a, b) => (b.challengingPct || 0) - (a.challengingPct || 0))
            .map((o) => (
              <View key={o.value} style={styles.hbarRow}>
                <View style={styles.hbarLabelRow}>
                  <Text style={styles.hbarLabel}>{o.label}</Text>
                  <Text style={[styles.hbarCount, { color: Colors.secondary }]}>
                    {o.challengingPct}%
                  </Text>
                </View>
                <View style={styles.hbarTrack}>
                  <View
                    style={[
                      styles.hbarFill,
                      { width: `${Math.max(o.challengingPct || 0, 2)}%`, backgroundColor: Colors.secondary },
                    ]}
                  />
                </View>
              </View>
            ))}
        </>
      )}
    </Card>
  );
};

// =============================================================================

interface Props {
  performance: PracticePerformance;
}

export const PracticePerformanceSection: React.FC<Props> = ({ performance }) => {
  if (performance.loggedSessions < MIN_SECTION_SESSIONS) {
    return (
      <Card style={styles.card}>
        <View style={styles.teaserRow}>
          <Ionicons name="stats-chart-outline" size={20} color={Colors.gray} />
          <Text style={styles.teaserText}>
            Log a few more reps to unlock detailed performance reporting for this practice.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View>
      {/* Insights */}
      {performance.insights.length > 0 && (
        <Card style={styles.card}>
          {performance.insights.map((insight, i) => (
            <View
              key={i}
              style={[
                styles.insightRow,
                insight.tone === 'nudge' && styles.insightRowNudge,
                i === performance.insights.length - 1 && { marginBottom: 0 },
              ]}
            >
              <Ionicons
                name={insight.icon as any}
                size={16}
                color={insight.tone === 'nudge' ? Colors.secondary : Colors.primary}
                style={styles.insightIcon}
              />
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </Card>
      )}

      {performance.primaryTrend && <SessionTrendCard trend={performance.primaryTrend} />}
      {performance.weeklyDose && <WeeklyDoseCard dose={performance.weeklyDose} />}
      {performance.weeklyChallenging && (
        <ChallengeRatingCard weeks={performance.weeklyChallenging} />
      )}
      {performance.choiceBreakdowns.map((b) => (
        <ChoiceBreakdownCard key={b.field.key} breakdown={b} />
      ))}

      {/* Mind patterns */}
      {performance.mindPatterns && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Mind Patterns</Text>
          <Text style={styles.cardSub}>What you noticed during this practice</Text>
          {performance.mindPatterns.tags.length > 0 && (
            <View style={styles.chipsRow}>
              {performance.mindPatterns.tags.map((tag) => (
                <View key={tag.id} style={styles.chip}>
                  <Text style={styles.chipLabel}>{tag.label}</Text>
                  <Text style={styles.chipCount}>{tag.count}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.mindFootnote}>
            You logged a hard moment in {performance.mindPatterns.hardMomentPct}% of reps
          </Text>
        </Card>
      )}

      {/* Records */}
      {performance.records.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Records</Text>
          {performance.records.map((record, i) => (
            <View
              key={`${record.label}-${i}`}
              style={[
                styles.recordRow,
                i === performance.records.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
              ]}
            >
              <Ionicons name={record.icon as any} size={18} color={Colors.primary} />
              <Text style={styles.recordLabel}>{record.label}</Text>
              <Text style={styles.recordValue}>{record.value}</Text>
              {record.date && (
                <Text style={styles.recordDate}>{formatShortDate(record.date)}</Text>
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  cardSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teaserText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  // Insights
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(33, 113, 128, 0.07)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  insightRowNudge: {
    backgroundColor: 'rgba(255, 91, 2, 0.07)',
    borderLeftColor: Colors.secondary,
  },
  insightIcon: {
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 19,
  },
  // Per-session bars
  sessionChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
  },
  sessionBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  sessionBarValue: {
    fontFamily: Fonts.secondary,
    fontSize: 9,
    color: Colors.gray,
    marginBottom: 2,
  },
  sessionBarWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sessionBar: {
    width: '70%',
    borderRadius: 3,
    minHeight: 4,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avgText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  avgValue: {
    fontFamily: Fonts.primaryBold,
    color: Colors.dark,
  },
  // Weekly bars (dose + challenge rating)
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  weekBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  weekBarWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  weekBar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  weekBarLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 4,
  },
  ratePctText: {
    fontFamily: Fonts.secondary,
    fontSize: 9,
    color: Colors.gray,
    marginBottom: 2,
  },
  rateTrack: {
    flex: 1,
    width: '70%',
    borderRadius: 4,
    backgroundColor: Colors.border,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  rateFill: {
    width: '100%',
    backgroundColor: Colors.secondary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginLeft: Spacing.sm,
  },
  legendText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  // Horizontal bars (choice breakdowns)
  hbarRow: {
    marginBottom: Spacing.sm,
  },
  hbarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hbarLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  hbarCount: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  hbarTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    overflow: 'hidden',
  },
  hbarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  // Mind patterns
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  chipCount: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  mindFootnote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // Records
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  recordLabel: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  recordValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  recordDate: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
});

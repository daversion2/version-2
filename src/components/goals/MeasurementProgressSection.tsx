import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { RatingSelectorRow } from './RatingSelectorRow';
import {
  Goal,
  MeasurementProgress,
  MeasurementConfigDoneByDate,
  MeasurementConfigReachNumber,
  MeasurementConfigHitTotal,
  MeasurementConfigRateSelf,
} from '../../types';

interface MeasurementProgressSectionProps {
  goal: Goal;
  progress: MeasurementProgress;
  onLogProgress: () => void;
  onQuickIncrement: () => void;
  onRateSelfSubmit: (value: number, note?: string) => void;
  trackingHabitName?: string | null;
  readOnly?: boolean;
}

const getTodayDayName = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

export const MeasurementProgressSection: React.FC<MeasurementProgressSectionProps> = ({
  goal,
  progress,
  onLogProgress,
  onQuickIncrement,
  onRateSelfSubmit,
  trackingHabitName,
  readOnly = false,
}) => {
  const type = goal.measurement_type;
  if (!type) return null;

  if (type === 'done_by_date') {
    return <DoneByDateCard goal={goal} progress={progress} />;
  }
  if (type === 'reach_number') {
    return (
      <ReachNumberCard
        goal={goal}
        progress={progress}
        onLogProgress={onLogProgress}
        readOnly={readOnly}
      />
    );
  }
  if (type === 'hit_total') {
    return (
      <HitTotalCard
        goal={goal}
        progress={progress}
        onQuickIncrement={onQuickIncrement}
        trackingHabitName={trackingHabitName}
        readOnly={readOnly}
      />
    );
  }
  if (type === 'rate_yourself') {
    return (
      <RateSelfCard
        goal={goal}
        progress={progress}
        onRateSelfSubmit={onRateSelfSubmit}
        readOnly={readOnly}
      />
    );
  }
  return null;
};

// ── Done By Date ─────────────────────────────────────────────────────────────

const DoneByDateCard: React.FC<{
  goal: Goal;
  progress: MeasurementProgress;
}> = ({ goal, progress }) => {
  const config = goal.measurement_config as MeasurementConfigDoneByDate | undefined;
  const targetDate = config?.target_date || goal.end_date;
  const days = progress.days_remaining ?? 0;
  const overdue = days < 0;

  const color = overdue
    ? Colors.secondary
    : days <= 3
    ? Colors.secondary
    : days <= 7
    ? '#E8A317'
    : Colors.primary;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerLabel}>Target Deadline</Text>
      </View>
      <View style={styles.countdownContainer}>
        <Text style={[styles.countdownNumber, { color }]}>
          {overdue ? Math.abs(days) : days}
        </Text>
        <Text style={[styles.countdownLabel, { color }]}>
          {overdue ? 'days overdue' : days === 1 ? 'day remaining' : 'days remaining'}
        </Text>
      </View>
      <View style={styles.targetDateBadge}>
        <Text style={styles.targetDateText}>
          Target: {formatDateShort(targetDate)}
        </Text>
      </View>
      <ProgressBar percentage={progress.percentage} color={color} />
    </Card>
  );
};

// ── Reach Number ─────────────────────────────────────────────────────────────

const ReachNumberCard: React.FC<{
  goal: Goal;
  progress: MeasurementProgress;
  onLogProgress: () => void;
  readOnly: boolean;
}> = ({ goal, progress, onLogProgress, readOnly }) => {
  const config = goal.measurement_config as MeasurementConfigReachNumber | undefined;
  const metricName = config?.metric_name || progress.metric_name || '';
  const direction = config?.direction ?? 'up';
  const startVal = progress.starting_value ?? 0;
  const targetVal = progress.target_value ?? 0;
  const currentVal = progress.current_value;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="trending-up-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerLabel}>
          {metricName || 'Progress'}
        </Text>
      </View>
      <Text style={styles.valuesText}>
        <Text style={styles.currentValue}>{formatNumber(currentVal)}</Text>
        <Text style={styles.targetValue}> / {formatNumber(targetVal)} {metricName}</Text>
      </Text>
      <ProgressBar percentage={progress.percentage} />
      <Text style={styles.percentText}>{progress.percentage}%</Text>
      {progress.total_entries > 0 && (
        <Text style={styles.entriesText}>
          {progress.total_entries} log{progress.total_entries !== 1 ? 's' : ''} recorded
          {direction === 'down' ? ' (tracking down)' : ''}
        </Text>
      )}
      {!readOnly && (
        <Button
          title="Log progress"
          variant="outline"
          onPress={onLogProgress}
          style={styles.actionButton}
        />
      )}
    </Card>
  );
};

// ── Hit Total ────────────────────────────────────────────────────────────────

const HitTotalCard: React.FC<{
  goal: Goal;
  progress: MeasurementProgress;
  onQuickIncrement: () => void;
  trackingHabitName?: string | null;
  readOnly: boolean;
}> = ({ goal, progress, onQuickIncrement, trackingHabitName, readOnly }) => {
  const config = goal.measurement_config as MeasurementConfigHitTotal | undefined;
  const targetCount = config?.target_count ?? progress.target_value ?? 0;
  const currentVal = progress.current_value;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="checkmark-done-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerLabel}>Total Count</Text>
      </View>
      <Text style={styles.valuesText}>
        <Text style={styles.currentValue}>{currentVal}</Text>
        <Text style={styles.targetValue}> of {targetCount}</Text>
      </Text>
      <ProgressBar percentage={progress.percentage} />
      <Text style={styles.percentText}>{progress.percentage}%</Text>
      {trackingHabitName && (
        <View style={styles.linkedHabitRow}>
          <Ionicons name="link-outline" size={14} color={Colors.gray} />
          <Text style={styles.linkedHabitText}>
            Auto-counts from: {trackingHabitName}
          </Text>
        </View>
      )}
      {!readOnly && (
        <TouchableOpacity style={styles.incrementButton} onPress={onQuickIncrement}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.incrementText}>+1</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

// ── Rate Yourself ────────────────────────────────────────────────────────────

const RateSelfCard: React.FC<{
  goal: Goal;
  progress: MeasurementProgress;
  onRateSelfSubmit: (value: number, note?: string) => void;
  readOnly: boolean;
}> = ({ goal, progress, onRateSelfSubmit, readOnly }) => {
  const config = goal.measurement_config as MeasurementConfigRateSelf | undefined;
  const scaleMax = config?.scale_max ?? 10;
  const checkInFrequency = config?.check_in_frequency ?? 'weekly';
  const checkInDay = config?.check_in_day;
  const reflectionQuestion = config?.reflection_question;
  const isCheckInDay = checkInFrequency === 'daily' || checkInDay === getTodayDayName();
  const trend = progress.trend ?? [];

  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (ratingValue === null) return;
    onRateSelfSubmit(ratingValue, noteValue.trim() || undefined);
    setSubmitted(true);
  };

  // Check-in day mode — show the prominent check-in card
  if (isCheckInDay && !readOnly && !submitted) {
    return (
      <Card style={{ ...styles.card, ...styles.checkInCard }}>
        <View style={styles.headerRow}>
          <Ionicons name="star-outline" size={18} color={Colors.primary} />
          <Text style={styles.headerLabel}>Check-in Day</Text>
        </View>
        {reflectionQuestion && (
          <Text style={styles.reflectionQuestion}>{reflectionQuestion}</Text>
        )}
        <Text style={styles.ratingPrompt}>
          Rate yourself (1–{scaleMax}):
        </Text>
        <RatingSelectorRow
          max={scaleMax as 5 | 10}
          value={ratingValue}
          onChange={setRatingValue}
        />
        <TextInput
          style={styles.noteInput}
          value={noteValue}
          onChangeText={setNoteValue}
          placeholder="Add a note (optional)"
          placeholderTextColor={Colors.gray}
          multiline
        />
        <Button
          title="Submit check-in"
          onPress={handleSubmit}
          style={styles.actionButton}
        />
      </Card>
    );
  }

  // Normal display mode — show latest rating + sparkline
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="star-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerLabel}>Self-Rating</Text>
      </View>
      {progress.total_entries > 0 ? (
        <>
          <Text style={styles.valuesText}>
            <Text style={styles.currentValue}>{progress.current_value}</Text>
            <Text style={styles.targetValue}> / {scaleMax}</Text>
          </Text>
          {trend.length > 1 && (
            <View style={styles.sparklineContainer}>
              <Text style={styles.sparklineLabel}>Recent trend</Text>
              <Sparkline values={trend} max={scaleMax} />
            </View>
          )}
          <Text style={styles.entriesText}>
            {progress.total_entries} check-in{progress.total_entries !== 1 ? 's' : ''} recorded
          </Text>
        </>
      ) : (
        <Text style={styles.emptyText}>No check-ins yet</Text>
      )}
      <Text style={styles.checkInDayNote}>
        {checkInFrequency === 'daily'
          ? 'Check-in: Daily'
          : checkInDay
          ? `Check-in day: ${checkInDay.charAt(0).toUpperCase() + checkInDay.slice(1)}s`
          : null}
      </Text>
    </Card>
  );
};

// ── Shared sub-components ────────────────────────────────────────────────────

const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({
  percentage,
  color = Colors.primary,
}) => (
  <View style={styles.progressBarBg}>
    <View
      style={[
        styles.progressBarFill,
        { width: `${Math.min(100, Math.max(0, percentage))}%`, backgroundColor: color },
      ]}
    />
  </View>
);

const Sparkline: React.FC<{ values: number[]; max: number }> = ({ values, max }) => {
  const height = 40;
  const barWidth = 100 / values.length;

  return (
    <View style={[styles.sparkline, { height }]}>
      {values.map((v, i) => {
        const barHeight = max > 0 ? (v / max) * height : 0;
        return (
          <View
            key={i}
            style={[
              styles.sparklineBar,
              {
                width: `${barWidth - 2}%`,
                height: barHeight,
                backgroundColor: Colors.primary + '80',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (n: number): string => {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(1);
};

const formatDateShort = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  // Done by date
  countdownContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countdownNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
    color: Colors.primary,
  },
  countdownLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  targetDateBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  targetDateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  // Values
  valuesText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  currentValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  targetValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  percentText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  entriesText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  // Progress bar
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  // Hit total
  linkedHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  linkedHabitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  incrementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  incrementText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  // Rate yourself
  checkInCard: {
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  reflectionQuestion: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  ratingPrompt: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  noteInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sparklineContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sparklineLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    width: '100%',
    justifyContent: 'center',
  },
  sparklineBar: {
    borderRadius: 2,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  checkInDayNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actionButton: {
    marginTop: Spacing.md,
  },
});

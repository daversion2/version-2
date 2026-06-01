import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {
  Goal,
  MeasurementProgress,
  MeasurementConfigDoneByDate,
  MeasurementConfigReachNumber,
} from '../../types';

interface MeasurementProgressSectionProps {
  goal: Goal;
  progress: MeasurementProgress;
  onLogProgress: () => void;
  readOnly?: boolean;
}

export const MeasurementProgressSection: React.FC<MeasurementProgressSectionProps> = ({
  goal,
  progress,
  onLogProgress,
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
  actionButton: {
    marginTop: Spacing.md,
  },
});

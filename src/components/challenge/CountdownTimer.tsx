import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  deadline: string; // ISO 8601
  variant?: 'compact' | 'full';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  overdue: boolean;
}

const calcTimeLeft = (deadline: string): TimeLeft => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    const absDiff = Math.abs(diff);
    return {
      days: Math.floor(absDiff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((absDiff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((absDiff / (1000 * 60)) % 60),
      seconds: Math.floor((absDiff / 1000) % 60),
      overdue: true,
    };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    overdue: false,
  };
};

const pad = (n: number) => String(n).padStart(2, '0');

export const CountdownTimer: React.FC<Props> = ({ deadline, variant = 'compact' }) => {
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calcTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const isCompact = variant === 'compact';
  const color = time.overdue ? Colors.secondary : Colors.primary;

  const formatCompact = () => {
    if (time.days > 0) return `${time.days}d ${time.hours}h`;
    if (time.hours > 0) return `${time.hours}h ${pad(time.minutes)}m`;
    return `${pad(time.minutes)}:${pad(time.seconds)}`;
  };

  if (isCompact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: color + '15' }]}>
        <Ionicons
          name={time.overdue ? 'alert-circle' : 'time-outline'}
          size={14}
          color={color}
        />
        <Text style={[styles.compactText, { color }]}>
          {time.overdue ? 'Overdue ' : ''}{formatCompact()}
        </Text>
      </View>
    );
  }

  // Full variant
  return (
    <View style={[styles.fullContainer, { borderColor: color }]}>
      <Text style={[styles.fullLabel, { color }]}>
        {time.overdue ? 'OVERDUE' : 'TIME REMAINING'}
      </Text>
      <View style={styles.segmentRow}>
        {time.days > 0 && (
          <View style={styles.segment}>
            <Text style={[styles.segmentValue, { color }]}>{time.days}</Text>
            <Text style={styles.segmentLabel}>days</Text>
          </View>
        )}
        <View style={styles.segment}>
          <Text style={[styles.segmentValue, { color }]}>{pad(time.hours)}</Text>
          <Text style={styles.segmentLabel}>hrs</Text>
        </View>
        <View style={styles.segment}>
          <Text style={[styles.segmentValue, { color }]}>{pad(time.minutes)}</Text>
          <Text style={styles.segmentLabel}>min</Text>
        </View>
        <View style={styles.segment}>
          <Text style={[styles.segmentValue, { color }]}>{pad(time.seconds)}</Text>
          <Text style={styles.segmentLabel}>sec</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact (home screen)
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
  },
  // Full (detail view)
  fullContainer: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  fullLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  segment: {
    alignItems: 'center',
  },
  segmentValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
  },
  segmentLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

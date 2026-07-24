import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';
import { getCurrentDayNumber } from '../../../services/challenges';

// "Also today" — a conditional, self-collapsing band pinned above the practices.
// It surfaces the day's *other* actionable things (an active challenge check-in,
// the evening reflection) without pushing the core rep loop down the screen.
// It renders nothing when there's nothing to do, and each row disappears once
// that thing is addressed — so it never becomes permanent clutter.

const EVENING_HOUR = 17; // reflection only surfaces from 5pm local onward

interface Item {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const formatCountdown = (deadlineIso: string, now: number): string => {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return 'Due now';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / (60 * 24));
  if (days >= 1) return `${days}d left`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs >= 1) return `${hrs}h ${rem}m left`;
  return `${rem}m left`;
};

export const AlsoTodaySection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const [expanded, setExpanded] = useState(false);

  // Minute-resolution clock — only ticks when a deadline is actually present.
  const hasDeadline = data.activeChallenges.some((c) => !!c.deadline);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasDeadline) return;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [hasDeadline]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    // Active single-day challenges — actionable until completed.
    for (const c of data.activeChallenges) {
      if (c.status !== 'active') continue;
      const countdown = c.deadline ? formatCountdown(c.deadline, now) : null;
      out.push({
        key: `daily-${c.id}`,
        icon: 'flash-outline',
        title: c.name,
        subtitle: countdown ? `Challenge · ${countdown}` : 'Active challenge',
        onPress: () => callbacks.onNavigate('CompleteChallenge', { challenge: c }),
      });
    }

    // Active multi-day challenges — only when today's check-in isn't done yet.
    for (const c of data.extendedChallenges) {
      if (c.status !== 'active' || !c.start_date || !c.milestones?.length) continue;
      const total = c.milestones.length;
      const currentDay = getCurrentDayNumber(c.start_date);
      if (currentDay < 1 || currentDay > total) continue;
      const today = c.milestones.find((m) => m.day_number === currentDay);
      if (today?.completed) continue; // already checked in today
      out.push({
        key: `ext-${c.id}`,
        icon: 'flag-outline',
        title: c.name,
        subtitle: `Day ${currentDay} of ${total} · Check in`,
        onPress: () => callbacks.onNavigate('ExtendedChallengeProgress', { challenge: c }),
      });
    }

    // Evening reflection — only after 5pm local and not yet reflected today.
    const isEvening = new Date().getHours() >= EVENING_HOUR;
    if (isEvening && !data.reflectedToday) {
      out.push({
        key: 'reflection',
        icon: 'moon-outline',
        title: 'Reflect on today',
        subtitle: 'Evening wind-down',
        onPress: () => callbacks.onNavigate('NightlyReflection'),
      });
    }

    return out;
  }, [data.activeChallenges, data.extendedChallenges, data.reflectedToday, now, callbacks]);

  // Nothing to do → the section doesn't exist (no empty collapsible sitting there).
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Also today, ${items.length} item${items.length === 1 ? '' : 's'}`}
      >
        <Ionicons name="today-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerLabel}>Also today</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <View style={styles.spacer} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.row}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={16} color={Colors.primary} />
              </View>
              <View style={styles.spacer}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  headerLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginLeft: Spacing.sm,
  },
  countPill: {
    marginLeft: Spacing.sm,
    minWidth: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  spacer: { flex: 1 },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rowTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  rowSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
});

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { HomeSectionProps } from './types';
import { PracticeInstance } from '../../../types';
import { PracticeCard } from '../../../components/practices/PracticeCard';
import { WeeklyGoalSheet } from '../../../components/practices/WeeklyGoalSheet';
import { FeatureInfoModal } from '../../../components/common/FeatureInfoModal';
import {
  getPractice,
  getPracticeColor,
  getPracticeIntensity,
  getIntensityTier,
  compareByIntensity,
} from '../../../data/practices';

/**
 * "Your Practices" — the home redesign's centerpiece. Every adopted practice is
 * shown as a card, ordered gentle → extreme (by intensity tier). Each card shows
 * the why-it-works hook, weekly progress, a tappable weekly-goal chip, and a
 * Start / Done-today action. Practices are owned by default (no "add" step here).
 */
export const PracticesSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const { habits, weeklyCounts, completedTodayIds, startingPracticeId } = data;

  const [editingHabit, setEditingHabit] = useState<PracticeInstance | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // The onboarding starting-point practice leads; the rest run gentle → extreme.
  const ordered = useMemo(
    () =>
      [...habits].sort((a, b) => {
        const aStarting = startingPracticeId && a.practice_id === startingPracticeId ? 0 : 1;
        const bStarting = startingPracticeId && b.practice_id === startingPracticeId ? 0 : 1;
        return aStarting - bStarting || compareByIntensity(a, b);
      }),
    [habits, startingPracticeId]
  );

  const doneTodaySet = useMemo(() => new Set(completedTodayIds), [completedTodayIds]);

  if (ordered.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="flame-outline" size={40} color={Colors.primary} />
        <Text style={styles.emptyTitle}>Your practices live here</Text>
        <Text style={styles.emptyText}>
          Your daily training is being set up — start and track each rep right here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your practices</Text>
        <TouchableOpacity
          onPress={() => setShowInfo(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      <FeatureInfoModal
        visible={showInfo}
        onDismiss={() => setShowInfo(false)}
        icon="leaf"
        accent={Colors.primary}
        title="Practices"
        intro="One deliberately uncomfortable thing, chosen and done on purpose each day — then reflected on. This isn't a habit you're trying to automate. It's a decision you make while it's hard."
        points={[
          {
            label: 'Choose the discomfort.',
            text: 'Commit to a practice before the resistance arrives. It should cost you something real — effort, comfort, minutes you’d rather spend elsewhere — without swallowing your day.',
          },
          {
            label: 'Stay past the pull to stop.',
            text: 'The moment you want to quit is the moment that counts. Everything before it is warm-up; staying is the training.',
          },
          {
            label: 'Reflect on what it took.',
            text: 'Rate how hard it actually was and name the difficult part. That’s what turns a finished task into something your brain can use again.',
          },
        ]}
        science={[
          {
            label: 'Resistance is the stimulus.',
            text: 'Deliberately staying in something your brain wants to escape recruits the prefrontal cortex — the same circuitry behind focus, decisions, and self-control. Comfortable repetition doesn’t load it. Difficulty does.',
          },
          {
            label: 'Reflection is what consolidates it.',
            text: 'Rating the difficulty and naming the hard moment converts raw sensation into something the brain encodes explicitly. Effort you examine transfers to new situations; effort you don’t mostly stays stuck to the task.',
          },
          {
            label: 'Deliberate on purpose.',
            text: 'A habit runs without you — that’s its value and its ceiling. Practices stay conscious by design, because the act of choosing the hard thing is the capacity being trained.',
          },
        ]}
        footer="The goal isn’t to make it easy. It’s to become someone who does it while it’s hard."
      />

      {ordered.map((habit) => {
        const practice = getPractice(habit.practice_id);
        const tier = getIntensityTier(getPracticeIntensity(habit))!;
        const isStartingPoint =
          !!startingPracticeId && habit.practice_id === startingPracticeId;
        return (
          <View key={habit.id}>
            {isStartingPoint && (
              <View style={styles.startingPointBadge}>
                <Ionicons name="flag" size={12} color={Colors.secondary} />
                <Text style={styles.startingPointText}>Your starting point</Text>
              </View>
            )}
            <PracticeCard
              habit={habit}
              color={getPracticeColor(habit)}
              tier={tier}
              icon={practice?.icon || 'ellipse-outline'}
              why={practice?.whyItWorks || ''}
              weeklyDone={weeklyCounts[habit.id] || 0}
              doneToday={doneTodaySet.has(habit.id)}
              onPress={() => callbacks.onHabitTap(habit)}
              onEditGoal={() => setEditingHabit(habit)}
              onOpenPlan={() =>
                callbacks.onNavigate('HabitActionPlan', {
                  habitId: habit.id,
                  prefilled: habit.action_plan,
                  supportsPairing: !!habit.supports_pairing,
                  reminder: habit.reminder,
                })
              }
            />
          </View>
        );
      })}

      <WeeklyGoalSheet
        visible={!!editingHabit}
        practiceName={editingHabit?.name || ''}
        initialTarget={editingHabit?.target_count_per_week || 3}
        onSave={(target) => {
          if (editingHabit) callbacks.onSetWeeklyGoal?.(editingHabit.id, target);
        }}
        onClose={() => setEditingHabit(null)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },

  startingPointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  startingPointText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  empty: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

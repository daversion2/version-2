import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PracticeInstance } from '../../types';
import { IntensityTierDef } from '../../data/practices';

const FLAME_COLOR = '#FF7A1A';
const MAX_DOTS = 7; // weekly targets are 1–7

interface PracticeCardProps {
  habit: PracticeInstance;
  /** Banner accent color (resolved from the catalog). */
  color: string;
  /** Intensity tier (label + flame count). */
  tier: IntensityTierDef;
  /** Ionicons name for the practice. */
  icon: string;
  /** Short "why it works" hook. */
  why: string;
  /** Completions logged this week. */
  weeklyDone: number;
  /** Whether this practice was already logged today. */
  doneToday: boolean;
  /** Primary action — start / log the practice. */
  onPress: () => void;
  /** Open the weekly-goal sheet. */
  onEditGoal: () => void;
}

/**
 * The home "Your Practices" card: a colored banner (per-practice), a 1–3 flame
 * intensity meter, the why-it-works hook, weekly progress dots, an editable
 * weekly-goal chip, and a Start / Done-today action. See the home redesign.
 */
export const PracticeCard: React.FC<PracticeCardProps> = React.memo(
  ({ habit, color, tier, icon, why, weeklyDone, doneToday, onPress, onEditGoal }) => {
    // A weekly target of 0 (or missing) means the user hasn't set a goal yet —
    // the card invites them to instead of assuming a default.
    const hasGoal = (habit.target_count_per_week || 0) >= 1;
    const target = Math.min(habit.target_count_per_week || 0, MAX_DOTS);
    const filled = Math.min(weeklyDone, target);

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, doneToday && styles.cardDone, pressed && styles.cardPressed]}
      >
        {/* Banner — colored by the practice */}
        <View style={[styles.banner, { backgroundColor: color }]}>
          <View style={styles.meter}>
            <View style={styles.flames}>
              {[0, 1, 2].map((i) => (
                <Ionicons
                  key={i}
                  name="flame"
                  size={13}
                  color={i < tier.flames ? FLAME_COLOR : 'rgba(255,255,255,0.4)'}
                />
              ))}
            </View>
            <Text style={styles.meterLabel}>{tier.label}</Text>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>

          <Ionicons name={icon as any} size={50} color="rgba(255,255,255,0.30)" style={styles.bigIcon} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          {!!why && (
            <Text style={styles.why} numberOfLines={2}>
              {why}
            </Text>
          )}

          <View style={styles.foot}>
            {hasGoal ? (
              <View style={styles.progress}>
                <View style={styles.dots}>
                  {Array.from({ length: target }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i < filled && { backgroundColor: color, borderColor: color }]}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.goalChip} onPress={onEditGoal} hitSlop={8}>
                  <Ionicons name="repeat-outline" size={13} color={Colors.gray} />
                  <Text style={styles.goalText}>
                    <Text style={[styles.goalDone, { color }]}>{weeklyDone}</Text>
                    {` of ${target}`}
                  </Text>
                  <Text style={styles.goalUnit}> / week</Text>
                  <Ionicons name="chevron-down" size={13} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.setGoal, { borderColor: color }]}
                onPress={onEditGoal}
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={16} color={color} />
                <Text style={[styles.setGoalText, { color }]}>Set a goal</Text>
              </TouchableOpacity>
            )}

            {doneToday ? (
              <View style={styles.donePill}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.doneText}>Done today</Text>
              </View>
            ) : (
              <View style={[styles.startBtn, { backgroundColor: Colors.primary }]}>
                <Ionicons name="play" size={14} color={Colors.white} />
                <Text style={styles.startText}>Start</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg + 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  cardDone: { opacity: 0.72 },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  banner: {
    height: 96,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    justifyContent: 'space-between',
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingVertical: 4,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: BorderRadius.full,
  },
  flames: { flexDirection: 'row', gap: 1 },
  meterLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.white,
  },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg + 1, color: Colors.white },
  bigIcon: { position: 'absolute', right: 10, bottom: 6 },

  body: { padding: Spacing.md },
  why: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm - 1, color: Colors.gray, lineHeight: 19 },

  foot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.md - 2,
  },
  progress: { gap: 6 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.lightGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  goalText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  goalDone: { fontFamily: Fonts.secondaryBold },
  goalUnit: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  setGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  setGoalText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success + '1F',
  },
  doneText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.success },
});

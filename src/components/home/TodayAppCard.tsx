import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  name: string;
  /** Ionicons name, from the mini-app manifest. */
  icon: string;
  color: string;
  /** "1 of 3 this week", "Done today · 2 of 3". */
  goalLine: string;
  /** Behind on the week: the goal line in the attention colour. */
  goalAlert?: boolean;
  /** "Last: Tue · 48 min", or a nudge to start when there's no history. */
  lastLine: string;
  /** "Start" for Workouts / Meditate, "Open" for Meals. */
  cta: string;
  onOpen: () => void;
}

/**
 * An app on Today — always there, the head of its section. The apps are the
 * main thing and habits support underneath (services/appCheckins.ts), so the
 * card is larger than a habit row and the whole of it opens the app.
 */
export const TodayAppCard: React.FC<Props> = ({ name, icon, color, goalLine, goalAlert, lastLine, cta, onOpen }) => (
  <Pressable
    onPress={onOpen}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel={`${name}. ${goalLine}. ${lastLine}`}
    accessibilityHint={`Opens ${name}.`}
  >
    <View style={styles.head}>
      <View style={[styles.tile, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={22} color={Colors.white} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.goal, goalAlert && styles.goalAlert]}>{goalLine}</Text>
      </View>
      {/* The brand's action colour, like the guidelines' "Start today" button. */}
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{cta}</Text>
      </View>
    </View>
    <Text style={styles.last} numberOfLines={1}>
      {lastLine}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.md - 2,
    gap: Spacing.sm + 2,
  },
  pressed: { backgroundColor: Colors.lightGray },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md - 4 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  goal: { fontFamily: Fonts.secondaryBold, fontSize: 13, color: Colors.gray },
  goalAlert: { color: Colors.secondary },
  cta: {
    backgroundColor: Colors.secondary,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
  last: {
    fontFamily: Fonts.secondary,
    fontSize: 13,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
});

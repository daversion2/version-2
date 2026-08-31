import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Practice, PRACTICE_GROUPS } from '../../data/practices';
import { MindPattern, buildMindPatternText } from '../../services/mindPatterns';

interface Props {
  practice: Practice;
  /** Dominant mind tag from recent reps of this practice — renders the "Your pattern" block. */
  mindPattern?: MindPattern | null;
  /** Proceed to the "Go" beat (start the timer, or hand off the phone). */
  onBegin: () => void;
  /** Open the full learn content (how-to / science / tips). Hidden if omitted. */
  onLearn?: () => void;
}

/** One briefing block — an icon, an uppercase label, and a line of copy. */
const ReadyBlock: React.FC<{ icon: string; label: string; text: string; accent: string }> = ({
  icon,
  label,
  text,
  accent,
}) => (
  <View style={styles.block}>
    <View style={styles.blockHeader}>
      <Ionicons name={icon as any} size={16} color={accent} />
      <Text style={[styles.blockLabel, { color: accent }]}>{label}</Text>
    </View>
    <Text style={styles.blockText}>{text}</Text>
  </View>
);

/**
 * The "Ready" beat — a ~15-second briefing before a practice rep, in narrative
 * order: the task (what you'll do) → the urge that will rise against you (the
 * override) → the user's own recent mind pattern, when one has emerged → the
 * one anchor to hold when it does (focus). Then hands off to the Go beat.
 * Driven by the practice's `ready` content; renders nothing if absent.
 */
export const PracticeReady: React.FC<Props> = ({ practice, mindPattern, onBegin, onLearn }) => {
  const accent = PRACTICE_GROUPS.find((g) => g.id === practice.group)?.color ?? Colors.primary;
  const ready = practice.ready;
  if (!ready) return null;

  /**
   * Always "Log it" — never the catalog's `handoffCta` ("Begin", "Put your
   * phone down").
   *
   * This screen is now briefing CONTENT rather than the front of a guided
   * session: it explains the habit and offers Learn more, and its button drops
   * straight into the same single-screen capture the row's tick opens. A
   * "Begin" here would promise a stepped run that no longer follows, and would
   * make reading about a habit feel like committing to doing it right now.
   */
  const ctaLabel = 'Log it';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name={practice.icon as any} size={28} color={accent} />
          </View>
          <Text style={styles.name}>{practice.name}</Text>
          <Text style={styles.subhead}>Before you begin</Text>
        </View>

        {ready.whatYouDo && (
          <ReadyBlock icon="list-outline" label="What you'll do" text={ready.whatYouDo} accent={accent} />
        )}
        {ready.override && (
          <ReadyBlock icon="flame-outline" label="The override" text={ready.override} accent={accent} />
        )}
        {mindPattern && (
          <ReadyBlock
            icon="eye-outline"
            label="Your pattern"
            text={buildMindPatternText(mindPattern)}
            accent={accent}
          />
        )}
        <ReadyBlock icon="locate-outline" label="Focus on" text={ready.focus} accent={accent} />
      </ScrollView>

      {/* Handoff */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: accent }]}
          onPress={onBegin}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
        {onLearn && (
          <TouchableOpacity style={styles.learnRow} onPress={onLearn} activeOpacity={0.7}>
            <Ionicons name="book-outline" size={16} color={accent} />
            <Text style={[styles.learnText, { color: accent }]}>Learn more</Text>
            <Ionicons name="chevron-forward" size={14} color={accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  subhead: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  block: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  blockLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 22 },
  footer: { padding: Spacing.lg, paddingTop: Spacing.sm },
  learnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  learnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  ctaText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

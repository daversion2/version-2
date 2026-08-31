import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { SKIP_REASON_GROUPS, getSkipReasonsByKind } from '../../data/skipReasons';
import { PendingSkipReview, SkipCandidate } from '../../services/skipLogic';
import { formatRelativeDay } from '../../utils/date';

interface Props {
  visible: boolean;
  review: PendingSkipReview | null;
  /** Answer one habit. Resolves before the sheet advances to the next. */
  onAnswer: (item: SkipCandidate, reasonId: string) => Promise<void> | void;
  /** "Not now" — closes out the whole week. */
  onDismiss: () => void;
  /** Every question answered. */
  onComplete: () => void;
}

const dayLabel = (dates: string[]): string => {
  if (dates.length === 0) return 'You didn’t log it at all that week.';
  return `You did it ${dates.map(formatRelativeDay).join(' and ')}.`;
};

/**
 * The weekly skip review: "what got in the way?", asked once per habit that
 * fell short of its weekly target.
 *
 * Design constraints, all deliberate:
 * - ONE TAP per habit. This lands on someone who already knows they fell short;
 *   anything longer is how a tracker gets deleted.
 * - The days they DID manage are shown, because the review runs up to a week
 *   after the fact and "forgot" is otherwise the honest answer to "I can't
 *   remember". Jogging memory is the difference between data and noise.
 * - Reasons are grouped into "It was me" / "It was the day" visibly. The split
 *   is the insight the product is built on, so naming it is part of the point.
 * - Dismiss is always available and always final for that week.
 */
export const SkipReviewSheet: React.FC<Props> = ({
  visible,
  review,
  onAnswer,
  onDismiss,
  onComplete,
}) => {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Reset when a new review arrives.
  React.useEffect(() => {
    if (visible) setIndex(0);
  }, [visible, review?.weekStart]);

  if (!review || review.items.length === 0) return null;

  const item = review.items[Math.min(index, review.items.length - 1)];
  const isLast = index >= review.items.length - 1;

  const handlePick = async (reasonId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onAnswer(item, reasonId);
      if (isLast) onComplete();
      else setIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <Text style={styles.eyebrow}>Last week</Text>
              <TouchableOpacity onPress={onDismiss} hitSlop={12}>
                <Text style={styles.dismiss}>Not now</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{item.habitName}</Text>
            <Text style={styles.subtitle}>
              You aimed for {item.target} and got {item.completed}. {dayLabel(item.doneDates)}
            </Text>

            <Text style={styles.question}>What got in the way?</Text>

            {SKIP_REASON_GROUPS.map((group) => (
              <View key={group.kind} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupDesc}>{group.description}</Text>
                <View style={styles.chipWrap}>
                  {getSkipReasonsByKind(group.kind).map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={styles.chip}
                      onPress={() => handlePick(reason.id)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={reason.icon as any} size={15} color={Colors.dark} />
                      <Text style={styles.chipText}>{reason.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <Text style={styles.progress}>
              {index + 1} of {review.items.length}
              {review.hiddenCount > 0 && ` · ${review.hiddenCount} more not shown`}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '88%',
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismiss: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  question: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  group: { marginTop: Spacing.md },
  groupLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  groupDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  progress: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { AppMessage } from '../../Tools/components/AppMessage';
import { OFFERED_TACTICS, TACTIC_HELPER } from '../../../data/overrideTactics';

interface TacticStepProps {
  selected: string[];
  onToggle: (id: string) => void;
  color: string;
  /** Headline — the shared prompt, or a warmer variant on the hardest reps. */
  prompt: string;
  /** Optional block rendered above the question — e.g. the playbook recall. */
  header?: React.ReactNode;
}

/**
 * "What helped you get started?" — the second reflection step, shown only after
 * a rep the user rated hard (see TACTIC_GATE_RESISTANCE).
 *
 * One list for every habit, straight from OFFERED_TACTICS. Chips only, no
 * free-text field: the writing already happened on the mind step immediately
 * before this one, and a second text box would read as a form. Multi-select,
 * because getting started is rarely one move.
 */
export const TacticStep: React.FC<TacticStepProps> = ({
  selected,
  onToggle,
  color,
  prompt,
  header,
}) => (
  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    {header}

    <AppMessage message={prompt} subtitle={TACTIC_HELPER} color={color} delay={400} />

    <Text style={styles.optionalBadge}>Optional — skip if nothing comes to mind</Text>

    {OFFERED_TACTICS.map((tactic) => {
      const active = selected.includes(tactic.id);
      return (
        <TouchableOpacity
          key={tactic.id}
          style={[styles.row, active && { borderColor: color, backgroundColor: color + '14' }]}
          onPress={() => onToggle(tactic.id)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`${tactic.label}. ${tactic.description}`}
        >
          <Ionicons
            name={tactic.icon as any}
            size={18}
            color={active ? color : Colors.gray}
            style={styles.rowIcon}
          />
          <View style={styles.textWrap}>
            <Text style={[styles.label, active && { color }]}>{tactic.label}</Text>
            <Text style={styles.description}>{tactic.description}</Text>
          </View>
          <View style={[styles.check, active && { borderColor: color, backgroundColor: color }]}>
            {active && <Ionicons name="checkmark" size={14} color={Colors.white} />}
          </View>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  optionalBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  rowIcon: { width: 22, textAlign: 'center' },
  textWrap: { flex: 1 },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 16,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

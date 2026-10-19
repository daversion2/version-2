import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { DayScore, NutrientCoverage, ScoredItem, describeGroups } from '../../../../../services/mealsMath';
import { NUTRIENTS, groupLabel } from '../../../../../data/mealGroups';
import type { NutrientId } from '../../../../../types/meals';
import { FAIL_COLOR, NUTRIENT_COLOR, PASS_COLOR, STATUS_TITLE, itemColor, itemGlyph, mls } from './mealsStyle';

/** "2 of 3 meals logged · the day can hold 1 miss". */
const statusLine = (score: DayScore): string => {
  const meals = score.items.filter((i) => i.kind === 'meal');
  const logged = meals.filter((i) => i.state !== 'pending').length;
  const missText =
    score.allowed === 0
      ? 'every meal has to pass'
      : `${score.fails} of ${score.allowed} ${score.allowed === 1 ? 'miss' : 'misses'} used`;
  if (score.status === 'pending') return `${logged} of ${meals.length} meals logged · ${missText}`;
  if (score.status === 'on') return score.fails > 0 ? `Goal met · ${missText}` : 'Goal met · every plate passed';
  if (score.fails > score.allowed) {
    // Said plainly, with the reason to keep going: every meal still counts on its own.
    return score.complete
      ? `${score.fails} ${score.fails === 1 ? 'miss' : 'misses'} — more than the day can hold`
      : 'More misses than the day can hold. Every meal still counts toward your week.';
  }
  return 'A food-group goal wasn’t met';
};

/**
 * Protein · Fiber · Healthy fats for one plate. With `showMissing`, the ones it
 * lacks are struck through, so the gap is as visible as what's there.
 */
export const NutrientTags: React.FC<{ have: NutrientId[]; showMissing?: boolean }> = ({ have, showMissing }) => {
  const shown = NUTRIENTS.filter((n) => showMissing || have.includes(n.id));
  if (shown.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {shown.map((n) => {
        const on = have.includes(n.id);
        const color = NUTRIENT_COLOR[n.id];
        return (
          <View key={n.id} style={[styles.tag, on ? { backgroundColor: color + '18' } : styles.tagOff]}>
            <Text style={[styles.tagText, on ? { color } : styles.tagTextOff]}>{n.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

/** "Protein 2/4" with a segment per plate — the day's coverage, on the status card. */
const CoverageRow: React.FC<{ coverage: NutrientCoverage[]; onTone: boolean }> = ({ coverage, onTone }) => {
  if (!coverage.length || coverage[0].of === 0) return null;
  return (
    <View style={styles.coverage}>
      {coverage.map((c) => {
        const label = NUTRIENTS.find((n) => n.id === c.nutrient)?.label ?? c.nutrient;
        const color = onTone ? Colors.white : NUTRIENT_COLOR[c.nutrient];
        return (
          <View
            key={c.nutrient}
            style={[styles.covCell, onTone ? styles.covCellOnTone : { backgroundColor: NUTRIENT_COLOR[c.nutrient] + '12' }]}
            accessibilityLabel={`${label}: ${c.have} of ${c.of} plates`}
          >
            <Text style={[styles.covLabel, { color }]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={[styles.covValue, { color }]}>
              {c.have}/{c.of}
            </Text>
            <View style={styles.segs}>
              {Array.from({ length: c.of }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.seg,
                    { backgroundColor: color + (i < c.have ? 'FF' : '40') },
                  ]}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

/** The day at a glance: on target, off target or in progress, plus the daily goals. */
export const DayStatusCard: React.FC<{ score: DayScore; dateLabel: string }> = ({ score, dateLabel }) => {
  const tone = score.status === 'on' ? PASS_COLOR : score.status === 'off' ? FAIL_COLOR : null;
  return (
    <View style={[styles.status, tone ? { backgroundColor: tone, borderColor: tone } : null]}>
      <View style={styles.statusTop}>
        <Text style={[styles.statusTitle, tone && styles.onTone]}>{STATUS_TITLE[score.status]}</Text>
        <Text style={[styles.statusDate, tone && styles.onTone]}>{dateLabel}</Text>
      </View>
      <Text style={[mls.muted, tone && styles.onTone]}>{statusLine(score)}</Text>
      {score.groupGoals.length > 0 && (
        <View style={styles.goalRow}>
          {score.groupGoals.map((g) => (
            <View
              key={g.goal.id}
              style={[styles.goalPill, tone && styles.goalPillOnTone, g.met && !tone && styles.goalPillMet]}
            >
              <Text style={[styles.goalPillText, (tone || g.met) && styles.onTone]}>
                {groupLabel(g.goal.group)} {Math.min(g.have, g.goal.count)}/{g.goal.count}
                {g.met ? ' ✓' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
      <CoverageRow coverage={score.nutrients} onTone={!!tone} />
    </View>
  );
};

/** One logged (or not yet logged) meal or extra. */
export const PlateRow: React.FC<{
  item: ScoredItem;
  onPress?: () => void;
  compact?: boolean;
}> = ({ item, onPress, compact }) => {
  const line =
    item.state === 'pending'
      ? 'Tap to log'
      : item.state === 'skipped'
        ? 'Didn’t eat — doesn’t count'
        : describeGroups(item.groups);
  const content = (
    <>
      <View
        style={[
          mls.dot,
          compact && styles.dotSmall,
          { backgroundColor: itemColor(item.state) },
          item.state === 'pending' && styles.dotPending,
        ]}
      >
        <Text style={[mls.dotText, compact && styles.dotTextSmall]}>{itemGlyph(item.state)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={compact ? styles.compactName : mls.title}>{item.name}</Text>
        <Text style={[mls.muted, item.state === 'pending' && mls.link]} numberOfLines={2}>
          {line}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={Colors.border} />}
    </>
  );
  const style = [compact ? styles.compactRow : mls.card, styles.row];
  return onPress ? (
    <TouchableOpacity style={style} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.name}: ${line}`}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={style}>{content}</View>
  );
};

const styles = StyleSheet.create({
  status: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    gap: 6,
  },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  statusDate: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray,
  },
  onTone: { color: Colors.white },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 2 },
  goalPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalPillMet: { backgroundColor: PASS_COLOR, borderColor: PASS_COLOR },
  goalPillOnTone: { backgroundColor: Colors.white + '2E', borderColor: Colors.white + '59' },
  goalPillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dotPending: { backgroundColor: Colors.lightGray, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border },
  compactRow: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dotSmall: { width: 22, height: 22, borderRadius: 11 },
  dotTextSmall: { fontSize: FontSizes.xs },
  compactName: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: 'transparent' },
  tagOff: { backgroundColor: Colors.white, borderColor: Colors.border },
  tagText: { fontFamily: Fonts.secondaryBold, fontSize: 11 },
  tagTextOff: { color: Colors.border, textDecorationLine: 'line-through' },
  coverage: { flexDirection: 'row', gap: 6, marginTop: 4 },
  covCell: { flex: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 7, gap: 3 },
  covCellOnTone: { backgroundColor: Colors.white + '26' },
  covLabel: { fontFamily: Fonts.secondaryBold, fontSize: 10.5 },
  covValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md },
  segs: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
});

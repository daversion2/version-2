import React from 'react';
import { View, Text, TouchableHighlight, StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { DayScore, NutrientCoverage, ScoredItem, describeGroups } from '../../../../../services/mealsMath';
import { NUTRIENTS, groupLabel } from '../../../../../data/mealGroups';
import type { NutrientId } from '../../../../../types/meals';
import { FAIL_COLOR, MEALS_ACCENT, NUTRIENT_COLOR, PASS_COLOR, STATUS_TITLE, scoreColor } from './mealsStyle';
import { useMeals } from '../MealsContext';

/**
 * "2 meals logged · target 70+" while the day is open; once it's decided,
 * "Averaged 74 · at or above your target of 70" (Maestro's Meals flows assert
 * that wording).
 */
const statusLine = (score: DayScore, threshold: number): string => {
  const n = score.scoredCount;
  if (score.status === 'pending') {
    return `${n === 0 ? 'Nothing' : n} ${n === 1 ? 'meal' : 'meals'} logged · target ${threshold}+`;
  }
  if (score.status === 'none') return 'Nothing logged · counts neither way';
  return score.status === 'on'
    ? `Averaged ${score.average} · at or above your target of ${threshold}`
    : `Averaged ${score.average} · below your target of ${threshold}`;
};

/** A small rounded tag: filled when it's there, a dashed outline when it isn't. */
const Tag: React.FC<{ label: string; color: string; on: boolean; accessibilityLabel?: string }> = ({
  label,
  color,
  on,
  accessibilityLabel,
}) => (
  <View style={[styles.tag, on ? { backgroundColor: color + '1A' } : styles.tagOff]} accessibilityLabel={accessibilityLabel}>
    <Text style={[styles.tagText, on ? { color } : styles.tagTextOff]}>{label}</Text>
  </View>
);

/**
 * Protein · Fiber · Healthy fats for one plate. With `showMissing`, the ones it
 * lacks show as dashed outlines, so the gap is as visible as what's there.
 */
export const NutrientTags: React.FC<{ have: NutrientId[]; showMissing?: boolean }> = ({ have, showMissing }) => {
  const shown = NUTRIENTS.filter((n) => showMissing || have.includes(n.id));
  if (shown.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {shown.map((n) => (
        <Tag key={n.id} label={n.label} color={NUTRIENT_COLOR[n.id]} on={have.includes(n.id)} />
      ))}
    </View>
  );
};

/** "Protein 2/4" per nutrient: how many of the day's plates had it. */
const CoverageTags: React.FC<{ coverage: NutrientCoverage[] }> = ({ coverage }) => {
  if (!coverage.length || coverage[0].of === 0) return null;
  return (
    <View style={styles.tagRow}>
      {coverage.map((c) => {
        const label = NUTRIENTS.find((n) => n.id === c.nutrient)?.label ?? c.nutrient;
        return (
          <Tag
            key={c.nutrient}
            label={`${label} ${c.have}/${c.of}`}
            color={NUTRIENT_COLOR[c.nutrient]}
            on={c.have > 0}
            accessibilityLabel={`${label}: ${c.have} of ${c.of} plates`}
          />
        );
      })}
    </View>
  );
};

const BADGE: Record<DayScore['status'], { bg: string; text: string }> = {
  pending: { bg: Colors.lightGray, text: Colors.label2 },
  none: { bg: Colors.lightGray, text: Colors.label2 },
  on: { bg: PASS_COLOR + '1F', text: PASS_COLOR },
  off: { bg: FAIL_COLOR + '1F', text: FAIL_COLOR },
};

/** The day at a glance: its score, on target / off target / in progress, and the daily goals. */
export const DayStatusCard: React.FC<{ score: DayScore; threshold: number }> = ({ score, threshold }) => {
  const badge = BADGE[score.status];
  return (
    <View style={styles.status} accessibilityLabel="So far today">
      <View style={styles.statusTop}>
        <Text style={styles.statusScore}>{score.average ?? '–'}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{STATUS_TITLE[score.status]}</Text>
        </View>
      </View>
      <Text style={styles.statusLine}>{statusLine(score, threshold)}</Text>
      {score.groupGoals.length > 0 && (
        <View style={styles.tagRow}>
          {score.groupGoals.map((g) => (
            <Tag
              key={g.goal.id}
              label={`${groupLabel(g.goal.group)} ${Math.min(g.have, g.goal.count)}/${g.goal.count}${g.met ? ' ✓' : ''}`}
              color={MEALS_ACCENT}
              on={g.met}
            />
          ))}
        </View>
      )}
      <CoverageTags coverage={score.nutrients} />
    </View>
  );
};

/** "12:40 PM". */
export const plateTime = (loggedAt: string): string =>
  new Date(loggedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** A plate's title: its name, or "Meal" when it has none. */
export const plateTitle = (name?: string): string => name || 'Meal';

/**
 * One plate, as a row in a grouped list (ListGroup passes `separator`): its
 * name, when it was logged and what was on it, and its score on the right.
 */
export const PlateRow: React.FC<{
  item: ScoredItem;
  onPress?: () => void;
  separator?: boolean;
}> = ({ item, onPress, separator }) => {
  // Removed foods are only archived, so the current list names every one ever logged.
  const custom = useMeals().prefs.custom_groups;
  const title = plateTitle(item.name);
  const line = `${plateTime(item.logged_at)} · ${describeGroups(item.groups, custom)}`;

  const content = (
    <View style={styles.row}>
      <View style={[styles.rowMain, separator && styles.separator]}>
        <View style={styles.rowText}>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.line} numberOfLines={2}>
            {line}
          </Text>
        </View>
        <Text style={[styles.score, { color: scoreColor(item.score) }]}>{item.score}</Text>
      </View>
    </View>
  );

  return onPress ? (
    <TouchableHighlight
      onPress={onPress}
      underlayColor={Colors.fill}
      accessibilityRole="button"
      // "Breakfast: 8:05 AM · Eggs · Fruit": Maestro's Meals flows select rows by this.
      accessibilityLabel={`${title}: ${line}`}
    >
      {content}
    </TouchableHighlight>
  ) : (
    content
  );
};

const styles = StyleSheet.create({
  status: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: Spacing.sm + 4,
  },
  statusTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statusScore: { fontFamily: TextStyles.largeTitle.fontFamily, fontSize: 48, lineHeight: 54, fontWeight: '700', color: Colors.dark },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  badgeText: { ...TextStyles.footnote, fontWeight: '600' },
  statusLine: { ...TextStyles.subhead, color: Colors.label2, marginTop: -6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tagOff: { borderStyle: 'dashed', borderColor: Colors.separator },
  tagText: { ...TextStyles.footnote, fontWeight: '600' },
  tagTextOff: { color: Colors.gray, fontWeight: '500' },
  row: { paddingLeft: Spacing.md },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingRight: Spacing.md,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  rowText: { flex: 1, gap: 1 },
  name: { ...TextStyles.body, color: Colors.dark },
  line: { ...TextStyles.footnote, color: Colors.gray },
  score: { ...TextStyles.headline, color: Colors.dark },
});

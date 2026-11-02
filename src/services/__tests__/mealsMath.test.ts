import {
  activeCustomGroups,
  addSlot,
  archiveCustomGroup,
  describeGroups,
  moveSlot,
  newCustomGroup,
  updateCustomGroup,
  canReopen,
  clampOnTargetThreshold,
  closeDay,
  closeHandsOff,
  handoffDate,
  pickerFoods,
  emptyDay,
  pastWeeks,
  daysOnTarget,
  nutrientCoverage,
  plateNutrients,
  removeSlot,
  reopenDay,
  rulesForDay,
  scoreDay,
  scorePlate,
  scoreVerdict,
  summarizeWeek,
  dailyGoalOnDay,
  describeGroupGoal,
  newGroupGoal,
  weekDates,
  withExtra,
  withMeal,
  withoutExtra,
} from '../mealsMath';
import { DEFAULT_MEALS_SCORING } from '../../data/mealGroups';
import type { CustomFoodGroup, FoodGroupId, GroupGoal, MealsDay, MealsRules } from '../../types/meals';

const SLOTS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
];

const weights = DEFAULT_MEALS_SCORING; // ratio_points 70, nutrient_bonus 5, processed_penalty 30, strict_penalty 10, on_target_threshold 70

const rules = (over: Partial<MealsRules> = {}): MealsRules => ({
  slots: SLOTS,
  strict: false,
  group_goals: [],
  scoring: weights,
  ...over,
});

const at = '2026-10-15T12:00:00.000Z';
const plate = (...groups: FoodGroupId[]) => ({ groups, logged_at: at });
const skipped = { skipped: true as const, logged_at: at };
const extra = (id: string, ...groups: FoodGroupId[]) => ({ id, groups, logged_at: at });

const day = (date: string, meals: MealsDay['meals'], extras: MealsDay['extras'] = []): MealsDay => ({
  date,
  meals,
  extras,
});

describe('scorePlate', () => {
  it('is dominated by the whole-food ratio', () => {
    expect(scorePlate(['eggs', 'fruit'], false, weights)).toBe(80); // ratio 1.0 (70) + protein+fiber (10)
    expect(scorePlate(['chicken', 'veggies', 'grains', 'semi'], false, weights)).toBe(63); // ratio 0.75 (52.5) + protein+fiber (10)
  });

  it('adds a bonus per nutrient tag the plate hits, equally weighted, up to three', () => {
    expect(scorePlate(['grains'], false, weights)).toBe(75); // ratio 70 + fiber only (5)
    expect(scorePlate(['fish'], false, weights)).toBe(80); // ratio 70 + protein+fats (10)
  });

  it('costs Processed a flat penalty on top of the ratio dilution it already causes', () => {
    expect(scorePlate(['processed'], false, weights)).toBe(0); // 0 ratio, 0 nutrients, -30, clamped
    expect(scorePlate(['processed', 'veggies'], false, weights)).toBe(10); // ratio 0.5 (35) + fiber (5) - 30
  });

  it('strict mode costs dairy/semi/supplements extra — processed is unaffected, it already has its own penalty', () => {
    expect(scorePlate(['chicken', 'veggies', 'semi'], false, weights)).toBe(57);
    expect(scorePlate(['chicken', 'veggies', 'semi'], true, weights)).toBe(47); // 57 - strict_penalty (10)
    expect(scorePlate(['processed', 'veggies'], true, weights)).toBe(10); // unchanged: 'processed' isn't semi-tier
  });

  it('is null for an empty plate', () => {
    expect(scorePlate([], false, weights)).toBeNull();
    expect(scorePlate(undefined, false, weights)).toBeNull();
  });

  it('never goes below 0', () => {
    expect(scorePlate(['semi'], true, weights)).toBe(0); // 0 ratio + nothing - strict_penalty (10), clamped
  });

  it('never goes above 100, even with custom weights pushing the raw total over', () => {
    const big = { ...weights, ratio_points: 100, nutrient_bonus: 10 };
    expect(scorePlate(['fish'], false, big)).toBe(100); // 100 ratio + 20 (protein+fats) would be 120
  });
});

describe('scoreVerdict', () => {
  it('names the penalty that applied', () => {
    expect(scoreVerdict(['processed', 'veggies'], false, weights)).toEqual({
      score: 10,
      why: 'Processed on the plate (−30)',
    });
    expect(scoreVerdict(['eggs', 'semi'], true, weights).why).toBe('strict mode (−10)');
  });

  it('describes a clean plate', () => {
    expect(scoreVerdict(['eggs', 'fruit'], false, weights).why).toBe('All whole food.');
    expect(scoreVerdict(['eggs', 'semi'], false, weights).why).toBe('Real food, with a little semi-processed.');
  });

  it('an empty plate has no score yet', () => {
    expect(scoreVerdict([], false, weights)).toEqual({ score: null, why: 'Tap what was on the plate.' });
  });
});

describe('scoreDay — averaging plates into a day score', () => {
  it('a clean whole-food day averages its three plates', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }), rules());
    // 75, 80, 75 → 76.67 → 77
    expect(s.average).toBe(77);
    expect(s.scoredCount).toBe(3);
    expect(s.status).toBe('on');
  });

  it('a shake-only lunch counts as a meal without sinking the day', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs'), lunch: plate('supplements'), dinner: plate('beef') }), rules());
    // 75, 70, 75 → 73.33 → 73 — would have been 52 (and off) when a lone shake scored 5
    expect(s.average).toBe(73);
    expect(s.scoredCount).toBe(3);
    expect(s.status).toBe('on');
  });

  it('a Processed extra pulls the average down — it counts the same as a meal', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }, [extra('x', 'processed')]),
      rules()
    );
    // 75, 80, 75, 0 → 57.5 → 58, under the default threshold of 70
    expect(s.average).toBe(58);
    expect(s.status).toBe('off');
  });

  it('a whole-food extra adds to the average without changing the outcome', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }, [extra('x', 'fruit')]),
      rules()
    );
    // 75, 80, 75, 75 → 76.25 → 76
    expect(s.average).toBe(76);
    expect(s.scoredCount).toBe(4);
    expect(s.status).toBe('on');
  });

  it('a skipped meal never counts against the average: it just isn’t one of the plates', () => {
    const s = scoreDay(day('d', { breakfast: skipped, lunch: plate('fish'), dinner: plate('beef') }), rules());
    // 80, 75 → 77.5 → 78
    expect(s.average).toBe(78);
    expect(s.status).toBe('on');
    expect(s.items.find((i) => i.key === 'breakfast')?.state).toBe('skipped');
  });

  it('the on-target threshold is a settings knob, read from scoring.on_target_threshold', () => {
    const d = day('d', { breakfast: plate('eggs'), lunch: plate('processed'), dinner: plate('beef') });
    // 75, 0, 75 → 50 exactly
    expect(scoreDay(d, rules()).status).toBe('off');
    expect(scoreDay(d, rules({ scoring: { ...weights, on_target_threshold: 50 } })).status).toBe('on');
  });

  it('ignores entries for a meal that was since removed from the settings', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef'), snack: plate('processed') }),
      rules()
    );
    expect(s.items).toHaveLength(3);
    expect(s.status).toBe('on');
  });
});

describe('scoreDay — in progress', () => {
  it('stays pending while a meal is unlogged', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs') }), rules());
    expect(s.status).toBe('pending');
    expect(s.pending).toBe(2);
    expect(s.complete).toBe(false);
    expect(s.average).toBe(75);
  });

  it('stays pending even when what’s logged so far is already too low to recover from — no early verdict', () => {
    const s = scoreDay(day('d', { breakfast: plate('processed') }), rules());
    expect(s.status).toBe('pending');
    expect(s.complete).toBe(false);
    expect(s.average).toBe(0);
  });

  it('an untouched day is pending, with no average yet', () => {
    const s = scoreDay(undefined, rules());
    expect(s.status).toBe('pending');
    expect(s.average).toBeNull();
  });
});

describe('scoreDay — daily group goals are a readout, not a gate', () => {
  const veggies2: GroupGoal = { id: 'g', group: 'veggies', count: 2, period: 'day' };
  const fishWeekly: GroupGoal = { id: 'w', group: 'fish', count: 2, period: 'week' };

  it('an unmet daily goal no longer forces the day off once the average clears the threshold', () => {
    const r = rules({ group_goals: [veggies2] });
    const short = scoreDay(day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef') }), r);
    expect(short.groupGoals[0]).toMatchObject({ have: 1, met: false });
    expect(short.average).toBe(75);
    expect(short.status).toBe('on'); // would have been 'off' under the old pass-goal rule

    const met = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef', 'veggies') }),
      r
    );
    expect(met.groupGoals[0].met).toBe(true);
    expect(met.status).toBe('on');
  });

  it('a veggie snack counts toward the goal', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef') }, [extra('x', 'veggies')]),
      rules({ group_goals: [veggies2] })
    );
    expect(s.groupGoals[0].have).toBe(2);
  });

  it('weekly goals never show up as a daily readout', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('beef'), dinner: plate('beef') }),
      rules({ group_goals: [fishWeekly] })
    );
    expect(s.groupGoals).toHaveLength(0);
    expect(s.status).toBe('on');
  });

  it('an unfinished day stays pending regardless of any goal', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs') }), rules({ group_goals: [veggies2] }));
    expect(s.status).toBe('pending');
  });
});

describe('weekDates', () => {
  it('runs Monday to Sunday', () => {
    expect(weekDates('2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('puts a Sunday at the end of its week, not the start of the next', () => {
    expect(weekDates('2026-10-18')[0]).toBe('2026-10-12');
  });
});

describe('rulesForDay', () => {
  const current = rules({ scoring: { ...weights, on_target_threshold: 50 } });
  // Simulates a day saved before `scoring` existed on MealsRules.
  const oldRules = { slots: SLOTS, strict: false, group_goals: [] } as unknown as MealsRules;

  it('today always uses the current settings', () => {
    expect(rulesForDay('2026-10-15', '2026-10-15', { rules: oldRules }, current)).toBe(current);
  });

  it('a past day keeps the rules it was saved under, so editing settings never rescores it', () => {
    const lenient = rules({ scoring: { ...weights, on_target_threshold: 10 } });
    // Saved before custom foods existed: the current list (empty here) fills in.
    expect(rulesForDay('2026-10-14', '2026-10-15', { rules: lenient }, current)).toEqual({ ...lenient, custom_groups: [] });
    expect(rulesForDay('2026-10-14', '2026-10-15', undefined, current)).toBe(current);
  });

  it('backfills a missing scoring field on a day saved before it existed', () => {
    const r = rulesForDay('2026-10-14', '2026-10-15', { rules: oldRules }, current);
    expect(r.scoring).toEqual(DEFAULT_MEALS_SCORING);
    expect(r.slots).toBe(oldRules.slots); // the rest of the saved snapshot is preserved
  });

  it('a day keeps the custom foods it was saved with, even after one is changed', () => {
    const then: CustomFoodGroup[] = [{ id: 'custom_a', label: 'Carb supplement', score: 80, nutrients: ['carbs'] }];
    const now = rules({ custom_groups: updateCustomGroup(then, 'custom_a', { score: 40 }) });
    const r = rulesForDay('2026-10-14', '2026-10-15', { rules: rules({ custom_groups: then }) }, now);
    expect(r.custom_groups).toEqual(then);
  });

  it('a past day still knows a food added after it was saved — say, one logged on it later', () => {
    const later: CustomFoodGroup = { id: 'custom_b', label: 'Gel', score: 60, nutrients: [] };
    const r = rulesForDay('2026-10-14', '2026-10-15', { rules: rules() }, rules({ custom_groups: [later] }));
    expect(r.custom_groups).toEqual([later]);
  });

  it('backfills only the missing keys of a partially-present scoring object', () => {
    const partial = { ...oldRules, scoring: { on_target_threshold: 40 } } as unknown as MealsRules;
    const r = rulesForDay('2026-10-14', '2026-10-15', { rules: partial }, current);
    expect(r.scoring).toEqual({ ...DEFAULT_MEALS_SCORING, on_target_threshold: 40 });
  });
});

describe('summarizeWeek', () => {
  const today = '2026-10-15'; // a Thursday
  const days: Record<string, MealsDay> = {
    '2026-10-12': day('2026-10-12', { breakfast: plate('eggs'), lunch: plate('processed'), dinner: plate('fish') }),
    '2026-10-13': day('2026-10-13', { breakfast: plate('eggs'), lunch: plate('processed'), dinner: plate('fish') }),
    '2026-10-14': day('2026-10-14', { breakfast: skipped, lunch: plate('beef'), dinner: plate('processed') }, [
      extra('x', 'fruit'),
    ]),
    '2026-10-15': day('2026-10-15', { breakfast: plate('eggs') }),
  };

  it('averages every scored plate so far, meals and extras, skipping skipped meals and the days ahead', () => {
    const w = summarizeWeek(today, days, rules());
    // 75,0,80 + 75,0,80 + 75,0,75 + 75 = 535 over 10 plates
    expect(w.platesLogged).toBe(10);
    expect(w.averageScore).toBe(54);
    expect(w.days.filter((d) => d.future)).toHaveLength(3);
  });

  it('names the meal slipping furthest below target', () => {
    const w = summarizeWeek(today, days, rules());
    // Lunch: processed, processed, beef → 0, 0, 75 → averaging 25, well under the threshold of 70.
    expect(w.slipping).toMatchObject({ slotId: 'lunch', average: 25, logged: 3 });
  });

  it('reports no slipping meal in a clean week', () => {
    const clean = { '2026-10-15': day('2026-10-15', { breakfast: plate('eggs') }) };
    expect(summarizeWeek(today, clean, rules()).slipping).toBeNull();
  });

  it('counts weekly goals across the week so far', () => {
    const r = rules({ group_goals: [{ id: 'w', group: 'fish', count: 2, period: 'week' }] });
    expect(summarizeWeek(today, days, r).weeklyGoals[0].have).toBe(2);
  });

  it('marks a daily goal hit or missed per day, and leaves unfinished days blank', () => {
    const r = rules({ group_goals: [{ id: 'g', group: 'eggs', count: 1, period: 'day' }] });
    const w = summarizeWeek(today, days, r);
    expect(w.days.map((d) => dailyGoalOnDay(d, 'eggs', 1))).toEqual([
      'hit',
      'hit',
      'miss',
      'hit',
      'none',
      'none',
      'none',
    ]);
  });
});

describe('settings helpers', () => {
  it('adding a meal is capped at the slot limit', () => {
    expect(addSlot({ slots: SLOTS }, { id: 'snack', name: 'Snack' }).slots).toHaveLength(4);
    const full = { slots: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, name: `S${i}` })) };
    expect(addSlot(full, { id: 'x', name: 'X' })).toBe(full);
  });

  it('removing a meal never removes the last one', () => {
    expect(removeSlot({ slots: SLOTS }, 'lunch').slots).toHaveLength(2);
    const one = { slots: [SLOTS[0]] };
    expect(removeSlot(one, 'breakfast')).toBe(one);
  });

  it('a new group goal takes the first unused group, up to three', () => {
    const a = newGroupGoal([], 'a')!;
    expect(a.group).toBe('veggies');
    const b = newGroupGoal([a], 'b')!;
    expect(b.group).toBe('fruit');
    const c = newGroupGoal([a, b], 'c')!;
    expect(newGroupGoal([a, b, c], 'd')).toBeNull();
  });

  it('describes goals in plain words', () => {
    expect(describeGroupGoal({ id: 'g', group: 'veggies', count: 2, period: 'day' })).toBe(
      'Veggies at 2 meals a day'
    );
    expect(describeGroupGoal({ id: 'g', group: 'fish', count: 1, period: 'week' })).toBe(
      'Fish & seafood 1 time a week'
    );
  });
});

describe('editing a day', () => {
  const base = emptyDay('2026-10-15');

  it('logs and clears a meal', () => {
    const logged = withMeal(base, 'lunch', plate('fish'));
    expect(logged.meals.lunch).toEqual(plate('fish'));
    expect(withMeal(logged, 'lunch', null).meals).toEqual({});
    expect(base.meals).toEqual({}); // never mutated
  });

  it('adds, replaces and removes an extra', () => {
    const one = withExtra(base, extra('x', 'processed'));
    const replaced = withExtra(one, extra('x', 'fruit'));
    expect(replaced.extras).toEqual([extra('x', 'fruit')]);
    expect(withoutExtra(replaced, 'x').extras).toEqual([]);
  });

  it('closes an on-target day with the habit it checked off, and keeps it closed', () => {
    const full = { ...base, meals: { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') } };
    const closed = closeDay(full, rules(), { now: new Date(at), habitId: 'h1', reasonId: 'stress' });
    expect(closed).toMatchObject({ result: 'on', habit_id: 'h1', closed_at: at, rules: rules() });
    expect(closed.off_reason_id).toBeUndefined();
    expect(canReopen(closed)).toBe(false);
  });

  it('closes an off-target day with its reason, and lets it reopen', () => {
    const full = { ...base, meals: { breakfast: plate('processed'), lunch: plate('fish'), dinner: plate('beef') } };
    const closed = closeDay(full, rules(), { now: new Date(at), reasonId: 'ate_out', habitId: 'h1' });
    expect(closed).toMatchObject({ result: 'off', off_reason_id: 'ate_out' });
    expect(closed.habit_id).toBeUndefined();
    expect(canReopen(closed)).toBe(true);
    const reopened = reopenDay(closed);
    expect(reopened.closed_at).toBeUndefined();
    expect(reopened.result).toBeUndefined();
    expect(reopened.meals).toEqual(full.meals);
  });

  it('hands an on-target day to Today once — reopened and closed again, it is not rated twice', () => {
    const full = { ...base, meals: { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') } };
    expect(closeHandsOff(full, rules())).toBe(true);
    const closed = closeDay(full, rules(), { now: new Date(at) });
    expect(closed.handed_off_at).toBe(at);
    expect(canReopen(closed)).toBe(true);

    const reopened = reopenDay(closed);
    expect(reopened.handed_off_at).toBe(at);
    expect(closeHandsOff(reopened, rules())).toBe(false);
    const again = closeDay(reopened, rules(), { now: new Date('2026-10-15T20:00:00.000Z') });
    expect(again.result).toBe('on');
    expect(again.handed_off_at).toBe(at);
  });

  it('an on-target day closed before handoffs were stamped counts as handed off once reopened', () => {
    const full = { ...base, meals: { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') } };
    const legacy: MealsDay = { ...full, closed_at: at, result: 'on' };
    expect(reopenDay(legacy).handed_off_at).toBe(at);
    expect(closeHandsOff(reopenDay(legacy), rules())).toBe(false);
    // An off-target close was never handed off.
    expect(reopenDay({ ...full, closed_at: at, result: 'off' }).handed_off_at).toBeUndefined();
  });

  it('never hands off an off-target day, and an off close leaves no handoff stamp', () => {
    const full = { ...base, meals: { breakfast: plate('processed'), lunch: plate('fish'), dinner: plate('beef') } };
    expect(closeHandsOff(full, rules())).toBe(false);
    expect(closeDay(full, rules(), { now: new Date(at) }).handed_off_at).toBeUndefined();
  });

  it('a day of only "didn’t eat" closes neither on nor off, and hands nothing off', () => {
    const none = { ...base, meals: { breakfast: skipped, lunch: skipped, dinner: skipped } };
    const s = scoreDay(none, rules());
    expect(s.status).toBe('none');
    expect(s.complete).toBe(true);
    expect(s.average).toBeNull();
    expect(closeHandsOff(none, rules())).toBe(false);
    const closed = closeDay(none, rules(), { now: new Date(at), reasonId: 'stress' });
    expect(closed.closed_at).toBe(at);
    expect(closed.result).toBeUndefined();
    expect(closed.off_reason_id).toBeUndefined();
    expect(closed.handed_off_at).toBeUndefined();
  });

  it('a skipped meal plus an extra is scored by the extra', () => {
    const d = { ...base, meals: { breakfast: skipped, lunch: skipped, dinner: skipped }, extras: [extra('x', 'fruit')] };
    expect(scoreDay(d, rules()).status).toBe('on');
  });
});

describe('handoffDate', () => {
  it('is absent for today, and names the day when the clock has passed midnight', () => {
    const late = new Date(2026, 9, 15, 23, 59);
    const pastMidnight = new Date(2026, 9, 16, 0, 5);
    expect(handoffDate('2026-10-15', late)).toBeUndefined();
    expect(handoffDate('2026-10-15', pastMidnight)).toBe('2026-10-15');
  });
});

describe('pickerFoods', () => {
  const food = (id: string, score: number, archived = false): CustomFoodGroup => ({
    id: `custom_${id}`,
    label: id,
    score,
    nutrients: [],
    ...(archived ? { archived } : {}),
  });

  it('labels a chip with the score the plate is scored with, not today’s', () => {
    const offered = [food('carb', 90), food('new', 40)];
    const savedOnDay = [food('carb', 60)];
    expect(pickerFoods(offered, savedOnDay, []).map((f) => [f.id, f.score])).toEqual([
      ['custom_carb', 60],
      ['custom_new', 40],
    ]);
  });

  it('keeps a removed food that is already on the plate, so it can be taken off', () => {
    const gone = food('gone', 50, true);
    expect(pickerFoods([], [gone], ['custom_gone']).map((f) => f.id)).toEqual(['custom_gone']);
    expect(pickerFoods([], [gone], [])).toEqual([]);
  });
});

describe('clampOnTargetThreshold', () => {
  it('never lets the target drop below 50, or past 100', () => {
    expect(clampOnTargetThreshold(0)).toBe(50);
    expect(clampOnTargetThreshold(65)).toBe(65);
    expect(clampOnTargetThreshold(120)).toBe(100);
  });
});

describe('dairy', () => {
  it('dilutes the ratio like any non-whole group, but isn’t penalized unless strict', () => {
    expect(scorePlate(['fruit', 'dairy'], false, weights)).toBe(45); // ratio 0.5 (35) + protein+fiber (10)
    expect(scorePlate(['dairy'], false, weights)).toBe(5); // 0 ratio + protein (5), no processed penalty
  });

  it('costs the strict penalty like semi-processed does', () => {
    expect(scorePlate(['fruit', 'dairy'], true, weights)).toBe(35); // 45 - strict_penalty (10)
    expect(scoreVerdict(['eggs', 'dairy'], true, weights).why).toBe('strict mode (−10)');
    expect(scoreVerdict(['eggs', 'dairy'], false, weights).why).toBe('Real food, with a little semi-processed.');
  });
});

describe('supplements', () => {
  it('dilutes the ratio like any non-whole group, but isn’t penalized unless strict', () => {
    expect(scorePlate(['fruit', 'supplements'], false, weights)).toBe(45);
  });

  it('a shake on its own scores exactly on target, strict or not', () => {
    expect(scorePlate(['supplements'], false, weights)).toBe(weights.on_target_threshold);
    expect(scorePlate(['supplements'], true, weights)).toBe(weights.on_target_threshold);
    expect(scorePlate(['supplements'], false, { ...weights, on_target_threshold: 80 })).toBe(80);
    expect(scoreVerdict(['supplements'], true, weights).why).toBe('A protein shake on its own counts as on target.');
  });

  it('still tags a shake-only plate as protein', () => {
    expect(plateNutrients(['supplements'])).toEqual(['protein']);
  });

  it('costs the strict penalty like semi-processed does', () => {
    expect(scorePlate(['fruit', 'supplements'], true, weights)).toBe(35);
    expect(scoreVerdict(['eggs', 'supplements'], true, weights).why).toBe('strict mode (−10)');
    expect(scoreVerdict(['eggs', 'supplements'], false, weights).why).toBe('Real food, with a little semi-processed.');
  });
});

describe('nutrient tags', () => {
  it('tags a plate from its groups, in display order', () => {
    expect(plateNutrients(['chicken', 'veggies'])).toEqual(['protein', 'fiber']);
    expect(plateNutrients(['fish'])).toEqual(['protein', 'fats']);
    expect(plateNutrients(['legumes'])).toEqual(['protein', 'fiber', 'carbs']);
    expect(plateNutrients(['nuts'])).toEqual(['fiber', 'fats']);
    expect(plateNutrients(['grains'])).toEqual(['fiber', 'carbs']);
    expect(plateNutrients(['fruit'])).toEqual(['fiber', 'carbs']);
    expect(plateNutrients(['dairy'])).toEqual(['protein']);
    expect(plateNutrients(['supplements'])).toEqual(['protein']);
  });

  it('gives processed food nothing, and semi-processed only Carbs', () => {
    expect(plateNutrients(['semi'])).toEqual(['carbs']);
    expect(plateNutrients(['processed'])).toEqual([]);
  });

  it('Carbs is shown but earns no bonus, so it never changes a score', () => {
    expect(scorePlate(['grains'], false, weights)).toBe(75); // ratio 1.0 (70) + fiber (5); carbs adds nothing
    expect(scorePlate(['legumes'], false, weights)).toBe(80); // protein + fiber, not carbs
  });

  it('counts plates — meals and snacks alike — and skips meals not eaten or not logged', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs', 'fruit'), lunch: skipped }, [extra('x', 'nuts')]),
      rules()
    );
    // Plates: breakfast and the snack. Dinner isn't logged; lunch was skipped.
    expect(s.nutrients).toEqual([
      { nutrient: 'protein', have: 1, of: 2 },
      { nutrient: 'fiber', have: 2, of: 2 },
      { nutrient: 'fats', have: 1, of: 2 },
      { nutrient: 'carbs', have: 1, of: 2 },
    ]);
  });

  it('counts a low-scoring plate too — it still had what it had', () => {
    expect(nutrientCoverage([{ state: 'scored', groups: ['processed', 'veggies'] }])[1]).toEqual({
      nutrient: 'fiber',
      have: 1,
      of: 1,
    });
  });

  it('adds up across the week', () => {
    const w = summarizeWeek(
      '2026-10-13',
      {
        '2026-10-12': day('2026-10-12', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('veggies') }),
        '2026-10-13': day('2026-10-13', { breakfast: plate('dairy', 'fruit') }),
      },
      rules()
    );
    expect(w.nutrients.find((n) => n.nutrient === 'protein')).toEqual({ nutrient: 'protein', have: 3, of: 4 });
  });
});

describe('pastWeeks', () => {
  // Thursday 15 Oct 2026; this week began Monday 12 Oct.
  const today = '2026-10-15';
  const full = (date: string) => day(date, { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') });

  it('scores the weeks before this one, newest first, and skips empty ones', () => {
    const days = {
      '2026-10-13': full('2026-10-13'), // this week — not a past week
      '2026-10-06': full('2026-10-06'),
      '2026-10-07': day('2026-10-07', { breakfast: plate('processed') }),
      '2026-09-22': full('2026-09-22'),
    };
    const weeks = pastWeeks(today, days, rules());
    expect(weeks.map((w) => w.days[0].date)).toEqual(['2026-10-05', '2026-09-21']);
    expect(daysOnTarget(weeks[0])).toBe(1);
    // full day: 75+80+75=230 over 3; Oct 7: just breakfast, processed, scores 0.
    expect(weeks[0]).toMatchObject({ averageScore: 58, platesLogged: 4 });
    expect(weeks[0].days.every((d) => !d.future)).toBe(true);
  });

  it('scores a past day by the rules it was saved under', () => {
    const lenient = rules({ scoring: { ...weights, on_target_threshold: 30 } });
    const days = {
      '2026-10-06': {
        ...day('2026-10-06', { breakfast: plate('eggs'), lunch: skipped, dinner: plate('processed') }),
        rules: lenient,
      },
    };
    // 75 + 0 → 37.5 → 38, below the current threshold of 70 but above the saved lenient one of 30.
    expect(daysOnTarget(pastWeeks(today, days, rules())[0])).toBe(1);
  });

  it('counts a week where only "didn’t eat" was logged', () => {
    const days = { '2026-10-06': day('2026-10-06', { breakfast: skipped }) };
    expect(pastWeeks(today, days, rules())).toHaveLength(1);
  });
});

describe('reordering meals', () => {
  it('moves a meal up or down one place', () => {
    const ids = (p: { slots: { id: string }[] }) => p.slots.map((x) => x.id);
    expect(ids(moveSlot({ slots: SLOTS }, 'dinner', -1))).toEqual(['breakfast', 'dinner', 'lunch']);
    expect(ids(moveSlot({ slots: SLOTS }, 'breakfast', 1))).toEqual(['lunch', 'breakfast', 'dinner']);
  });

  it('stays put past either end, or for a meal it can’t find', () => {
    const p = { slots: SLOTS };
    expect(moveSlot(p, 'breakfast', -1)).toBe(p);
    expect(moveSlot(p, 'dinner', 1)).toBe(p);
    expect(moveSlot(p, 'nope', 1)).toBe(p);
  });

  it('a day is scored and listed in the new order', () => {
    const s = scoreDay(day('d', {}), rules({ slots: moveSlot({ slots: SLOTS }, 'dinner', -1).slots }));
    expect(s.items.map((i) => i.key)).toEqual(['breakfast', 'dinner', 'lunch']);
  });
});

describe('your own foods', () => {
  const carb: CustomFoodGroup = { id: 'custom_carb', label: 'Carb supplement', score: 80, nutrients: ['carbs'] };
  const bar: CustomFoodGroup = { id: 'custom_bar', label: 'Snack bar', score: 40, nutrients: ['protein'] };
  const custom = [carb, bar];

  it('on its own, a plate scores what you gave the food', () => {
    expect(scorePlate(['custom_carb'], false, weights, custom)).toBe(80);
    expect(scorePlate(['custom_carb'], true, weights, custom)).toBe(80); // strict mode doesn't touch it
  });

  it('two of your own foods alone average out', () => {
    expect(scorePlate(['custom_carb', 'custom_bar'], false, weights, custom)).toBe(60);
  });

  it('mixed with food, it is one share of the plate at its score', () => {
    // Eggs + Fruit score 80 as two shares; the bar is a third at 40.
    expect(scorePlate(['eggs', 'fruit'], false, weights)).toBe(80);
    expect(scorePlate(['eggs', 'fruit', 'custom_bar'], false, weights, custom)).toBe(67); // (160 + 40) / 3
  });

  it('its tags show on the plate but never add a bonus — its score is already yours', () => {
    expect(plateNutrients(['custom_bar'], custom)).toEqual(['protein']);
    expect(scorePlate(['custom_bar'], false, weights, custom)).toBe(40);
  });

  it('a protein shake with your own food: each keeps its own score', () => {
    // Shake alone = the on-target line (70); with the 80 supplement, (70 + 80) / 2.
    expect(scorePlate(['supplements', 'custom_carb'], false, weights, custom)).toBe(75);
  });

  it('a food with no definition is left out of the score', () => {
    expect(scorePlate(['eggs', 'fruit', 'custom_gone'], false, weights, custom)).toBe(80);
    expect(scorePlate(['custom_gone'], false, weights, custom)).toBeNull();
  });

  it('says why in the picker', () => {
    expect(scoreVerdict(['custom_carb'], false, weights, custom).why).toBe('Your own food: Carb supplement 80.');
    expect(scoreVerdict(['eggs', 'custom_carb'], false, weights, custom).why).toBe(
      'Your own food (Carb supplement 80) counts as one share of the plate.'
    );
    // A penalty on the rest of the plate is still named.
    expect(scoreVerdict(['processed', 'custom_carb'], false, weights, custom)).toEqual({
      score: 40,
      why: 'Your own food (Carb supplement 80) counts as one share of the plate · Processed on the plate (−30).',
    });
  });

  it('reads by name, and an archived one still reads by name on the days it was logged', () => {
    expect(describeGroups(['eggs', 'custom_carb'], custom)).toBe('Eggs · Carb supplement');
    expect(describeGroups(['custom_carb'], archiveCustomGroup(custom, 'custom_carb'))).toBe('Carb supplement');
  });

  it('scores a day with the foods in its rules, Carbs included in the coverage', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('custom_carb'), lunch: plate('eggs', 'fruit', 'custom_bar'), dinner: skipped }),
      rules({ custom_groups: custom })
    );
    expect(s.items.map((i) => i.score)).toEqual([80, 67, null]);
    expect(s.average).toBe(74);
    expect(s.status).toBe('on');
    expect(s.nutrients.find((n) => n.nutrient === 'carbs')).toEqual({ nutrient: 'carbs', have: 2, of: 2 });
  });

  it('a new food starts at the given score with no tags, up to the limit of active foods', () => {
    expect(newCustomGroup([], 'abc', 70)).toEqual({ id: 'custom_abc', label: 'My food 1', score: 70, nutrients: [] });
    const twelve = Array.from({ length: 12 }, (_, i) => ({ ...carb, id: `custom_${i}` as const }));
    expect(newCustomGroup(twelve, 'x', 70)).toBeNull();
    // Archived foods don't count toward the limit.
    expect(newCustomGroup(archiveCustomGroup(twelve, 'custom_0'), 'x', 70)).not.toBeNull();
  });

  it('edits keep the score a whole number from 0 to 100', () => {
    expect(updateCustomGroup(custom, 'custom_carb', { score: 140 })[0].score).toBe(100);
    expect(updateCustomGroup(custom, 'custom_carb', { score: -5 })[0].score).toBe(0);
    expect(updateCustomGroup(custom, 'custom_carb', { label: 'Gel' })[0]).toEqual({ ...carb, label: 'Gel' });
  });

  it('removing one archives it: it leaves the picker but stays defined', () => {
    const after = archiveCustomGroup(custom, 'custom_carb');
    expect(after).toHaveLength(2);
    expect(activeCustomGroups(after).map((g) => g.id)).toEqual(['custom_bar']);
  });
});

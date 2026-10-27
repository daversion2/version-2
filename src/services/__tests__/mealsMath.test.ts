import {
  addSlot,
  canReopen,
  closeDay,
  emptyDay,
  pastWeeks,
  daysOnTarget,
  nutrientCoverage,
  plateNutrients,
  recentPlates,
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
import type { FoodGroupId, GroupGoal, MealsDay, MealsRules } from '../../types/meals';

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
    expect(scorePlate(['supplements'], true, weights)).toBe(0); // 0 ratio + protein (5) - strict_penalty (10), clamped
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
    expect(rulesForDay('2026-10-14', '2026-10-15', { rules: lenient }, current)).toEqual(lenient);
    expect(rulesForDay('2026-10-14', '2026-10-15', undefined, current)).toBe(current);
  });

  it('backfills a missing scoring field on a day saved before it existed', () => {
    const r = rulesForDay('2026-10-14', '2026-10-15', { rules: oldRules }, current);
    expect(r.scoring).toEqual(DEFAULT_MEALS_SCORING);
    expect(r.slots).toBe(oldRules.slots); // the rest of the saved snapshot is preserved
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
    expect(scorePlate(['supplements'], false, weights)).toBe(5);
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
    expect(plateNutrients(['legumes'])).toEqual(['protein', 'fiber']);
    expect(plateNutrients(['nuts'])).toEqual(['fiber', 'fats']);
    expect(plateNutrients(['grains'])).toEqual(['fiber']);
    expect(plateNutrients(['dairy'])).toEqual(['protein']);
    expect(plateNutrients(['supplements'])).toEqual(['protein']);
  });

  it('gives processed food nothing', () => {
    expect(plateNutrients(['semi'])).toEqual([]);
    expect(plateNutrients(['processed'])).toEqual([]);
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

describe('recentPlates', () => {
  const t = (d: number) => `2026-10-${String(d).padStart(2, '0')}T12:00:00.000Z`;
  const p = (d: number, ...groups: FoodGroupId[]) => ({ groups, logged_at: t(d) });

  it('offers distinct plates, newest first, with the same plate in either order counted once', () => {
    const days = [
      day('2026-10-12', { breakfast: p(12, 'eggs', 'fruit') }),
      day('2026-10-13', { breakfast: p(13, 'fruit', 'eggs'), dinner: p(13, 'fish', 'veggies') }),
    ];
    expect(recentPlates(days, { kind: 'meal', slotId: 'lunch' })).toEqual([
      { groups: ['fruit', 'eggs'] },
      { groups: ['veggies', 'fish'] },
    ]);
  });

  it('puts plates from the same meal first — your usual lunch when you tap Lunch', () => {
    const days = [
      day('2026-10-12', { lunch: p(12, 'chicken', 'grains') }),
      day('2026-10-14', { dinner: p(14, 'beef', 'veggies') }),
    ];
    expect(recentPlates(days, { kind: 'meal', slotId: 'lunch' })[0]).toEqual({ groups: ['chicken', 'grains'] });
    expect(recentPlates(days, { kind: 'meal', slotId: 'dinner' })[0]).toEqual({ groups: ['veggies', 'beef'] });
  });

  it('never offers a skipped meal, and stops at the limit', () => {
    const days = [
      day('2026-10-12', { breakfast: skipped }),
      day('2026-10-13', { breakfast: p(13, 'eggs'), lunch: p(13, 'fish'), dinner: p(13, 'beef') }),
      day('2026-10-14', { breakfast: p(14, 'fruit'), lunch: p(14, 'legumes') }),
    ];
    const out = recentPlates(days, { kind: 'meal', slotId: 'breakfast' }, 3);
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.groups.length > 0)).toBe(true);
  });

  it('extras come first for something additional, and keep their latest name', () => {
    const days = [
      day('2026-10-12', { breakfast: p(12, 'eggs') }, [
        { id: 'a', groups: ['fruit', 'nuts'], logged_at: t(12), name: 'Trail mix' },
      ]),
      day('2026-10-13', {}, [{ id: 'b', groups: ['nuts', 'fruit'], logged_at: t(13), name: 'Apple + almonds' }]),
    ];
    expect(recentPlates(days, { kind: 'extra' })).toEqual([
      { groups: ['fruit', 'nuts'], name: 'Apple + almonds' },
      { groups: ['eggs'] },
    ]);
  });

  it('a meal never carries a snack name', () => {
    const days = [day('2026-10-12', {}, [{ id: 'a', groups: ['fruit'], logged_at: t(12), name: 'Apple' }])];
    expect(recentPlates(days, { kind: 'meal', slotId: 'lunch' })).toEqual([{ groups: ['fruit'] }]);
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

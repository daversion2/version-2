import {
  activeCustomGroups,
  archiveCustomGroup,
  describeGroups,
  isSettled,
  newCustomGroup,
  normalizeDay,
  platesOf,
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
  reopenDay,
  rulesForDay,
  chipScore,
  groupScoresFor,
  overrideCount,
  rulesOf,
  scoreByFormula,
  scoreDay,
  scorePlate,
  scoreVerdict,
  setScoreOverride,
  usesChipScores,
  verdictByFormula,
  summarizeWeek,
  dailyGoalOnDay,
  describeGroupGoal,
  newGroupGoal,
  weekDates,
  withPlate,
  withoutPlate,
} from '../mealsMath';
import { DEFAULT_MEALS_PREFS, DEFAULT_MEALS_SCORING, FOOD_GROUPS, MEAL_GOALS, sectionGroups } from '../../data/mealGroups';
import type { CustomFoodGroup, FoodGroupId, GroupGoal, MealPlate, MealsDay, MealsRules } from '../../types/meals';

// How days were saved before 2026-11-05: named meals, filled in by slot id.
const SLOTS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
];

const weights = DEFAULT_MEALS_SCORING; // ratio_points 70, nutrient_bonus 5, processed_penalty 30, strict_penalty 10, on_target_threshold 70

const rules = (over: Partial<MealsRules> = {}): MealsRules => ({
  strict: false,
  group_goals: [],
  scoring: weights,
  ...over,
});

const at = '2026-10-15T12:00:00.000Z';
let nextId = 0;
/** A plate logged at `at`. Same-time plates keep the order they're listed in. */
const plate = (...groups: FoodGroupId[]): MealPlate => ({ id: `p${++nextId}`, groups, logged_at: at });

const day = (date: string, plates: MealPlate[]): MealsDay => ({ date, plates });

/** Scored as a finished day: closed out, or past midnight. */
const settledScore = (d: MealsDay | undefined, r: MealsRules) => scoreDay(d, r, true);

describe('chip scores — a plate scores the average of its chips', () => {
  const balanced = rulesOf(DEFAULT_MEALS_PREFS);

  it('today’s rules carry the goal’s scores', () => {
    expect(balanced.goal).toBe('balanced');
    expect(usesChipScores(balanced)).toBe(true);
    expect(balanced.group_scores).toEqual(MEAL_GOALS[0].scores);
  });

  it('averages the chips, each counted once', () => {
    // Chicken 80, Veggies 90, Whole grains 75 → 81.67 → 82
    expect(scorePlate(['chicken', 'veggies', 'grains'], balanced)).toBe(82);
    expect(scorePlate(['veggies', 'veggies', 'fish'], balanced)).toBe(88); // (90 + 85) / 2 = 87.5
    expect(scorePlate(['fast_food', 'sugary_drinks'], balanced)).toBe(10);
  });

  it('a protein shake on its own is just its chip score', () => {
    expect(scorePlate(['supplements'], balanced)).toBe(70);
  });

  it('is null for an empty plate', () => {
    expect(scorePlate([], balanced)).toBeNull();
    expect(scorePlate(undefined, balanced)).toBeNull();
  });

  it('your own food is a chip at the score you gave it; a removed one is left out', () => {
    const custom: CustomFoodGroup[] = [{ id: 'custom_gel', label: 'Gel', score: 40, nutrients: [] }];
    const r = { ...balanced, custom_groups: custom };
    expect(scorePlate(['custom_gel', 'veggies'], r)).toBe(65);
    expect(scorePlate(['custom_gone', 'veggies'], r)).toBe(90);
  });

  it('reads a chip the saved scores don’t know at its Balanced default', () => {
    const { sauces: _, ...older } = MEAL_GOALS[0].scores;
    expect(chipScore('sauces', { group_scores: older as typeof MEAL_GOALS[0]['scores'] })).toBe(40);
  });

  it('still scores the retired Semi-processed and Processed chips on old plates', () => {
    expect(scorePlate(['semi'], balanced)).toBe(45);
    expect(scorePlate(['processed'], balanced)).toBe(15);
  });

  it('says how the score was made', () => {
    expect(scoreVerdict(['eggs'], balanced)).toEqual({ score: 80, why: 'Eggs scores 80.' });
    expect(scoreVerdict(['eggs', 'fruit'], balanced).why).toBe('The average of Eggs 80, Fruit 80.');
    expect(scoreVerdict([], balanced)).toEqual({ score: null, why: 'Tap what was on the plate.' });
  });

  it('a day saved without chip scores keeps the formula', () => {
    expect(usesChipScores(rules())).toBe(false);
    expect(scorePlate(['eggs', 'fruit'], rules())).toBe(80); // the formula: 70 + protein + fiber
    expect(scorePlate(['supplements'], rules())).toBe(70);
  });
});

describe('goals', () => {
  const PROCESSED = FOOD_GROUPS.filter((g) => g.section === 'processed').map((g) => g.id);

  it('every goal scores every chip', () => {
    for (const goal of MEAL_GOALS) {
      for (const g of FOOD_GROUPS) expect(typeof goal.scores[g.id]).toBe('number');
    }
  });

  it('processed food scores the same, and low, in every goal', () => {
    for (const id of PROCESSED) {
      const scores = MEAL_GOALS.map((g) => g.scores[id]);
      expect(new Set(scores).size).toBe(1);
      expect(scores[0]).toBeLessThanOrEqual(30);
    }
  });

  it('Build muscle scores protein higher; Plant-forward scores plants higher and meat lower', () => {
    const [balanced, muscle, plant] = MEAL_GOALS.map((g) => g.scores);
    expect(muscle.chicken).toBeGreaterThan(balanced.chicken);
    expect(muscle.supplements).toBeGreaterThan(balanced.supplements);
    expect(muscle.legumes).toBeGreaterThan(balanced.legumes);
    expect(muscle.nuts).toBeGreaterThan(balanced.nuts);
    expect(plant.legumes).toBeGreaterThan(balanced.legumes);
    expect(plant.beef).toBeLessThan(balanced.beef);
  });

  it('the same plate scores differently by goal', () => {
    const plate = ['beef', 'veggies'] as FoodGroupId[];
    const score = (goal: 'balanced' | 'muscle' | 'plant') => scorePlate(plate, rulesOf({ ...DEFAULT_MEALS_PREFS, goal }));
    expect(score('balanced')).toBe(83); // (75 + 90) / 2 = 82.5
    expect(score('muscle')).toBe(85);
    expect(score('plant')).toBe(75);
  });

  it('an unknown goal reads as Balanced', () => {
    expect(groupScoresFor('nope' as never)).toEqual(MEAL_GOALS[0].scores);
  });
});

describe('customizing scores', () => {
  it('your changes sit on top of the goal', () => {
    expect(groupScoresFor('balanced', { veggies: 100 }).veggies).toBe(100);
    expect(groupScoresFor('balanced', { veggies: 100 }).fruit).toBe(80);
    expect(rulesOf({ ...DEFAULT_MEALS_PREFS, score_overrides: { bread: 60 } }).group_scores?.bread).toBe(60);
  });

  it('keeps a score a whole number from 0 to 100', () => {
    expect(groupScoresFor('balanced', { veggies: 140, fruit: -5, eggs: 72.4 })).toMatchObject({ veggies: 100, fruit: 0, eggs: 72 });
  });

  it('only saves real changes: a score set back to the default drops out', () => {
    const one = setScoreOverride('balanced', {}, 'veggies', 95);
    expect(one).toEqual({ veggies: 95 });
    expect(setScoreOverride('balanced', one, 'veggies', 90)).toEqual({});
    expect(setScoreOverride('muscle', {}, 'chicken', 90)).toEqual({}); // already Build muscle’s default
  });

  it('counts the changed scores', () => {
    expect(overrideCount('balanced', {})).toBe(0);
    expect(overrideCount('balanced', { veggies: 95, fruit: 80 })).toBe(1); // fruit is the default anyway
  });

  it('a retired chip is offered only while it’s on the plate', () => {
    expect(sectionGroups('processed').map((g) => g.id)).not.toContain('processed');
    expect(sectionGroups('processed', ['processed']).map((g) => g.id)).toContain('processed');
  });
});

describe('scoreByFormula — days saved before chip scores', () => {
  it('is dominated by the whole-food ratio', () => {
    expect(scoreByFormula(['eggs', 'fruit'], false, weights)).toBe(80); // ratio 1.0 (70) + protein+fiber (10)
    expect(scoreByFormula(['chicken', 'veggies', 'grains', 'semi'], false, weights)).toBe(63); // ratio 0.75 (52.5) + protein+fiber (10)
  });

  it('adds a bonus per nutrient tag the plate hits, equally weighted, up to three', () => {
    expect(scoreByFormula(['grains'], false, weights)).toBe(75); // ratio 70 + fiber only (5)
    expect(scoreByFormula(['fish'], false, weights)).toBe(80); // ratio 70 + protein+fats (10)
  });

  it('costs Processed a flat penalty on top of the ratio dilution it already causes', () => {
    expect(scoreByFormula(['processed'], false, weights)).toBe(0); // 0 ratio, 0 nutrients, -30, clamped
    expect(scoreByFormula(['processed', 'veggies'], false, weights)).toBe(10); // ratio 0.5 (35) + fiber (5) - 30
  });

  it('strict mode costs dairy/semi/supplements extra — processed is unaffected, it already has its own penalty', () => {
    expect(scoreByFormula(['chicken', 'veggies', 'semi'], false, weights)).toBe(57);
    expect(scoreByFormula(['chicken', 'veggies', 'semi'], true, weights)).toBe(47); // 57 - strict_penalty (10)
    expect(scoreByFormula(['processed', 'veggies'], true, weights)).toBe(10); // unchanged: 'processed' isn't semi-tier
  });

  it('is null for an empty plate', () => {
    expect(scoreByFormula([], false, weights)).toBeNull();
    expect(scoreByFormula(undefined, false, weights)).toBeNull();
  });

  it('never goes below 0', () => {
    expect(scoreByFormula(['semi'], true, weights)).toBe(0); // 0 ratio + nothing - strict_penalty (10), clamped
  });

  it('never goes above 100, even with custom weights pushing the raw total over', () => {
    const big = { ...weights, ratio_points: 100, nutrient_bonus: 10 };
    expect(scoreByFormula(['fish'], false, big)).toBe(100); // 100 ratio + 20 (protein+fats) would be 120
  });
});

describe('verdictByFormula', () => {
  it('names the penalty that applied', () => {
    expect(verdictByFormula(['processed', 'veggies'], false, weights)).toEqual({
      score: 10,
      why: 'Processed on the plate (−30)',
    });
    expect(verdictByFormula(['eggs', 'semi'], true, weights).why).toBe('strict mode (−10)');
  });

  it('describes a clean plate', () => {
    expect(verdictByFormula(['eggs', 'fruit'], false, weights).why).toBe('All whole food.');
    expect(verdictByFormula(['eggs', 'semi'], false, weights).why).toBe('Real food, with a little semi-processed.');
  });

  it('an empty plate has no score yet', () => {
    expect(verdictByFormula([], false, weights)).toEqual({ score: null, why: 'Tap what was on the plate.' });
  });
});

describe('scoreDay — averaging plates into a day score', () => {
  it('a clean whole-food day averages its three plates', () => {
    const s = settledScore(day('d', [plate('eggs'), plate('fish'), plate('beef')]), rules());
    // 75, 80, 75 → 76.67 → 77
    expect(s.average).toBe(77);
    expect(s.scoredCount).toBe(3);
    expect(s.status).toBe('on');
  });

  it('a shake-only lunch counts as a meal without sinking the day', () => {
    const s = settledScore(day('d', [plate('eggs'), plate('supplements'), plate('beef')]), rules());
    // 75, 70, 75 → 73.33 → 73 — would have been 52 (and off) when a lone shake scored 5
    expect(s.average).toBe(73);
    expect(s.status).toBe('on');
  });

  it('a Processed snack pulls the average down — every plate counts the same', () => {
    const s = settledScore(day('d', [plate('eggs'), plate('fish'), plate('beef'), plate('processed')]), rules());
    // 75, 80, 75, 0 → 57.5 → 58, under the default threshold of 70
    expect(s.average).toBe(58);
    expect(s.status).toBe('off');
  });

  it('a plate with nothing tapped is not a plate', () => {
    const s = settledScore(day('d', [plate('fish'), plate()]), rules());
    expect(s.scoredCount).toBe(1);
    expect(s.average).toBe(80);
  });

  it('the on-target threshold is a settings knob, read from scoring.on_target_threshold', () => {
    const d = day('d', [plate('eggs'), plate('processed'), plate('beef')]);
    // 75, 0, 75 → 50 exactly
    expect(settledScore(d, rules()).status).toBe('off');
    expect(settledScore(d, rules({ scoring: { ...weights, on_target_threshold: 50 } })).status).toBe('on');
  });

  it('lists plates in the order they were logged, with name and time', () => {
    const late = { id: 'b', name: 'Dinner', groups: ['beef'] as FoodGroupId[], logged_at: '2026-10-15T19:00:00.000Z' };
    const early = { id: 'a', groups: ['eggs'] as FoodGroupId[], logged_at: '2026-10-15T08:00:00.000Z' };
    const s = scoreDay(withPlate(withPlate(emptyDay('d'), late), early), rules());
    expect(s.items).toEqual([
      { key: 'a', name: undefined, groups: ['eggs'], score: 75, logged_at: early.logged_at },
      { key: 'b', name: 'Dinner', groups: ['beef'], score: 75, logged_at: late.logged_at },
    ]);
  });
});

describe('scoreDay — open until it settles', () => {
  it('stays pending while open, however many plates are logged', () => {
    const s = scoreDay(day('d', [plate('eggs'), plate('fish'), plate('beef')]), rules());
    expect(s.status).toBe('pending');
    expect(s.settled).toBe(false);
    expect(s.average).toBe(77);
  });

  it('stays pending even when what’s logged so far is too low — no early verdict', () => {
    const s = scoreDay(day('d', [plate('processed')]), rules());
    expect(s.status).toBe('pending');
    expect(s.average).toBe(0);
  });

  it('an untouched open day is pending, with no average yet', () => {
    const s = scoreDay(undefined, rules());
    expect(s.status).toBe('pending');
    expect(s.average).toBeNull();
  });

  it('a closed day is settled without being told', () => {
    const d = { ...day('d', [plate('eggs')]), closed_at: at };
    expect(scoreDay(d, rules()).status).toBe('on');
  });

  it('a settled day with no plates counts neither way', () => {
    const s = settledScore(day('d', []), rules());
    expect(s.status).toBe('none');
    expect(s.average).toBeNull();
  });
});

describe('isSettled — a day closes on its own at midnight', () => {
  it('today stays open until it is closed out', () => {
    expect(isSettled('2026-10-15', '2026-10-15', undefined)).toBe(false);
    expect(isSettled('2026-10-15', '2026-10-15', {})).toBe(false);
    expect(isSettled('2026-10-15', '2026-10-15', { closed_at: at })).toBe(true);
  });

  it('any earlier day is settled, closed out or not', () => {
    expect(isSettled('2026-10-14', '2026-10-15', undefined)).toBe(true);
    expect(isSettled('2026-10-14', '2026-10-15', {})).toBe(true);
  });
});

describe('scoreDay — daily group goals are a readout, not a gate', () => {
  const veggies2: GroupGoal = { id: 'g', group: 'veggies', count: 2, period: 'day' };
  const fishWeekly: GroupGoal = { id: 'w', group: 'fish', count: 2, period: 'week' };

  it('an unmet daily goal never forces the day off once the average clears the threshold', () => {
    const r = rules({ group_goals: [veggies2] });
    const short = settledScore(day('d', [plate('eggs'), plate('veggies'), plate('beef')]), r);
    expect(short.groupGoals[0]).toMatchObject({ have: 1, met: false });
    expect(short.average).toBe(75);
    expect(short.status).toBe('on');

    const met = settledScore(day('d', [plate('eggs'), plate('veggies'), plate('beef', 'veggies')]), r);
    expect(met.groupGoals[0].met).toBe(true);
    expect(met.status).toBe('on');
  });

  it('a veggie snack counts toward the goal', () => {
    const s = scoreDay(day('d', [plate('eggs'), plate('veggies'), plate('veggies')]), rules({ group_goals: [veggies2] }));
    expect(s.groupGoals[0].have).toBe(2);
  });

  it('weekly goals never show up as a daily readout', () => {
    const s = settledScore(day('d', [plate('eggs'), plate('beef')]), rules({ group_goals: [fishWeekly] }));
    expect(s.groupGoals).toHaveLength(0);
    expect(s.status).toBe('on');
  });
});

describe('platesOf — days saved before plates', () => {
  const legacy = {
    date: '2026-10-14',
    meals: {
      breakfast: { groups: ['eggs'] as FoodGroupId[], logged_at: '2026-10-14T08:00:00.000Z' },
      lunch: { skipped: true as const, logged_at: '2026-10-14T12:00:00.000Z' },
      dinner: { groups: ['beef', 'veggies'] as FoodGroupId[], logged_at: '2026-10-14T19:00:00.000Z' },
    },
    extras: [{ id: 'x', name: 'Apple', groups: ['fruit'] as FoodGroupId[], logged_at: '2026-10-14T15:00:00.000Z' }],
    rules: { ...rules(), slots: SLOTS },
  } as unknown as MealsDay;

  it('turns each meal into a plate under its meal’s name, merges the extras, and keeps logged order', () => {
    expect(platesOf(legacy)).toEqual([
      { id: 'breakfast', name: 'Breakfast', groups: ['eggs'], logged_at: '2026-10-14T08:00:00.000Z' },
      { id: 'x', name: 'Apple', groups: ['fruit'], logged_at: '2026-10-14T15:00:00.000Z' },
      { id: 'dinner', name: 'Dinner', groups: ['beef', 'veggies'], logged_at: '2026-10-14T19:00:00.000Z' },
    ]);
  });

  it('a "didn’t eat" leaves nothing behind — it never counted', () => {
    expect(platesOf(legacy).some((p) => p.id === 'lunch')).toBe(false);
  });

  it('scores an old day exactly as it scored before', () => {
    // Eggs 75, Apple 75, beef + veggies 80: the skipped lunch never counted.
    const s = settledScore(legacy, legacy.rules!);
    expect(s.scoredCount).toBe(3);
    expect(s.average).toBe(77);
    expect(s.status).toBe('on');
  });

  it('normalizing drops the old fields and keeps the rest of the day', () => {
    const closed = { ...legacy, closed_at: at, result: 'on' as const };
    const n = normalizeDay(closed);
    expect(n.meals).toBeUndefined();
    expect(n.extras).toBeUndefined();
    expect(n.plates).toHaveLength(3);
    expect(n).toMatchObject({ closed_at: at, result: 'on', rules: legacy.rules });
  });

  it('a day already in plates is left as it is', () => {
    const d = day('d', [plate('fish')]);
    expect(platesOf(d)).toBe(d.plates);
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
    '2026-10-12': day('2026-10-12', [plate('eggs'), plate('processed'), plate('fish')]),
    '2026-10-13': day('2026-10-13', [plate('eggs'), plate('processed'), plate('fish')]),
    '2026-10-14': day('2026-10-14', [plate('beef'), plate('processed'), plate('fruit')]),
    '2026-10-15': day('2026-10-15', [plate('eggs')]),
  };

  it('averages every plate so far, skipping the days ahead', () => {
    const w = summarizeWeek(today, days, rules());
    // 75,0,80 + 75,0,80 + 75,0,75 + 75 = 535 over 10 plates
    expect(w.platesLogged).toBe(10);
    expect(w.averageScore).toBe(54);
    expect(w.days.filter((d) => d.future)).toHaveLength(3);
  });

  it('past days settle at midnight; today stays open', () => {
    const w = summarizeWeek(today, days, rules());
    expect(w.days.map((d) => d.score?.status ?? null)).toEqual(['off', 'off', 'off', 'pending', null, null, null]);
  });

  it('a past day with nothing logged counts neither way', () => {
    const w = summarizeWeek(today, {}, rules());
    expect(w.days[0].score?.status).toBe('none');
  });

  it('counts weekly goals across the week so far', () => {
    const r = rules({ group_goals: [{ id: 'w', group: 'fish', count: 2, period: 'week' }] });
    expect(summarizeWeek(today, days, r).weeklyGoals[0].have).toBe(2);
  });

  it('marks a daily goal hit or missed per settled day, and leaves today blank until it is hit', () => {
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
    const r2 = rules({ group_goals: [{ id: 'g', group: 'fish', count: 1, period: 'day' }] });
    expect(dailyGoalOnDay(summarizeWeek(today, days, r2).days[3], 'fish', 1)).toBe('none');
  });
});

describe('goal helpers', () => {
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
  const fullDay = () => ({ ...base, plates: [plate('eggs'), plate('fish'), plate('beef')] });
  const offDay = () => ({ ...base, plates: [plate('processed'), plate('fish'), plate('beef')] });

  it('adds, replaces and removes a plate', () => {
    const fish = plate('fish');
    const one = withPlate(base, fish);
    expect(one.plates).toEqual([fish]);
    const renamed = withPlate(one, { ...fish, name: 'Lunch', groups: ['fish', 'veggies'] });
    expect(renamed.plates).toEqual([{ ...fish, name: 'Lunch', groups: ['fish', 'veggies'] }]);
    expect(withoutPlate(renamed, fish.id).plates).toEqual([]);
    expect(base.plates).toEqual([]); // never mutated
  });

  it('editing a plate on an old day saves the whole day as plates', () => {
    const legacy = {
      date: '2026-10-14',
      meals: { lunch: { groups: ['fish'] as FoodGroupId[], logged_at: at } },
      extras: [],
      rules: { ...rules(), slots: SLOTS },
    } as unknown as MealsDay;
    const next = withPlate(legacy, plate('fruit'));
    expect(next.meals).toBeUndefined();
    expect(next.extras).toBeUndefined();
    expect(next.plates.map((p) => p.name ?? p.groups[0])).toEqual(['Lunch', 'fruit']);
  });

  it('closes an on-target day with the habit it checked off, and keeps it closed', () => {
    const closed = closeDay(fullDay(), rules(), { now: new Date(at), habitId: 'h1', reasonId: 'stress' });
    expect(closed).toMatchObject({ result: 'on', habit_id: 'h1', closed_at: at, rules: rules() });
    expect(closed.off_reason_id).toBeUndefined();
    expect(canReopen(closed)).toBe(false);
  });

  it('closes an off-target day with its reason, and lets it reopen', () => {
    const full = offDay();
    const closed = closeDay(full, rules(), { now: new Date(at), reasonId: 'ate_out', habitId: 'h1' });
    expect(closed).toMatchObject({ result: 'off', off_reason_id: 'ate_out' });
    expect(closed.habit_id).toBeUndefined();
    expect(canReopen(closed)).toBe(true);
    const reopened = reopenDay(closed);
    expect(reopened.closed_at).toBeUndefined();
    expect(reopened.result).toBeUndefined();
    expect(reopened.plates).toEqual(full.plates);
    expect(scoreDay(reopened, rules()).status).toBe('pending');
  });

  it('closes on whatever is logged — there is nothing to catch up first', () => {
    expect(closeDay({ ...base, plates: [plate('eggs')] }, rules(), { now: new Date(at) }).result).toBe('on');
  });

  it('hands an on-target day to Today once — reopened and closed again, it is not rated twice', () => {
    const full = fullDay();
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
    const full = fullDay();
    const legacy: MealsDay = { ...full, closed_at: at, result: 'on' };
    expect(reopenDay(legacy).handed_off_at).toBe(at);
    expect(closeHandsOff(reopenDay(legacy), rules())).toBe(false);
    // An off-target close was never handed off.
    expect(reopenDay({ ...full, closed_at: at, result: 'off' }).handed_off_at).toBeUndefined();
  });

  it('never hands off an off-target day, and an off close leaves no handoff stamp', () => {
    const full = offDay();
    expect(closeHandsOff(full, rules())).toBe(false);
    expect(closeDay(full, rules(), { now: new Date(at) }).handed_off_at).toBeUndefined();
  });

  it('a day with nothing logged closes neither on nor off, and hands nothing off', () => {
    expect(closeHandsOff(base, rules())).toBe(false);
    const closed = closeDay(base, rules(), { now: new Date(at), reasonId: 'stress' });
    expect(closed.closed_at).toBe(at);
    expect(closed.result).toBeUndefined();
    expect(closed.off_reason_id).toBeUndefined();
    expect(closed.handed_off_at).toBeUndefined();
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
    expect(scoreByFormula(['fruit', 'dairy'], false, weights)).toBe(45); // ratio 0.5 (35) + protein+fiber (10)
    expect(scoreByFormula(['dairy'], false, weights)).toBe(5); // 0 ratio + protein (5), no processed penalty
  });

  it('costs the strict penalty like semi-processed does', () => {
    expect(scoreByFormula(['fruit', 'dairy'], true, weights)).toBe(35); // 45 - strict_penalty (10)
    expect(verdictByFormula(['eggs', 'dairy'], true, weights).why).toBe('strict mode (−10)');
    expect(verdictByFormula(['eggs', 'dairy'], false, weights).why).toBe('Real food, with a little semi-processed.');
  });
});

describe('supplements', () => {
  it('dilutes the ratio like any non-whole group, but isn’t penalized unless strict', () => {
    expect(scoreByFormula(['fruit', 'supplements'], false, weights)).toBe(45);
  });

  it('a shake on its own scores exactly on target, strict or not', () => {
    expect(scoreByFormula(['supplements'], false, weights)).toBe(weights.on_target_threshold);
    expect(scoreByFormula(['supplements'], true, weights)).toBe(weights.on_target_threshold);
    expect(scoreByFormula(['supplements'], false, { ...weights, on_target_threshold: 80 })).toBe(80);
    expect(verdictByFormula(['supplements'], true, weights).why).toBe('A protein shake on its own counts as on target.');
  });

  it('still tags a shake-only plate as protein', () => {
    expect(plateNutrients(['supplements'])).toEqual(['protein']);
  });

  it('costs the strict penalty like semi-processed does', () => {
    expect(scoreByFormula(['fruit', 'supplements'], true, weights)).toBe(35);
    expect(verdictByFormula(['eggs', 'supplements'], true, weights).why).toBe('strict mode (−10)');
    expect(verdictByFormula(['eggs', 'supplements'], false, weights).why).toBe('Real food, with a little semi-processed.');
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
    expect(scoreByFormula(['grains'], false, weights)).toBe(75); // ratio 1.0 (70) + fiber (5); carbs adds nothing
    expect(scoreByFormula(['legumes'], false, weights)).toBe(80); // protein + fiber, not carbs
  });

  it('counts plates — meals and snacks alike', () => {
    const s = scoreDay(day('d', [plate('eggs', 'fruit'), plate('nuts')]), rules());
    expect(s.nutrients).toEqual([
      { nutrient: 'protein', have: 1, of: 2 },
      { nutrient: 'fiber', have: 2, of: 2 },
      { nutrient: 'fats', have: 1, of: 2 },
      { nutrient: 'carbs', have: 1, of: 2 },
    ]);
  });

  it('counts a low-scoring plate too — it still had what it had', () => {
    expect(nutrientCoverage([{ groups: ['processed', 'veggies'] }])[1]).toEqual({
      nutrient: 'fiber',
      have: 1,
      of: 1,
    });
  });

  it('adds up across the week', () => {
    const w = summarizeWeek(
      '2026-10-13',
      {
        '2026-10-12': day('2026-10-12', [plate('eggs'), plate('fish'), plate('veggies')]),
        '2026-10-13': day('2026-10-13', [plate('dairy', 'fruit')]),
      },
      rules()
    );
    expect(w.nutrients.find((n) => n.nutrient === 'protein')).toEqual({ nutrient: 'protein', have: 3, of: 4 });
  });
});

describe('pastWeeks', () => {
  // Thursday 15 Oct 2026; this week began Monday 12 Oct.
  const today = '2026-10-15';
  const full = (date: string) => day(date, [plate('eggs'), plate('fish'), plate('beef')]);

  it('scores the weeks before this one, newest first, and skips empty ones', () => {
    const days = {
      '2026-10-13': full('2026-10-13'), // this week — not a past week
      '2026-10-06': full('2026-10-06'),
      '2026-10-07': day('2026-10-07', [plate('processed')]),
      '2026-09-22': full('2026-09-22'),
    };
    const weeks = pastWeeks(today, days, rules());
    expect(weeks.map((w) => w.days[0].date)).toEqual(['2026-10-05', '2026-09-21']);
    expect(daysOnTarget(weeks[0])).toBe(1); // Oct 6 on; Oct 7 settled off at midnight
    // full day: 75+80+75=230 over 3; Oct 7: just breakfast, processed, scores 0.
    expect(weeks[0]).toMatchObject({ averageScore: 58, platesLogged: 4 });
    expect(weeks[0].days.every((d) => !d.future)).toBe(true);
  });

  it('scores a past day by the rules it was saved under', () => {
    const lenient = rules({ scoring: { ...weights, on_target_threshold: 30 } });
    const days = {
      '2026-10-06': {
        ...day('2026-10-06', [plate('eggs'), plate('processed')]),
        rules: lenient,
      },
    };
    // 75 + 0 → 37.5 → 38, below the current threshold of 70 but above the saved lenient one of 30.
    expect(daysOnTarget(pastWeeks(today, days, rules())[0])).toBe(1);
  });

  it('leaves out a week with nothing logged', () => {
    expect(pastWeeks(today, { '2026-10-06': day('2026-10-06', []) }, rules())).toHaveLength(0);
  });
});

describe('your own foods', () => {
  const carb: CustomFoodGroup = { id: 'custom_carb', label: 'Carb supplement', score: 80, nutrients: ['carbs'] };
  const bar: CustomFoodGroup = { id: 'custom_bar', label: 'Snack bar', score: 40, nutrients: ['protein'] };
  const custom = [carb, bar];

  it('on its own, a plate scores what you gave the food', () => {
    expect(scoreByFormula(['custom_carb'], false, weights, custom)).toBe(80);
    expect(scoreByFormula(['custom_carb'], true, weights, custom)).toBe(80); // strict mode doesn't touch it
  });

  it('two of your own foods alone average out', () => {
    expect(scoreByFormula(['custom_carb', 'custom_bar'], false, weights, custom)).toBe(60);
  });

  it('mixed with food, it is one share of the plate at its score', () => {
    // Eggs + Fruit score 80 as two shares; the bar is a third at 40.
    expect(scoreByFormula(['eggs', 'fruit'], false, weights)).toBe(80);
    expect(scoreByFormula(['eggs', 'fruit', 'custom_bar'], false, weights, custom)).toBe(67); // (160 + 40) / 3
  });

  it('its tags show on the plate but never add a bonus — its score is already yours', () => {
    expect(plateNutrients(['custom_bar'], custom)).toEqual(['protein']);
    expect(scoreByFormula(['custom_bar'], false, weights, custom)).toBe(40);
  });

  it('a protein shake with your own food: each keeps its own score', () => {
    // Shake alone = the on-target line (70); with the 80 supplement, (70 + 80) / 2.
    expect(scoreByFormula(['supplements', 'custom_carb'], false, weights, custom)).toBe(75);
  });

  it('a food with no definition is left out of the score', () => {
    expect(scoreByFormula(['eggs', 'fruit', 'custom_gone'], false, weights, custom)).toBe(80);
    expect(scoreByFormula(['custom_gone'], false, weights, custom)).toBeNull();
  });

  it('says why in the picker', () => {
    expect(verdictByFormula(['custom_carb'], false, weights, custom).why).toBe('Your own food: Carb supplement 80.');
    expect(verdictByFormula(['eggs', 'custom_carb'], false, weights, custom).why).toBe(
      'Your own food (Carb supplement 80) counts as one share of the plate.'
    );
    // A penalty on the rest of the plate is still named.
    expect(verdictByFormula(['processed', 'custom_carb'], false, weights, custom)).toEqual({
      score: 40,
      why: 'Your own food (Carb supplement 80) counts as one share of the plate · Processed on the plate (−30).',
    });
  });

  it('reads by name, and an archived one still reads by name on the days it was logged', () => {
    expect(describeGroups(['eggs', 'custom_carb'], custom)).toBe('Eggs · Carb supplement');
    expect(describeGroups(['custom_carb'], archiveCustomGroup(custom, 'custom_carb'))).toBe('Carb supplement');
  });

  it('scores a day with the foods in its rules, Carbs included in the coverage', () => {
    const s = settledScore(
      day('d', [plate('custom_carb'), plate('eggs', 'fruit', 'custom_bar')]),
      rules({ custom_groups: custom })
    );
    expect(s.items.map((i) => i.score)).toEqual([80, 67]);
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

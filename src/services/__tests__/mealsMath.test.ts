import {
  addSlot,
  allowedMisses,
  canReopen,
  closeDay,
  emptyDay,
  plateVerdict,
  reopenDay,
  withExtra,
  withMeal,
  withoutExtra,
  clampPassGoal,
  dailyGoalOnDay,
  describeGroupGoal,
  describeMealGoal,
  evaluatePlate,
  newGroupGoal,
  removeSlot,
  rulesForDay,
  scoreDay,
  summarizeWeek,
  weekDates,
} from '../mealsMath';
import type { FoodGroupId, GroupGoal, MealsDay, MealsRules } from '../../types/meals';

const SLOTS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
];

const rules = (over: Partial<MealsRules> = {}): MealsRules => ({
  slots: SLOTS,
  pass_goal: 3,
  strict: false,
  group_goals: [],
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

describe('evaluatePlate', () => {
  it('passes real food, and real food with semi-processed alongside', () => {
    expect(evaluatePlate(['eggs', 'fruit'], false)).toBe('pass');
    expect(evaluatePlate(['chicken', 'veggies', 'grains', 'semi'], false)).toBe('pass');
    expect(evaluatePlate(['fruit', 'semi'], false)).toBe('pass'); // yogurt with berries
  });

  it('fails anything Processed, even with real food beside it', () => {
    expect(evaluatePlate(['processed'], false)).toBe('fail');
    expect(evaluatePlate(['processed', 'veggies'], false)).toBe('fail'); // frozen pizza + side salad
  });

  it('fails semi-processed on its own — there is no real food on the plate', () => {
    expect(evaluatePlate(['semi'], false)).toBe('fail'); // plain yogurt (dairy is semi-processed)
  });

  it('strict mode fails semi-processed alongside real food too', () => {
    expect(evaluatePlate(['chicken', 'veggies', 'semi'], true)).toBe('fail');
    expect(evaluatePlate(['eggs', 'fruit'], true)).toBe('pass');
  });

  it('an empty plate has no result yet', () => {
    expect(evaluatePlate([], false)).toBeNull();
    expect(evaluatePlate(undefined, false)).toBeNull();
  });
});

describe('scoreDay — the founder’s worked examples', () => {
  it('pass 3 of 3, all pass → on target', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }), rules());
    expect(s.status).toBe('on');
    expect(s.passes).toBe(3);
  });

  it('pass 3 of 3, all pass plus a Processed snack → off target: the snack is the one miss', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }, [extra('x', 'processed')]),
      rules()
    );
    expect(s.fails).toBe(1);
    expect(s.status).toBe('off');
  });

  it('pass 2 of 3 with one failed meal → on target', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('processed'), dinner: plate('beef') }),
      rules({ pass_goal: 2 })
    );
    expect(s.allowed).toBe(1);
    expect(s.status).toBe('on');
  });

  it('pass 2 of 3, all pass plus a Processed snack → on target: the snack uses the one miss', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }, [extra('x', 'processed')]),
      rules({ pass_goal: 2 })
    );
    expect(s.status).toBe('on');
  });

  it('a skipped meal never counts against you: 3 of 3 with breakfast skipped is 2 of 2', () => {
    const s = scoreDay(day('d', { breakfast: skipped, lunch: plate('fish'), dinner: plate('beef') }), rules());
    expect(s.status).toBe('on');
    expect(s.items.find((i) => i.key === 'breakfast')?.state).toBe('skipped');
  });

  it('a whole-food extra is just recorded — it never costs the day', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('fish'), dinner: plate('beef') }, [extra('x', 'fruit')]),
      rules()
    );
    expect(s.status).toBe('on');
    expect(s.passes).toBe(4);
  });
});

describe('scoreDay — in progress', () => {
  it('stays pending while a meal is unlogged and the misses hold', () => {
    const s = scoreDay(day('d', { breakfast: plate('eggs') }), rules());
    expect(s.status).toBe('pending');
    expect(s.pending).toBe(2);
    expect(s.complete).toBe(false);
  });

  it('turns off mid-day once the misses run out — the rest of the day can’t change it', () => {
    const s = scoreDay(day('d', { breakfast: plate('processed') }), rules());
    expect(s.status).toBe('off');
    expect(s.complete).toBe(false);
  });

  it('an untouched day is pending', () => {
    expect(scoreDay(undefined, rules()).status).toBe('pending');
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

describe('scoreDay — daily group goals', () => {
  const veggies2: GroupGoal = { id: 'g', group: 'veggies', count: 2, period: 'day' };
  const fishWeekly: GroupGoal = { id: 'w', group: 'fish', count: 2, period: 'week' };

  it('a daily goal must be met for the day to be on target', () => {
    const r = rules({ group_goals: [veggies2] });
    const short = scoreDay(day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef') }), r);
    expect(short.groupGoals[0]).toMatchObject({ have: 1, met: false });
    expect(short.status).toBe('off');

    const met = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef', 'veggies') }),
      r
    );
    expect(met.status).toBe('on');
  });

  it('a veggie snack counts toward the goal', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('veggies'), dinner: plate('beef') }, [extra('x', 'veggies')]),
      rules({ group_goals: [veggies2] })
    );
    expect(s.groupGoals[0].have).toBe(2);
  });

  it('weekly goals never decide a day', () => {
    const s = scoreDay(
      day('d', { breakfast: plate('eggs'), lunch: plate('beef'), dinner: plate('beef') }),
      rules({ group_goals: [fishWeekly] })
    );
    expect(s.groupGoals).toHaveLength(0);
    expect(s.status).toBe('on');
  });

  it('an unmet goal leaves an unfinished day pending, not off — dinner can still fix it', () => {
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
  const current = rules({ pass_goal: 2 });
  const old = rules({ pass_goal: 3 });

  it('today always uses the current settings', () => {
    expect(rulesForDay('2026-10-15', '2026-10-15', { rules: old }, current)).toBe(current);
  });

  it('a past day keeps the rules it was saved under, so editing settings never rescores it', () => {
    expect(rulesForDay('2026-10-14', '2026-10-15', { rules: old }, current)).toBe(old);
    expect(rulesForDay('2026-10-14', '2026-10-15', undefined, current)).toBe(current);
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

  it('counts plates passed so far, meals and extras, skipping skipped meals and the days ahead', () => {
    const w = summarizeWeek(today, days, rules());
    // Mon 2/3, Tue 2/3, Wed 2/3 (lunch + fruit extra pass, dinner fails), Thu 1/1.
    expect(w.scored).toBe(10);
    expect(w.passed).toBe(7);
    expect(w.days.filter((d) => d.future)).toHaveLength(3);
  });

  it('names the meal that slips most', () => {
    const w = summarizeWeek(today, days, rules());
    expect(w.slipping).toMatchObject({ slotId: 'lunch', fails: 2, logged: 3 });
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
  it('keeps the pass goal within the meals', () => {
    expect(clampPassGoal(5, 3)).toBe(3);
    expect(clampPassGoal(-1, 3)).toBe(0);
  });

  it('allowedMisses is meals minus the goal', () => {
    expect(allowedMisses({ slots: SLOTS, pass_goal: 2 })).toBe(1);
    expect(allowedMisses({ slots: SLOTS, pass_goal: 3 })).toBe(0);
  });

  it('adding a meal keeps "all of them" as all of them', () => {
    const next = addSlot({ slots: SLOTS, pass_goal: 3 }, { id: 'snack', name: 'Snack' });
    expect(next.slots).toHaveLength(4);
    expect(next.pass_goal).toBe(4);
  });

  it('adding a meal to a goal with misses to spare leaves the goal alone', () => {
    expect(addSlot({ slots: SLOTS, pass_goal: 2 }, { id: 'snack', name: 'Snack' }).pass_goal).toBe(2);
  });

  it('removing a meal pulls the goal down with it, and never removes the last meal', () => {
    expect(removeSlot({ slots: SLOTS, pass_goal: 3 }, 'lunch')).toMatchObject({ pass_goal: 2 });
    const one = { slots: [SLOTS[0]], pass_goal: 1 };
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
    expect(describeMealGoal({ slots: SLOTS, pass_goal: 2 })).toMatch(/hold 1 miss /);
  });
});

describe('plateVerdict', () => {
  it('says why a plate failed', () => {
    expect(plateVerdict(['processed', 'veggies'], false)).toEqual({
      result: 'fail',
      why: 'Something Processed was on the plate.',
    });
    expect(plateVerdict(['semi'], false).why).toBe('No whole food on the plate.');
    expect(plateVerdict(['eggs', 'semi'], true).why).toBe('Strict mode: whole food only.');
    expect(plateVerdict([], false).result).toBeNull();
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

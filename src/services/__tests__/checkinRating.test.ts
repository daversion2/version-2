import { asksStart, buildCheckinInput, checkinComplete, checkinModeFor } from '../checkinRating';

const TODAY = '2026-11-20';

describe('checkinModeFor', () => {
  it('asks only keep going when the start came back from Start', () => {
    expect(checkinModeFor('workouts', 3)).toBe('afterStart');
    expect(checkinModeFor('meditate', 1)).toBe('afterStart');
    // Even for a past day: the start was rated live.
    expect(checkinModeFor('workouts', 2, '2026-11-15', TODAY)).toBe('afterStart');
  });

  it('asks both, back to back, for Done it or a session from yesterday', () => {
    expect(checkinModeFor('workouts')).toBe('both');
    expect(checkinModeFor('meditate', 0)).toBe('both');
    expect(checkinModeFor('workouts', 7)).toBe('both');
    expect(checkinModeFor('workouts', undefined, TODAY, TODAY)).toBe('both');
    expect(checkinModeFor('workouts', undefined, '2026-11-19', TODAY)).toBe('both');
  });

  it('asks only keep going for a session logged more than a day late', () => {
    expect(checkinModeFor('workouts', undefined, '2026-11-18', TODAY)).toBe('late');
    expect(checkinModeFor('meditate', undefined, '2026-11-01', TODAY)).toBe('late');
  });

  it('asks Meals its one day rating whatever came back', () => {
    expect(checkinModeFor('meals')).toBe('meals');
    expect(checkinModeFor('meals', 2)).toBe('meals');
    expect(checkinModeFor('meals', undefined, '2026-11-01', TODAY)).toBe('meals');
  });

  it('asks the start on the sheet only when it has to', () => {
    expect(asksStart('both')).toBe(true);
    expect(asksStart('afterStart')).toBe(false);
    expect(asksStart('late')).toBe(false);
    expect(asksStart('meals')).toBe(false);
  });
});

describe('checkinComplete', () => {
  it('needs both session ratings, keep going alone when late, or the Meals day rating', () => {
    expect(checkinComplete('both', { override: 2 })).toBe(false);
    expect(checkinComplete('afterStart', { override: 2, keepGoing: 1 })).toBe(true);
    expect(checkinComplete('late', { keepGoing: 2 })).toBe(true);
    expect(checkinComplete('late', { override: 2 })).toBe(false);
    expect(checkinComplete('meals', { day: 3 })).toBe(true);
    expect(checkinComplete('meals', { override: 3 })).toBe(false);
  });
});

describe('buildCheckinInput', () => {
  it('keeps the start in resistance, marked as rated at the start, with keep going alongside', () => {
    const input = buildCheckinInput('afterStart', { override: 3, keepGoing: 1 }, { duration_min: 45 }, { duration_min: 45 });
    expect(input).toMatchObject({
      resistance: 3,
      difficulty: 'challenging',
      keep_going: 1,
      override_rated: 'start',
      metrics: { duration_min: 45 },
      logged_via: 'quick',
    });
  });

  it('marks a start given at the end as rated after', () => {
    const input = buildCheckinInput('both', { override: 1, keepGoing: 2 }, {}, {}, '2026-11-10');
    expect(input).toMatchObject({ resistance: 1, difficulty: 'easy', keep_going: 2, override_rated: 'after', date: '2026-11-10' });
  });

  it('saves a late session as keep going alone, with no start', () => {
    const input = buildCheckinInput('late', { keepGoing: 3 }, {}, {}, '2026-11-12');
    expect(input).toMatchObject({ keep_going: 3, difficulty: 'challenging', date: '2026-11-12' });
    expect('resistance' in input).toBe(false);
    expect(input.override_rated).toBeUndefined();
  });

  it('saves a Meals day as day_rating, with no override', () => {
    const input = buildCheckinInput('meals', { day: 2 }, {}, {});
    expect(input.day_rating).toBe(2);
    expect('resistance' in input).toBe(false);
    expect(input.keep_going).toBeUndefined();
    expect(input.override_rated).toBeUndefined();
  });
});

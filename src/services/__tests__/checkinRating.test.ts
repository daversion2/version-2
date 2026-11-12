import { buildCheckinInput, checkinComplete, checkinModeFor } from '../checkinRating';

describe('checkinModeFor', () => {
  it('asks only push when the override came back from Start', () => {
    expect(checkinModeFor('workouts', 3)).toBe('push');
    expect(checkinModeFor('meditate', 1)).toBe('push');
  });

  it('asks both, back to back, for Done it or a past session', () => {
    expect(checkinModeFor('workouts')).toBe('both');
    expect(checkinModeFor('meditate', 0)).toBe('both');
    expect(checkinModeFor('workouts', 7)).toBe('both');
  });

  it('asks Meals its one day rating whatever came back', () => {
    expect(checkinModeFor('meals')).toBe('meals');
    expect(checkinModeFor('meals', 2)).toBe('meals');
  });
});

describe('checkinComplete', () => {
  it('needs both session ratings, or the Meals day rating', () => {
    expect(checkinComplete('both', { override: 2 })).toBe(false);
    expect(checkinComplete('push', { override: 2, push: 1 })).toBe(true);
    expect(checkinComplete('meals', { day: 3 })).toBe(true);
    expect(checkinComplete('meals', { override: 3 })).toBe(false);
  });
});

describe('buildCheckinInput', () => {
  it('keeps the override in resistance, marked as rated at the start, with push alongside', () => {
    const input = buildCheckinInput('push', { override: 3, push: 1 }, { duration_min: 45 }, { duration_min: 45 });
    expect(input).toMatchObject({
      resistance: 3,
      difficulty: 'challenging',
      push: 1,
      override_rated: 'start',
      metrics: { duration_min: 45 },
      logged_via: 'quick',
    });
  });

  it('marks an override given at the end as rated after', () => {
    const input = buildCheckinInput('both', { override: 1, push: 2 }, {}, {}, '2026-11-10');
    expect(input).toMatchObject({ resistance: 1, difficulty: 'easy', push: 2, override_rated: 'after', date: '2026-11-10' });
  });

  it('saves a Meals day as day_rating, with no override', () => {
    const input = buildCheckinInput('meals', { day: 2 }, {}, {});
    expect(input.day_rating).toBe(2);
    expect('resistance' in input).toBe(false);
    expect(input.push).toBeUndefined();
    expect(input.override_rated).toBeUndefined();
  });
});

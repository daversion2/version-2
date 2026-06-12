import {
  buildUserFacts,
  conditionMet,
  daysBetween,
  frequencyAllows,
  renderTemplate,
  ruleMatches,
  selectFiringRules,
} from '../rulesEngine';
import { Rule, RuleState } from '../../types/rules';

const baseRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: 'r1',
  name: 'Test rule',
  enabled: true,
  surface: 'push',
  event: 'scheduled_hourly',
  conditions: [],
  frequency: { type: 'once_per_day' },
  priority: 0,
  content: { title: 'T', body: 'B' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('conditionMet', () => {
  it('evaluates each operator', () => {
    const facts = { current_streak: 5 };
    expect(conditionMet({ fact: 'current_streak', op: '==', value: 5 }, facts)).toBe(true);
    expect(conditionMet({ fact: 'current_streak', op: '!=', value: 5 }, facts)).toBe(false);
    expect(conditionMet({ fact: 'current_streak', op: '>', value: 4 }, facts)).toBe(true);
    expect(conditionMet({ fact: 'current_streak', op: '>=', value: 5 }, facts)).toBe(true);
    expect(conditionMet({ fact: 'current_streak', op: '<', value: 5 }, facts)).toBe(false);
    expect(conditionMet({ fact: 'current_streak', op: '<=', value: 5 }, facts)).toBe(true);
  });

  it('fails closed when the fact is missing', () => {
    expect(conditionMet({ fact: 'local_hour', op: '>=', value: 0 }, {})).toBe(false);
  });
});

describe('ruleMatches', () => {
  it('requires all conditions (AND)', () => {
    const rule = baseRule({
      conditions: [
        { fact: 'days_since_last_activity', op: '>=', value: 2 },
        { fact: 'local_hour', op: '==', value: 18 },
      ],
    });
    expect(ruleMatches(rule, { days_since_last_activity: 3, local_hour: 18 })).toBe(true);
    expect(ruleMatches(rule, { days_since_last_activity: 3, local_hour: 9 })).toBe(false);
    expect(ruleMatches(rule, { days_since_last_activity: 1, local_hour: 18 })).toBe(false);
  });

  it('matches with no conditions and never matches when disabled', () => {
    expect(ruleMatches(baseRule(), {})).toBe(true);
    expect(ruleMatches(baseRule({ enabled: false }), {})).toBe(false);
  });
});

describe('frequencyAllows', () => {
  const now = '2026-06-10T18:00:00.000Z';
  const today = '2026-06-10';
  const state = (lastFiredAt: string, lastFiredDate: string): RuleState => ({
    rule_id: 'r1',
    last_fired_at: lastFiredAt,
    last_fired_date: lastFiredDate,
    fire_count: 1,
  });

  it('always allows when never fired', () => {
    expect(frequencyAllows(baseRule({ frequency: { type: 'once_ever' } }), null, now, today)).toBe(true);
  });

  it('once_ever blocks any second fire', () => {
    const rule = baseRule({ frequency: { type: 'once_ever' } });
    expect(frequencyAllows(rule, state('2026-01-01T00:00:00.000Z', '2026-01-01'), now, today)).toBe(false);
  });

  it('once_per_day blocks same-day, allows next day', () => {
    const rule = baseRule({ frequency: { type: 'once_per_day' } });
    expect(frequencyAllows(rule, state('2026-06-10T08:00:00.000Z', '2026-06-10'), now, today)).toBe(false);
    expect(frequencyAllows(rule, state('2026-06-09T08:00:00.000Z', '2026-06-09'), now, today)).toBe(true);
  });

  it('cooldown_hours respects the window', () => {
    const rule = baseRule({ frequency: { type: 'cooldown_hours', hours: 72 } });
    expect(frequencyAllows(rule, state('2026-06-08T18:00:00.000Z', '2026-06-08'), now, today)).toBe(false); // 48h
    expect(frequencyAllows(rule, state('2026-06-07T18:00:00.000Z', '2026-06-07'), now, today)).toBe(true); // 72h
  });
});

describe('daysBetween / buildUserFacts', () => {
  it('computes day gaps', () => {
    expect(daysBetween('2026-06-10', '2026-06-08')).toBe(2);
    expect(daysBetween('2026-06-10', '2026-06-10')).toBe(0);
  });

  it('derives facts from a user document', () => {
    const facts = buildUserFacts(
      {
        lastActivityDate: '2026-06-07',
        currentStreak: 0,
        totalWillpowerPoints: 120,
        totalHabitsCompleted: 9,
        app_open_count: 14,
        created_at: '2026-05-01T12:00:00.000Z',
      },
      '2026-06-10',
      18
    );
    expect(facts.days_since_last_activity).toBe(3);
    expect(facts.current_streak).toBe(0);
    expect(facts.total_willpower_points).toBe(120);
    expect(facts.total_habits_completed).toBe(9);
    expect(facts.app_open_count).toBe(14);
    expect(facts.days_since_signup).toBe(40);
    expect(facts.local_hour).toBe(18);
  });

  it('falls back to signup date so new users are not treated as dormant', () => {
    const facts = buildUserFacts({ created_at: '2026-06-10T08:00:00.000Z' }, '2026-06-10', 9);
    expect(facts.days_since_last_activity).toBe(0);
  });
});

describe('selectFiringRules', () => {
  it('filters by match + frequency and orders by priority', () => {
    const comeback = baseRule({
      id: 'comeback',
      priority: 10,
      conditions: [{ fact: 'days_since_last_activity', op: '>=', value: 2 }],
    });
    const lowPriority = baseRule({ id: 'low', priority: 1 });
    const alreadyFired = baseRule({ id: 'fired', frequency: { type: 'once_ever' } });
    const noMatch = baseRule({
      id: 'nomatch',
      conditions: [{ fact: 'current_streak', op: '>=', value: 100 }],
    });

    const states: Record<string, RuleState | null> = {
      fired: { rule_id: 'fired', last_fired_at: '2026-06-01T00:00:00.000Z', last_fired_date: '2026-06-01', fire_count: 1 },
    };
    const result = selectFiringRules(
      [lowPriority, comeback, alreadyFired, noMatch],
      { days_since_last_activity: 3, current_streak: 0 },
      (id) => states[id] ?? null,
      '2026-06-10T18:00:00.000Z',
      '2026-06-10'
    );
    expect(result.map((r) => r.id)).toEqual(['comeback', 'low']);
  });
});

describe('renderTemplate', () => {
  it('replaces known placeholders', () => {
    expect(
      renderTemplate('{username} just completed a {activity_type}!', {
        username: 'Alex',
        activity_type: 'challenge',
      })
    ).toBe('Alex just completed a challenge!');
  });

  it('leaves unknown placeholders literal so admin typos are visible', () => {
    expect(renderTemplate('Hi {usernme}', { username: 'Alex' })).toBe('Hi {usernme}');
  });

  it('replaces repeated placeholders and handles empty vars', () => {
    expect(renderTemplate('{a} and {a}', { a: 'x' })).toBe('x and x');
    expect(renderTemplate('No placeholders here', {})).toBe('No placeholders here');
  });

  it('substitutes empty-string values rather than treating them as missing', () => {
    expect(renderTemplate('[{name}]', { name: '' })).toBe('[]');
  });
});

describe('global placeholders', () => {
  const { referencedGlobalKeys, resolveUserGlobals, truncateForPush } = require('../rulesEngine');

  it('detects which globals a rule references', () => {
    expect(
      referencedGlobalKeys({ title: 'Hey {username}', body: 'Tip: {tidbit} ({streak} days)' })
    ).toEqual(['username', 'streak', 'tidbit']);
    expect(referencedGlobalKeys({ title: 'Plain', body: 'No tokens' })).toEqual([]);
  });

  it('resolves user-document globals and reports missing ones', () => {
    const { vars, missing } = resolveUserGlobals(
      ['username', 'why_statement', 'streak', 'xp'],
      { username: 'Alex', currentStreak: 4, totalWillpowerPoints: 120 }
    );
    expect(vars).toEqual({ username: 'Alex', streak: '4', xp: '120' });
    expect(missing).toEqual(['why_statement']);
  });

  it('treats numeric zero as a value, not missing', () => {
    const { vars, missing } = resolveUserGlobals(['streak', 'xp'], {});
    expect(vars).toEqual({ streak: '0', xp: '0' });
    expect(missing).toEqual([]);
  });

  it('resolves the active mantra, falling back to first then legacy field', () => {
    const mantras = [
      { id: 'a', text: 'First mantra' },
      { id: 'b', text: 'Active mantra' },
    ];
    expect(resolveUserGlobals(['mantra'], { mantras, active_mantra_id: 'b' }).vars.mantra).toBe(
      'Active mantra'
    );
    expect(resolveUserGlobals(['mantra'], { mantras }).vars.mantra).toBe('First mantra');
    expect(resolveUserGlobals(['mantra'], { redirect_mantra: 'Legacy' }).vars.mantra).toBe('Legacy');
    expect(resolveUserGlobals(['mantra'], {}).missing).toEqual(['mantra']);
  });

  it('truncates long pool content for pushes', () => {
    expect(truncateForPush('short')).toBe('short');
    const long = 'x'.repeat(200);
    expect(truncateForPush(long).length).toBe(120);
    expect(truncateForPush(long).endsWith('...')).toBe(true);
  });
});

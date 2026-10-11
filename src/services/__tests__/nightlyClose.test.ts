import {
  pickWin,
  isBadDay,
  rankPlanCandidates,
  draftPlan,
  planFromReflection,
  isPlanDone,
  formatPlan,
  loadNightlyClose,
  getPlanForToday,
} from '../nightlyClose';
import { CompletionLog, DailyReflection, PracticeInstance } from '../../types';
import { addMockDocument, resetMockDB } from '../__mocks__/firestore';

// 2026-10-14 is a Wednesday; tomorrow (10-15) a Thursday (weekday 4).
const TODAY = '2026-10-14';
const TOMORROW = '2026-10-15';

const habit = (id: string, over: Partial<PracticeInstance> = {}): PracticeInstance =>
  ({
    id,
    user_id: 'u1',
    name: id,
    is_active: true,
    created_by_user: false,
    target_count_per_week: 3,
    ...over,
  }) as PracticeInstance;

const log = (habitId: string, over: Partial<CompletionLog> = {}): CompletionLog =>
  ({
    id: `${habitId}-${over.date ?? TODAY}-${over.completed_at ?? ''}`,
    user_id: 'u1',
    type: 'nudge',
    reference_id: habitId,
    points: 1,
    difficulty: 1,
    resistance: 2,
    resistance_scale: 3,
    date: TODAY,
    ...over,
  }) as CompletionLog;

const byId = (...hs: PracticeInstance[]) => Object.fromEntries(hs.map((h) => [h.id, h]));

describe('pickWin', () => {
  it('names the most recent habit rated Hard', () => {
    const workout = habit('workout', { name: 'Workout' });
    const read = habit('read', { name: 'Read' });
    const win = pickWin(
      [
        log('workout', { resistance: 3, completed_at: '2026-10-14T07:00:00Z' }),
        log('read', { resistance: 3, completed_at: '2026-10-14T21:00:00Z' }),
      ],
      byId(workout, read)
    );
    expect(win).toEqual({ kind: 'hard', habitName: 'Read' });
  });

  it('reads Hard through the legacy 1–10 scale too', () => {
    const win = pickWin([log('w', { resistance: 9, resistance_scale: 10 })], byId(habit('w', { name: 'W' })));
    expect(win).toEqual({ kind: 'hard', habitName: 'W' });
  });

  it('falls back to a count of distinct habits when nothing was hard', () => {
    const win = pickWin(
      [log('a', { resistance: 1 }), log('a', { resistance: 2 }), log('b', { resistance: 2 })],
      byId(habit('a'), habit('b'))
    );
    expect(win).toEqual({ kind: 'logged', count: 2 });
  });

  it('ignores logs for habits no longer on Home', () => {
    expect(pickWin([log('gone', { resistance: 3 })], byId(habit('a')))).toBeNull();
  });

  it('has nothing to say on an empty day', () => {
    expect(pickWin([], byId(habit('a')))).toBeNull();
  });
});

describe('isBadDay', () => {
  it('is a bad day on a D or F whatever was logged', () => {
    expect(isBadDay({ grade: 'D', loggedToday: 3, missedScheduledToday: 0 })).toBe(true);
    expect(isBadDay({ grade: 'F', loggedToday: 3, missedScheduledToday: 0 })).toBe(true);
  });

  it('is a bad day when nothing was logged and a pinned habit was due', () => {
    expect(isBadDay({ grade: null, loggedToday: 0, missedScheduledToday: 1 })).toBe(true);
  });

  it('is not a bad day just because a flexible habit was skipped', () => {
    // Count habits can't be missed on a given day — a rest day is legitimate.
    expect(isBadDay({ grade: null, loggedToday: 0, missedScheduledToday: 0 })).toBe(false);
  });

  it('lets a good grade override the missed-habit rule', () => {
    expect(isBadDay({ grade: 'B', loggedToday: 0, missedScheduledToday: 2 })).toBe(false);
  });
});

describe('rankPlanCandidates', () => {
  it('puts the habit with the highest recent resistance first', () => {
    const easy = habit('easy');
    const hard = habit('hard');
    const ranked = rankPlanCandidates(
      [easy, hard],
      [log('easy', { resistance: 1 }), log('hard', { resistance: 3 }), log('hard', { resistance: 2 })],
      TOMORROW
    );
    expect(ranked.map((h) => h.id)).toEqual(['hard', 'easy']);
  });

  it('only offers habits due tomorrow', () => {
    const mondays = habit('mondays', { scheduled_days: [1] });
    const thursdays = habit('thursdays', { scheduled_days: [4] });
    const flexible = habit('flexible');
    const ids = rankPlanCandidates([mondays, thursdays, flexible], [], TOMORROW).map((h) => h.id);
    expect(ids).toContain('thursdays');
    expect(ids).toContain('flexible');
    expect(ids).not.toContain('mondays');
  });

  it('skips archived and inactive habits', () => {
    const ids = rankPlanCandidates(
      [habit('archived', { archived_at: '2026-10-01T00:00:00Z' }), habit('off', { is_active: false }), habit('on')],
      [],
      TOMORROW
    ).map((h) => h.id);
    expect(ids).toEqual(['on']);
  });

  it('uses the onboarding prediction for a habit with no ratings yet', () => {
    const predicted = habit('predicted', { expected_resistance: 3, expected_resistance_scale: 3 });
    const rated = habit('rated');
    const ranked = rankPlanCandidates([rated, predicted], [log('rated', { resistance: 2 })], TOMORROW);
    expect(ranked[0].id).toBe('predicted');
  });

  it('breaks a tie in favour of the habit pinned to that day', () => {
    const flexible = habit('a-flexible');
    const pinned = habit('b-pinned', { scheduled_days: [4] });
    expect(rankPlanCandidates([flexible, pinned], [], TOMORROW)[0].id).toBe('b-pinned');
  });
});

describe('draftPlan', () => {
  const workout = habit('workout', {
    name: 'Workout',
    action_plan: { anchor: 'finish work for the day', minimum_version: 'One hard set' },
  });

  it('turns the anchor into a cue and aims at the habit itself', () => {
    expect(draftPlan(workout, false)).toEqual({
      habitId: 'workout',
      cue: 'I finish work for the day',
      response: 'Workout',
    });
  });

  it('aims at the minimum version on a bad day', () => {
    expect(draftPlan(workout, true).response).toBe('One hard set');
  });

  it('keeps the full habit on a bad day when there is no minimum version', () => {
    expect(draftPlan(habit('x', { name: 'Read' }), true).response).toBe('Read');
  });

  it('does not double the "I" on an anchor that already has one', () => {
    const h = habit('x', { action_plan: { anchor: 'I get home' } });
    expect(draftPlan(h, false).cue).toBe('I get home');
  });

  it('falls back to a legacy free-text cue', () => {
    const h = habit('x', { action_plan: { cue: 'after lunch at my desk' } });
    expect(draftPlan(h, false).cue).toBe('after lunch at my desk');
  });

  it('is blank when there is no habit to plan', () => {
    expect(draftPlan(undefined, false)).toEqual({ cue: '', response: '' });
  });
});

describe('planFromReflection / isPlanDone', () => {
  const reflection = (over: Partial<DailyReflection>): DailyReflection =>
    ({ id: TODAY, user_id: 'u1', date: TODAY, grade: 'B', daily_summary: {}, created_at: '', ...over }) as DailyReflection;

  it('reads the saved plan back', () => {
    expect(
      planFromReflection(
        reflection({ prompt_ifthen_cue: 'I get home', prompt_ifthen_response: 'Workout', plan_habit_id: 'w' })
      )
    ).toEqual({ habitId: 'w', cue: 'I get home', response: 'Workout' });
  });

  it('has no plan when both halves are blank', () => {
    expect(planFromReflection(reflection({ prompt_ifthen_cue: '  ' }))).toBeNull();
    expect(planFromReflection(null)).toBeNull();
  });

  it('is done once the planned habit is logged that day, not on another day', () => {
    const plan = { habitId: 'w', cue: '', response: '' };
    expect(isPlanDone(plan, [log('w', { date: TOMORROW })], TOMORROW)).toBe(true);
    expect(isPlanDone(plan, [log('w', { date: TODAY })], TOMORROW)).toBe(false);
  });

  it('never auto-completes a typed plan with no habit behind it', () => {
    expect(isPlanDone({ cue: 'x', response: 'y' }, [log('w', { date: TOMORROW })], TOMORROW)).toBe(false);
  });
});

describe('formatPlan', () => {
  it('reads as one sentence, and copes with either half missing', () => {
    expect(formatPlan({ cue: 'I get home', response: 'Workout' })).toBe('When I get home, then Workout.');
    expect(formatPlan({ cue: 'I get home', response: ' ' })).toBe('When I get home.');
    expect(formatPlan({ response: 'Workout' })).toBe('Workout');
  });
});

describe('loadNightlyClose', () => {
  beforeEach(() => resetMockDB());

  it('assembles the win, the bad-day inputs and tomorrow\'s candidates', async () => {
    addMockDocument('users/u1/habits', 'workout', {
      ...habit('workout', { name: 'Workout', scheduled_days: [3, 4] }),
    });
    addMockDocument('users/u1/habits', 'read', { ...habit('read', { name: 'Read', scheduled_days: [3] }) });
    addMockDocument('users/u1/completionLogs', 'l1', log('workout', { resistance: 3 }));
    // Too old to count toward resistance or today.
    addMockDocument('users/u1/completionLogs', 'l0', log('read', { date: '2026-09-01', resistance: 3 }));

    const data = await loadNightlyClose('u1', TODAY);
    expect(data.win).toEqual({ kind: 'hard', habitName: 'Workout' });
    expect(data.loggedToday).toBe(1);
    expect(data.missedScheduledToday).toBe(1); // Read was due Wednesday
    expect(data.planCandidates.map((h) => h.id)).toEqual(['workout']); // Read isn't due Thursday
  });
});

describe('getPlanForToday', () => {
  beforeEach(() => resetMockDB());

  it("reads yesterday evening's plan", async () => {
    addMockDocument('users/u1/reflections', '2026-10-13', {
      date: '2026-10-13',
      grade: 'B',
      prompt_ifthen_cue: 'I get home',
      prompt_ifthen_response: 'Workout',
      plan_habit_id: 'workout',
    });
    expect(await getPlanForToday('u1', TODAY)).toEqual({
      habitId: 'workout',
      cue: 'I get home',
      response: 'Workout',
    });
  });

  it('is null when there was no reflection', async () => {
    expect(await getPlanForToday('u1', TODAY)).toBeNull();
  });
});

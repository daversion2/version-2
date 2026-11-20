import {
  deletePainDay,
  getPainPrefs,
  listPainDays,
  listPainPlans,
  newPainPlanId,
  savePainDay,
  savePainPlan,
  savePainPrefs,
} from '../labPain';
import { getMockDB, resetMockDB } from '../__mocks__/firestore';
import { newPlan, recordRetest } from '../painMath';
import type { PainDay } from '../../types/pain';

const base = 'users/u1';

beforeEach(() => resetMockDB());

describe('labPain prefs', () => {
  it('defaults, then keeps what was saved', async () => {
    expect(await getPainPrefs('u1')).toEqual({ weekly_goal: 5 });
    await savePainPrefs('u1', { weekly_goal: 4 });
    expect(getMockDB()[`${base}/lab_pain_prefs`].main.data).toEqual({ weekly_goal: 4 });
    expect(await getPainPrefs('u1')).toEqual({ weekly_goal: 4 });
  });
});

describe('labPain days', () => {
  const day = (date: string, extra: Partial<PainDay> = {}): PainDay => ({
    date,
    pain: 4,
    done: [],
    logged_at: `${date}T20:00:00.000Z`,
    ...extra,
  });

  it('keys by date, so a second check-in overwrites, and deletes', async () => {
    await savePainDay('u1', day('2026-11-19'));
    await savePainDay('u1', day('2026-11-20', { resistance: undefined }));
    await savePainDay('u1', day('2026-11-20', { pain: 6, done: ['walk'], resistance: 2, resistance_scale: 3 }));
    const listed = await listPainDays('u1');
    expect(listed.sort((a, b) => a.date.localeCompare(b.date))).toEqual([
      day('2026-11-19'),
      day('2026-11-20', { pain: 6, done: ['walk'], resistance: 2, resistance_scale: 3 }),
    ]);

    await deletePainDay('u1', '2026-11-19');
    expect((await listPainDays('u1')).map((d) => d.date)).toEqual(['2026-11-20']);
  });
});

describe('labPain plans', () => {
  it('saves a plan and its retest over the same doc', async () => {
    const id = newPainPlanId('u1');
    expect(id).not.toEqual(newPainPlanId('u1'));
    const plan = newPlan({
      id,
      onset: 'long',
      items: ['walk'],
      weeks: 3,
      today: '2026-11-09',
      baseline: { pain_week: 5, activities: [] },
      now: new Date('2026-11-09T20:00:00.000Z'),
    });
    await savePainPlan('u1', plan);
    // Optional fields left unset aren't written as undefined.
    expect(getMockDB()[`${base}/lab_pain_plans`][id].data).not.toHaveProperty('previous_plan_id');

    const retested = recordRetest(plan, { pain_week: 3, scores: [] }, '2026-11-30', new Date('2026-11-30T20:00:00.000Z'));
    await savePainPlan('u1', retested);
    expect(await listPainPlans('u1')).toEqual([retested]);
  });
});

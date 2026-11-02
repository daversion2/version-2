import {
  deleteHotColdSession,
  getHotColdPrefs,
  listHotColdSessions,
  newHotColdId,
  saveHotColdPrefs,
  saveHotColdSession,
} from '../labHotCold';
import { getMockDB } from '../__mocks__/firestore';
import type { HotColdSession } from '../../types/hotcold';

const base = 'users/u1';

const session = (id: string, date: string, extra: Partial<HotColdSession> = {}): HotColdSession => ({
  id,
  kind: 'cold',
  date,
  logged_at: `${date}T08:00:00.000Z`,
  duration_sec: 120,
  temp_c: 10,
  ...extra,
});

describe('labHotCold prefs', () => {
  it('defaults, with the unit from the phone’s region', async () => {
    expect(await getHotColdPrefs('u1', 'en-US')).toEqual({ unit: 'F', weekly_goal: 3, cold_target_sec: 120 });
    expect((await getHotColdPrefs('u1', 'en-GB')).unit).toBe('C');
  });

  it('keeps a saved unit whatever the region', async () => {
    await saveHotColdPrefs('u1', { unit: 'C', weekly_goal: undefined });
    await saveHotColdPrefs('u1', { weekly_goal: 4 });
    expect(getMockDB()[`${base}/lab_hotcold_prefs`].main.data).toEqual({ unit: 'C', weekly_goal: 4 });
    expect(await getHotColdPrefs('u1', 'en-US')).toEqual({ unit: 'C', weekly_goal: 4, cold_target_sec: 120 });
  });
});

describe('labHotCold sessions', () => {
  it('saves by id, lists from a date, and deletes', async () => {
    await saveHotColdSession('u1', session('a', '2026-10-01'));
    await saveHotColdSession('u1', session('b', '2026-10-30', { resistance: 2, resistance_scale: 3, timed: undefined }));
    await saveHotColdSession('u1', session('b', '2026-10-30', { duration_sec: 150 })); // an edit
    const listed = await listHotColdSessions('u1', '2026-10-15');
    expect(listed).toEqual([session('b', '2026-10-30', { duration_sec: 150 })]);

    // No date: every session, for records and the streak.
    expect((await listHotColdSessions('u1')).map((x) => x.id).sort()).toEqual(['a', 'b']);

    await deleteHotColdSession('u1', 'b');
    expect(await listHotColdSessions('u1', '2026-01-01')).toEqual([session('a', '2026-10-01')]);
  });

  it('makes fresh ids', () => {
    expect(newHotColdId('u1')).not.toEqual(newHotColdId('u1'));
  });
});

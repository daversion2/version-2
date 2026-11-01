import {
  deleteAvoidanceTask,
  getAvoidancePrefs,
  listAvoidanceTasks,
  newAvoidanceId,
  saveAvoidancePrefs,
  saveAvoidanceTask,
  saveAvoidanceTasks,
} from '../labAvoidance';
import { getMockDB } from '../__mocks__/firestore';
import type { AvoidanceTask } from '../../types/avoidance';

const base = 'users/u1';

const task = (id: string, extra: Partial<AvoidanceTask> = {}): AvoidanceTask => ({
  id,
  text: `Task ${id}`,
  created_at: '2026-10-01T09:00:00.000Z',
  created_date: '2026-10-01',
  status: 'open',
  ...extra,
});

describe('labAvoidance prefs', () => {
  it('defaults, then merges changes into the one prefs doc', async () => {
    expect(await getAvoidancePrefs('u1')).toEqual({ weekly_goal: 3 });
    await saveAvoidancePrefs('u1', { weekly_goal: 5 });
    expect(getMockDB()[`${base}/lab_avoidance_prefs`].main.data).toEqual({ weekly_goal: 5 });
    expect(await getAvoidancePrefs('u1')).toEqual({ weekly_goal: 5 });
  });
});

describe('labAvoidance tasks', () => {
  it('saves by id, overwrites on edit, lists and deletes', async () => {
    await saveAvoidanceTask('u1', task('a', { forecast: 3 }));
    await saveAvoidanceTask('u1', task('a', { status: 'done', done_date: '2026-10-05', resistance: 1, resistance_scale: 3 }));
    // The edit replaced the doc: the forecast it no longer carries is gone.
    expect(await listAvoidanceTasks('u1')).toEqual([
      task('a', { status: 'done', done_date: '2026-10-05', resistance: 1, resistance_scale: 3 }),
    ]);
    await deleteAvoidanceTask('u1', 'a');
    expect(await listAvoidanceTasks('u1')).toEqual([]);
  });

  it('saves several at once', async () => {
    await saveAvoidanceTasks('u1', [task('x', { imported_from: 'o1' }), task('y', { forecast: undefined })]);
    expect((await listAvoidanceTasks('u1')).map((t) => t.id).sort()).toEqual(['x', 'y']);
  });

  it('makes fresh ids', () => {
    expect(newAvoidanceId('u1')).not.toEqual(newAvoidanceId('u1'));
  });
});

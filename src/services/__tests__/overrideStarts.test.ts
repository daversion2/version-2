import { abandonedStart, recordAbandonedStart } from '../overrideStarts';
import { getMockDB, resetMockDB } from '../__mocks__/firestore';

describe('abandonedStart', () => {
  const now = new Date('2026-11-11T18:00:00.000Z');

  it('keeps a discarded session’s override', () => {
    const start = abandonedStart('workouts', { id: 's1', override: 3, startedAt: '2026-11-11T17:00:00.000Z' }, now);
    expect(start).toMatchObject({
      app_id: 'workouts',
      session_id: 's1',
      resistance: 3,
      started_at: '2026-11-11T17:00:00.000Z',
      discarded_at: now.toISOString(),
    });
    expect(start?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps nothing for a session started without one', () => {
    expect(abandonedStart('meditate', { id: 's2', startedAt: now.toISOString() }, now)).toBeNull();
  });
});

describe('recordAbandonedStart', () => {
  beforeEach(() => resetMockDB());

  it('writes one doc per session under the user', async () => {
    await recordAbandonedStart('u1', 'workouts', { id: 's1', override: 2, startedAt: '2026-11-11T17:00:00.000Z' });
    const docs = getMockDB()['users/u1/overrideStarts'] ?? {};
    expect(Object.keys(docs)).toEqual(['s1']);
    expect((docs as any).s1.data.resistance).toBe(2);
  });

  it('writes nothing without a session or an override', async () => {
    await recordAbandonedStart('u1', 'workouts', null);
    await recordAbandonedStart('u1', 'workouts', { id: 's1', startedAt: '2026-11-11T17:00:00.000Z' });
    expect(getMockDB()['users/u1/overrideStarts']).toBeUndefined();
  });
});

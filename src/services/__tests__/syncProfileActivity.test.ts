import { syncProfileActivity } from '../appActivity';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';

describe('syncProfileActivity', () => {
  const userId = 'u1';
  const TODAY = '2026-10-24';
  const userDoc = () => getMockDB().users?.[userId]?.data;
  const activity = (activeDays: string[], over = {}) => ({
    activeDays,
    sessionsCompleted: 3,
    appsTried: 1,
    appsActive: 1,
    ...over,
  });

  beforeEach(() => resetMockDB());

  it('corrects past days from the doc as it is now', async () => {
    addMockDocument('users', userId, { currentStreak: 9, lastActivityDate: '2026-10-23', totalWillpowerPoints: 50 });
    const wrote = await syncProfileActivity(userId, activity(['2026-10-22', '2026-10-23']), TODAY);
    expect(wrote).toBe(true);
    expect(userDoc()).toMatchObject({
      currentStreak: 2,
      lastActivityDate: '2026-10-23',
      sessions_completed: 3,
      apps_tried: 1,
      apps_active: 1,
      totalWillpowerPoints: 50,
    });
  });

  it("never undoes a streak a rating has already stamped today", async () => {
    // The doc says rated today, streak 4 — even if Today's own copy is older.
    addMockDocument('users', userId, {
      currentStreak: 4,
      lastActivityDate: TODAY,
      sessions_completed: 3,
      apps_tried: 1,
      apps_active: 1,
    });
    const wrote = await syncProfileActivity(userId, activity(['2026-10-20']), TODAY);
    expect(wrote).toBe(false);
    expect(userDoc()).toMatchObject({ currentStreak: 4, lastActivityDate: TODAY });
  });

  it('writes nothing when the doc already agrees', async () => {
    addMockDocument('users', userId, {
      currentStreak: 1,
      lastActivityDate: '2026-10-23',
      sessions_completed: 3,
      apps_tried: 1,
      apps_active: 1,
    });
    expect(await syncProfileActivity(userId, activity(['2026-10-23']), TODAY)).toBe(false);
  });
});

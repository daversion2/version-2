import { rateAppSession } from '../appRatings';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';
import { getTodayString } from '../../utils/date';

describe('rateAppSession', () => {
  const userId = 'test-user-123';
  const logs = () => Object.values(getMockDB()[`users/${userId}/completionLogs`] || {}).map((d: any) => d.data);

  beforeEach(() => {
    resetMockDB();
    addMockDocument('users', userId, {
      totalWillpowerPoints: 0,
      totalHabitsCompleted: 0,
      practices_tried: 0,
      currentStreak: 0,
      lastActivityDate: null,
    });
  });

  it('files the rating under the app, linked to its session', async () => {
    await rateAppSession(userId, 'meditate', { difficulty: 'challenging', resistance: 2, sessionId: 'sess-1' });
    const [log] = logs();
    expect(log.reference_id).toBe('app:meditate');
    expect(log.app_id).toBe('meditate');
    expect(log.session_id).toBe('sess-1');
    expect(log.resistance).toBe(2);
    expect(log.date).toBe(getTodayString());
  });

  it('writes one log and no mirror onto a habit', async () => {
    addMockDocument(`users/${userId}/habits`, 'h-meditation', {
      name: 'Meditation',
      practice_id: 'meditation',
      is_active: true,
    });
    await rateAppSession(userId, 'meditate', { difficulty: 'easy', resistance: 1, sessionId: 'sess-1' });
    expect(logs()).toHaveLength(1);
    expect(logs().some((l: any) => l.mirror_of)).toBe(false);
  });

  it('leaves session_id off a rating with no session doc', async () => {
    await rateAppSession(userId, 'workouts', { difficulty: 'easy', resistance: 1 });
    const [log] = logs();
    expect(log.app_id).toBe('workouts');
    expect('session_id' in log).toBe(false);
  });

  it('earns XP from the rating', async () => {
    const result = await rateAppSession(userId, 'meals', { difficulty: 'challenging', resistance: 3 });
    expect(result.pointsEarned).toBe(3);
  });
});

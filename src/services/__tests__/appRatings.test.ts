import { rateAppSession } from '../appRatings';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';
import { getTodayString, toLocalDateString } from '../../utils/date';
import { limit, runTransaction } from 'firebase/firestore';

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

  it('saves push and when the override was given alongside it', async () => {
    await rateAppSession(userId, 'workouts', {
      difficulty: 'challenging',
      resistance: 3,
      push: 1,
      override_rated: 'start',
      sessionId: 'sess-2',
    });
    const [log] = logs();
    expect(log).toMatchObject({ resistance: 3, push: 1, override_rated: 'start', difficulty: 2 });
  });

  it('saves a Meals day rating unrated for the override, and earns its XP', async () => {
    const result = await rateAppSession(userId, 'meals', { difficulty: 'challenging', day_rating: 3 });
    const [log] = logs();
    expect(log.day_rating).toBe(3);
    expect(log.difficulty).toBe(0);
    expect('resistance' in log).toBe(false);
    expect(result.pointsEarned).toBe(3);
  });

  it('earns XP from the rating', async () => {
    const result = await rateAppSession(userId, 'meals', { difficulty: 'challenging', resistance: 3 });
    expect(result.pointsEarned).toBe(3);
  });
});

describe('rateAppSession is safe to retry', () => {
  const userId = 'test-user-123';
  const logs = () => Object.values(getMockDB()[`users/${userId}/completionLogs`] || {}).map((d: any) => d.data);
  const userDoc = () => getMockDB().users?.[userId]?.data;

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
    addMockDocument('users', userId, {
      totalWillpowerPoints: 10,
      totalHabitsCompleted: 0,
      practices_tried: 0,
      currentStreak: 0,
      lastActivityDate: null,
    });
  });

  it('rates a session once, however many times it is sent', async () => {
    const first = await rateAppSession(userId, 'meditate', { difficulty: 'challenging', resistance: 2, sessionId: 'sess-1' });
    const again = await rateAppSession(userId, 'meditate', { difficulty: 'challenging', resistance: 2, sessionId: 'sess-1' });
    expect(logs()).toHaveLength(1);
    expect(again.logId).toBe(first.logId);
    expect(userDoc().totalWillpowerPoints).toBe(12);
    expect(userDoc().totalHabitsCompleted).toBe(1);
  });

  it('still logs separate sessions separately', async () => {
    await rateAppSession(userId, 'meditate', { difficulty: 'easy', resistance: 1, sessionId: 'sess-1' });
    await rateAppSession(userId, 'meditate', { difficulty: 'easy', resistance: 1, sessionId: 'sess-2' });
    expect(logs()).toHaveLength(2);
  });

  it('reports success once the log is saved, even if the XP write fails', async () => {
    (runTransaction as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await rateAppSession(userId, 'workouts', { difficulty: 'easy', resistance: 1, sessionId: 'w-1' });
    spy.mockRestore();
    expect(logs()).toHaveLength(1);
    expect(result.logId).toBe('workouts_w-1');
    expect(result.willpower.newTierReached).toBe(false);
  });

  it('counts a first try once, from a single-doc read', async () => {
    await rateAppSession(userId, 'meals', { difficulty: 'easy', resistance: 1 });
    await rateAppSession(userId, 'meals', { difficulty: 'easy', resistance: 1 });
    expect(userDoc().practices_tried).toBe(1);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it('leaves the stored streak alone for a backdated rating', async () => {
    // Today's syncProfileActivity owns it: recalculating from rated logs only
    // would undo what it counted from the sessions themselves.
    addMockDocument('users', userId, {
      totalWillpowerPoints: 10,
      currentStreak: 4,
      lastActivityDate: getTodayString(),
    });
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const date = toLocalDateString(d);
    const result = await rateAppSession(userId, 'meditate', { difficulty: 'easy', resistance: 1, date, sessionId: 's-old' });
    expect(result.backdated).toBe(true);
    expect(userDoc().currentStreak).toBe(4);
    expect(userDoc().lastActivityDate).toBe(getTodayString());
    expect(userDoc().totalWillpowerPoints).toBe(11);
  });
});

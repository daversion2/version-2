import { removeRating, removeSessionRatings, updateRatedMinutes, updateSessionRatingMinutes } from '../appRatingEdits';
import { deleteCompletionLog } from '../progress';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';

jest.mock('../progress', () => ({ deleteCompletionLog: jest.fn(async () => ({ pointsRemoved: 0 })) }));

const path = 'users/u1/completionLogs';

beforeEach(() => {
  resetMockDB();
  jest.clearAllMocks();
});

describe('removeSessionRatings', () => {
  it('removes only this session’s rating, through the path that reverses XP', async () => {
    addMockDocument(path, 'mine', { session_id: 's1' });
    addMockDocument(path, 'other', { session_id: 's2' });
    await removeSessionRatings('u1', 's1');
    expect(deleteCompletionLog).toHaveBeenCalledTimes(1);
    expect(deleteCompletionLog).toHaveBeenCalledWith('u1', 'mine');
  });

  it('does nothing for a session never rated', async () => {
    await removeSessionRatings('u1', 'none');
    expect(deleteCompletionLog).not.toHaveBeenCalled();
  });
});

describe('removeRating', () => {
  it('also removes the habit tick it wrote, and only that one', async () => {
    addMockDocument(path, 'rating', { session_id: 's1' });
    addMockDocument(path, 'tick', { mirror_of: 'rating' });
    addMockDocument(path, 'other-tick', { mirror_of: 'different' });
    await removeRating('u1', 'rating');
    const left = Object.keys(getMockDB()[path]);
    expect(left).not.toContain('tick');
    expect(left).toContain('other-tick');
    expect(deleteCompletionLog).toHaveBeenCalledWith('u1', 'rating');
  });
});

describe('updateSessionRatingMinutes', () => {
  it('moves this session’s recorded minutes and nothing else', async () => {
    addMockDocument(path, 'mine', { session_id: 's1', metrics: { duration_min: 20, technique: 'breath' } });
    addMockDocument(path, 'other', { session_id: 's2', metrics: { duration_min: 20 } });
    addMockDocument(path, 'no-length', { session_id: 's1', metrics: { technique: 'box' } });
    await updateSessionRatingMinutes('u1', 's1', 30);
    const db = getMockDB()[path];
    expect(db.mine.data.metrics).toEqual({ duration_min: 30, technique: 'breath' });
    expect(db.other.data.metrics).toEqual({ duration_min: 20 });
    expect(db['no-length'].data.metrics).toEqual({ technique: 'box' });
  });
});

describe('updateRatedMinutes', () => {
  it('changes the length and keeps the other metrics', async () => {
    addMockDocument(path, 'log', { metrics: { duration_min: 20, note: 'x' } });
    await updateRatedMinutes('u1', { id: 'log', metrics: { duration_min: 20, note: 'x' } }, 30);
    expect(getMockDB()[path].log.data.metrics).toEqual({ duration_min: 30, note: 'x' });
  });
});

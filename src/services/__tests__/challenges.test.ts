import {
  deleteChallenge,
  updateChallengeCompletion,
  getChallengeById,
} from '../challenges';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';

// Mock the willpower module
jest.mock('../willpower', () => ({
  subtractWillpowerPoints: jest.fn().mockResolvedValue(100),
  adjustWillpowerPoints: jest.fn().mockResolvedValue(100),
  recalculateUserStats: jest.fn().mockResolvedValue({ newStreak: 5, lastActivityDate: '2024-01-15' }),
}));

const { subtractWillpowerPoints, adjustWillpowerPoints, recalculateUserStats } = require('../willpower');

describe('Challenges Service - Delete and Update', () => {
  const userId = 'test-user-123';
  const challengeId = 'challenge-456';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  describe('deleteChallenge', () => {
    it('deletes a completed challenge and its completion log', async () => {
      // Setup: Add a completed challenge
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        points_awarded: 5,
        difficulty_actual: 5,
        date: '2024-01-15',
      });

      // Setup: Add corresponding completion log
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 5,
        date: '2024-01-15',
      });

      const result = await deleteChallenge(userId, challengeId);

      // Verify result
      expect(result.pointsRemoved).toBe(5);

      // Verify challenge was deleted
      const db = getMockDB();
      expect(db[`users/${userId}/challenges`]?.[challengeId]).toBeUndefined();

      // Verify subtractWillpowerPoints was called
      expect(subtractWillpowerPoints).toHaveBeenCalledWith(userId, 5);

      // Verify recalculateUserStats was called
      expect(recalculateUserStats).toHaveBeenCalledWith(userId);
    });

    it('deletes a failed challenge with 0 points awarded', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Failed Challenge',
        status: 'failed',
        points_awarded: 1,
        difficulty_actual: 0,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 1,
        date: '2024-01-15',
      });

      const result = await deleteChallenge(userId, challengeId);

      expect(result.pointsRemoved).toBe(1);
      expect(subtractWillpowerPoints).toHaveBeenCalledWith(userId, 1);
    });

    it('throws error when trying to delete active challenge', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Active Challenge',
        status: 'active',
        date: '2024-01-15',
      });

      await expect(deleteChallenge(userId, challengeId)).rejects.toThrow(
        'Cannot delete an active challenge'
      );
    });

    it('throws error when challenge does not exist', async () => {
      await expect(deleteChallenge(userId, 'non-existent')).rejects.toThrow(
        'Challenge not found'
      );
    });

    it('handles challenge with no points_awarded (defaults to 0)', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Old Challenge',
        status: 'completed',
        // No points_awarded field
        date: '2024-01-15',
      });

      const result = await deleteChallenge(userId, challengeId);

      expect(result.pointsRemoved).toBe(0);
      // subtractWillpowerPoints should not be called for 0 points
      expect(subtractWillpowerPoints).not.toHaveBeenCalled();
    });

    it('deletes archived challenges', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Archived Challenge',
        status: 'archived',
        points_awarded: 3,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 3,
        date: '2024-01-15',
      });

      const result = await deleteChallenge(userId, challengeId);

      expect(result.pointsRemoved).toBe(3);
      const db = getMockDB();
      expect(db[`users/${userId}/challenges`]?.[challengeId]).toBeUndefined();
    });
  });

  describe('updateChallengeCompletion', () => {
    it('updates challenge difficulty and adjusts points', async () => {
      // Setup: Challenge with difficulty 3 and 3 points
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 3,
        points_awarded: 3,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 3,
        difficulty: 3,
        date: '2024-01-15',
      });

      // Update to difficulty 5
      const result = await updateChallengeCompletion(userId, challengeId, 5);

      expect(result.pointsDelta).toBe(2); // 5 - 3 = 2
      expect(result.newPoints).toBe(5);

      // Verify adjustWillpowerPoints was called with delta
      expect(adjustWillpowerPoints).toHaveBeenCalledWith(userId, 2);

      // Verify challenge was updated
      const db = getMockDB();
      const updatedChallenge = db[`users/${userId}/challenges`]?.[challengeId];
      expect(updatedChallenge?.data.difficulty_actual).toBe(5);
      expect(updatedChallenge?.data.points_awarded).toBe(5);
    });

    it('handles decreasing difficulty (negative delta)', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 5,
        points_awarded: 5,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 5,
        difficulty: 5,
        date: '2024-01-15',
      });

      // Update to difficulty 2
      const result = await updateChallengeCompletion(userId, challengeId, 2);

      expect(result.pointsDelta).toBe(-3); // 2 - 5 = -3
      expect(result.newPoints).toBe(2);

      expect(adjustWillpowerPoints).toHaveBeenCalledWith(userId, -3);
    });

    it('handles same difficulty (no change)', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 3,
        points_awarded: 3,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 3,
        difficulty: 3,
        date: '2024-01-15',
      });

      const result = await updateChallengeCompletion(userId, challengeId, 3);

      expect(result.pointsDelta).toBe(0);
      expect(result.newPoints).toBe(3);

      // adjustWillpowerPoints should NOT be called when delta is 0
      expect(adjustWillpowerPoints).not.toHaveBeenCalled();
    });

    it('throws error when challenge does not exist', async () => {
      await expect(
        updateChallengeCompletion(userId, 'non-existent', 5)
      ).rejects.toThrow('Challenge not found');
    });

    it('updates completion log along with challenge', async () => {
      const logId = 'log-123';
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 2,
        points_awarded: 2,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 2,
        difficulty: 2,
        date: '2024-01-15',
      });

      await updateChallengeCompletion(userId, challengeId, 4);

      // Verify completion log was updated
      const db = getMockDB();
      const updatedLog = db[`users/${userId}/completionLogs`]?.[logId];
      expect(updatedLog?.data.points).toBe(4);
      expect(updatedLog?.data.difficulty).toBe(4);
    });

    it('handles minimum difficulty (1)', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 5,
        points_awarded: 5,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 5,
        difficulty: 5,
        date: '2024-01-15',
      });

      const result = await updateChallengeCompletion(userId, challengeId, 1);

      expect(result.pointsDelta).toBe(-4);
      expect(result.newPoints).toBe(1);
    });

    it('handles maximum difficulty (5)', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 1,
        points_awarded: 1,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeId,
        points: 1,
        difficulty: 1,
        date: '2024-01-15',
      });

      const result = await updateChallengeCompletion(userId, challengeId, 5);

      expect(result.pointsDelta).toBe(4);
      expect(result.newPoints).toBe(5);
    });
  });

  describe('getChallengeById', () => {
    it('returns challenge when it exists', async () => {
      addMockDocument(`users/${userId}/challenges`, challengeId, {
        user_id: userId,
        name: 'Test Challenge',
        status: 'completed',
        difficulty_actual: 3,
        points_awarded: 3,
        date: '2024-01-15',
      });

      const result = await getChallengeById(userId, challengeId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(challengeId);
      expect(result?.name).toBe('Test Challenge');
      expect(result?.status).toBe('completed');
    });

    it('returns null when challenge does not exist', async () => {
      const result = await getChallengeById(userId, 'non-existent');
      expect(result).toBeNull();
    });
  });
});

import { getAllChallenges } from './challenges';
import { Challenge } from '../types';

export interface ChallengeSummaryStats {
  avgDifficulty: number;
  totalCompleted: number;
  avgPerWeek: number;
  successRate: number;
}

export const getChallengeSummaryStats = async (
  userId: string
): Promise<ChallengeSummaryStats> => {
  const all = await getAllChallenges(userId);

  const finished = all.filter(
    (c) => c.status === 'completed' || c.status === 'failed'
  );
  const completed = finished.filter((c) => c.status === 'completed');

  if (finished.length === 0) {
    return { avgDifficulty: 0, totalCompleted: 0, avgPerWeek: 0, successRate: 0 };
  }

  const avgDifficulty =
    finished.reduce((sum, c) => sum + (c.difficulty_actual || c.difficulty_expected), 0) /
    finished.length;

  const totalCompleted = completed.length;

  const successRate = (completed.length / finished.length) * 100;

  // Calculate avg per week from date range
  const dates = finished
    .map((c) => new Date(c.created_at).getTime())
    .sort((a, b) => a - b);
  const earliest = dates[0];
  const latest = Date.now();
  const weeks = Math.max(1, (latest - earliest) / (7 * 24 * 60 * 60 * 1000));
  const avgPerWeek = totalCompleted / weeks;

  return {
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    totalCompleted,
    avgPerWeek: Math.round(avgPerWeek * 10) / 10,
    successRate: Math.round(successRate),
  };
};

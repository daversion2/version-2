// utils/ imports '../services/firebase', which jest.config's moduleNameMapper
// doesn't cover — use the services' manual mock explicitly.
jest.mock('../../services/firebase');

import { enableDemoData, disableDemoData, demoRating, DEMO_TARGET_HABITS } from '../seedDemoData';
import { buildFrictionOverview, growthLabel } from '../../services/frictionCapacity';
import { getPracticeProgress } from '../../services/practiceProgress';
import { addMockDocument, getMockDB, resetMockDB } from '../../services/__mocks__/firestore';
import { getTodayString, toLocalDateString } from '../date';
import { CompletionLog } from '../../types';

const userId = 'u1';
const habitsPath = `users/${userId}/habits`;
const logsPath = `users/${userId}/completionLogs`;

const docs = (path: string) =>
  Object.values(getMockDB()[path] || {}).map((d) => ({ id: d.id, ...d.data }));
const habitLogs = () => docs(logsPath).filter((l: any) => l.type === 'nudge') as CompletionLog[];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
};

beforeEach(() => {
  resetMockDB();
  addMockDocument('users', userId, {});
});

describe('enableDemoData — the Progress screen lights up', () => {
  it('tops an empty account up to a full set of tagged demo habits', async () => {
    await enableDemoData(userId);
    const habits = docs(habitsPath) as any[];
    expect(habits).toHaveLength(DEMO_TARGET_HABITS);
    expect(habits.every((h) => h.is_demo && h.is_active)).toBe(true);
  });

  it('rates every check-in on the current 1–3 scale', async () => {
    await enableDemoData(userId);
    const logs = habitLogs();
    expect(logs.length).toBeGreaterThan(50);
    for (const l of logs) {
      expect(l.resistance_scale).toBe(3);
      expect([1, 2, 3]).toContain(l.resistance);
      expect(l.points).toBe(l.resistance);
    }
  });

  it('shows friction faced climbing with friction felt falling behind it', async () => {
    await enableDemoData(userId);
    const overview = buildFrictionOverview(habitLogs(), getTodayString());
    const first = overview.windows[0];
    const last = overview.windows[overview.windows.length - 1];
    expect(last.faced).toBeGreaterThan(first.faced);
    expect(last.felt).toBeLessThan(last.faced);
    expect(growthLabel(overview)).not.toBeNull();
  });

  it('fills Habit by Habit and Totals by Type', async () => {
    await enableDemoData(userId);
    const progress = await getPracticeProgress(userId, daysAgo(30));
    expect(progress.practices.length).toBe(DEMO_TARGET_HABITS);
    expect(progress.practices.every((p) => p.reps > 0)).toBe(true);
    expect(progress.metricFamilies.length).toBeGreaterThan(0);
  });

  it('seeds the habits the account already has, and never an archived one', async () => {
    addMockDocument(habitsPath, 'real', {
      name: 'Meditation',
      practice_id: 'meditation',
      is_active: true,
      target_count_per_week: 5,
    });
    addMockDocument(habitsPath, 'archived', {
      name: 'Cold Exposure',
      practice_id: 'cold_exposure',
      is_active: false,
      archived_at: '2026-09-01T00:00:00Z',
      target_count_per_week: 3,
    });
    await enableDemoData(userId);
    const refs = new Set(habitLogs().map((l) => l.reference_id));
    expect(refs.has('real')).toBe(true);
    expect(refs.has('archived')).toBe(false);
    // One real live habit, so four demo habits fill the set.
    expect((docs(habitsPath) as any[]).filter((h) => h.is_demo)).toHaveLength(DEMO_TARGET_HABITS - 1);
  });

  it('adds no demo habits to an account that already has enough', async () => {
    for (let i = 0; i < DEMO_TARGET_HABITS; i++) {
      addMockDocument(habitsPath, `h${i}`, { name: `Habit ${i}`, is_active: true, target_count_per_week: 4 });
    }
    await enableDemoData(userId);
    expect((docs(habitsPath) as any[]).some((h) => h.is_demo)).toBe(false);
  });
});

describe('disableDemoData', () => {
  it('removes demo habits and logs, and leaves real ones alone', async () => {
    addMockDocument(habitsPath, 'real', { name: 'Read', is_active: true, target_count_per_week: 7 });
    await enableDemoData(userId);
    await disableDemoData(userId);
    expect((docs(habitsPath) as any[]).map((h) => h.id)).toEqual(['real']);
    expect(habitLogs()).toHaveLength(0);
  });
});

describe('demoRating', () => {
  it('holds the first three check-ins at the baseline, then eases off over time', () => {
    expect([0, 1, 2].map((k) => demoRating(3, k, 50, k))).toEqual([3, 3, 3]);
    expect(demoRating(3, 20, 55, 0)).toBeLessThan(3);
    expect(demoRating(3, 4, 5, 0)).toBe(3);
  });
});

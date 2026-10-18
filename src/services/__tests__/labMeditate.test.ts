import {
  getMeditatePrefs,
  listMeditateSessions,
  saveMeditatePrefs,
  saveMeditateSession,
  sortSessions,
} from '../labMeditate';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';
import { CompletedMeditateSession } from '../../types/meditate';

const base = 'users/u1';

const session = (id: string, started_at: string, extra: Partial<CompletedMeditateSession> = {}): CompletedMeditateSession => ({
  id,
  mode: 'sit',
  style: 'timer',
  technique: 'breath',
  planned_sec: 600,
  duration_sec: 600,
  ended_early: false,
  started_at,
  finished_at: started_at,
  date: started_at.slice(0, 10),
  ...extra,
});

describe('labMeditate prefs', () => {
  it('defaults when nothing is saved', async () => {
    expect(await getMeditatePrefs('u1')).toEqual({ linked_habit_ids: [], nsdr_links: [] });
  });

  it('merges changes into the one prefs doc, dropping undefined', async () => {
    await saveMeditatePrefs('u1', { intro_seen: true });
    await saveMeditatePrefs('u1', {
      nsdr_links: [{ id: 'l1', title: 'Yoga nidra', url: 'https://youtu.be/a' }],
      linked_habit_ids: undefined,
    });
    expect(getMockDB()[`${base}/lab_meditate_prefs`].main.data).toEqual({
      intro_seen: true,
      nsdr_links: [{ id: 'l1', title: 'Yoga nidra', url: 'https://youtu.be/a' }],
    });
    expect(await getMeditatePrefs('u1')).toEqual({
      linked_habit_ids: [],
      intro_seen: true,
      nsdr_links: [{ id: 'l1', title: 'Yoga nidra', url: 'https://youtu.be/a' }],
    });
  });
});

describe('labMeditate sessions', () => {
  it('saves under the session’s own id, so a retry overwrites', async () => {
    const s = session('abc', '2026-10-17T07:00:00.000Z', { habit_id: undefined });
    await saveMeditateSession('u1', s);
    await saveMeditateSession('u1', { ...s, duration_sec: 590 });
    const stored = getMockDB()[`${base}/lab_meditate_sessions`];
    expect(Object.keys(stored)).toEqual(['abc']);
    expect(stored.abc.data.duration_sec).toBe(590);
    expect('habit_id' in stored.abc.data).toBe(false);
  });

  it('lists newest first', async () => {
    addMockDocument(`${base}/lab_meditate_sessions`, 'old', session('old', '2026-10-01T07:00:00.000Z'));
    addMockDocument(`${base}/lab_meditate_sessions`, 'new', session('new', '2026-10-17T07:00:00.000Z'));
    expect((await listMeditateSessions('u1')).map((s) => s.id)).toEqual(['new', 'old']);
    expect(sortSessions([]).length).toBe(0);
  });
});

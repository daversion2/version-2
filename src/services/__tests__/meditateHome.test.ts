import { meditateHomeFocus, planFor } from '../meditateHome';
import { canEditMeditateLength, replaceMeditateSession, withMeditateMinutes } from '../meditateEdit';
import { buildMeditateDay, buildMeditateWeek, describeMeditateWeek, wasLoggedAfter } from '../meditateWeek';
import { weekWindow } from '../workoutWeek';
import { pastSession, startSession } from '../meditateMath';
import type { CompletionLog } from '../../types';
import type { CompletedMeditateSession, GuidedRecording, NsdrLink } from '../../types/meditate';

const NOW = new Date(2026, 10, 22, 12); // a Sunday

const session = (id: string, date: string, over: Partial<CompletedMeditateSession> = {}): CompletedMeditateSession => ({
  id,
  mode: 'sit',
  style: 'timer',
  technique: 'breath',
  planned_sec: 600,
  duration_sec: 600,
  ended_early: false,
  started_at: `${date}T12:00:00.000`,
  finished_at: `${date}T12:10:00.000`,
  date,
  ...over,
});

const link: NsdrLink = { id: 'l1', title: 'Yoga nidra', url: 'https://example.com/a' };
const recording: GuidedRecording = {
  id: 'g1',
  title: 'Ten minute sit',
  mode: 'sit',
  technique: 'breath',
  length_min: 10,
  duration_sec: 610,
  voice: 'A',
  audio_url: 'https://example.com/g',
};
const base = { sessions: [], nsdrLinks: [], guided: [] };

const rating = (over: Partial<CompletionLog>): CompletionLog =>
  ({ id: 'r', type: 'nudge', reference_id: 'app:meditate', date: '2026-11-20', points: 1, ...over }) as CompletionLog;

describe('meditateHomeFocus', () => {
  it('puts a session left open first', () => {
    const draft = startSession({ id: 'd', mode: 'sit', minutes: 10, now: NOW });
    expect(meditateHomeFocus({ ...base, draft })).toEqual({ kind: 'resume' });
  });

  it('offers the last session again', () => {
    const focus = meditateHomeFocus({
      ...base,
      sessions: [session('a', '2026-11-20', { mode: 'breathe', pattern: 'box', style: 'pacer', planned_sec: 300, duration_sec: 300 })],
    });
    if (focus.kind !== 'session') throw new Error('expected a session');
    expect(focus.why).toBe('Same as last time');
    expect(focus.plan).toMatchObject({ mode: 'breathe', minutes: 5, breatheStyle: 'pacer', timed: false });
    expect(focus.plan.detail).toBe('Breathe · 5 min · with the pacer');
  });

  it('starts a new account on a 10-minute sit', () => {
    const focus = meditateHomeFocus(base);
    if (focus.kind !== 'session') throw new Error('expected a session');
    expect(focus.why).toBe('A good place to start');
    expect(focus.plan).toMatchObject({ mode: 'sit', minutes: 10, timed: true, needsLink: false });
  });

  it('lets the habit that opened the app pick the mode', () => {
    const focus = meditateHomeFocus({
      ...base,
      sessions: [session('a', '2026-11-20')],
      launchPracticeId: 'breathwork',
    });
    if (focus.kind !== 'session') throw new Error('expected a session');
    expect(focus.plan.mode).toBe('breathe');
    expect(focus.why).toBe('A good place to start');
  });
});

describe('planFor', () => {
  it('needs a recording for NSDR with none saved', () => {
    expect(planFor('nsdr', base)).toMatchObject({ needsLink: true, detail: 'Save a recording to start' });
  });

  it('uses a saved NSDR recording', () => {
    expect(planFor('nsdr', { ...base, nsdrLinks: [link] })).toMatchObject({ needsLink: false, title: 'Yoga nidra', nsdrLink: link });
  });

  it('repeats a guided session with its recording’s length', () => {
    const plan = planFor('sit', {
      ...base,
      guided: [recording],
      sessions: [session('a', '2026-11-20', { style: 'guided', guided_id: 'g1' })],
    });
    expect(plan.guided?.id).toBe('g1');
    expect(plan).toMatchObject({ minutes: 10, timed: false });
    expect(plan.detail).toContain('guided');
  });

  it('falls back to timing it when the guided recording is gone', () => {
    const plan = planFor('sit', { ...base, sessions: [session('a', '2026-11-20', { style: 'guided', guided_id: 'gone' })] });
    expect(plan.guided).toBeUndefined();
    expect(plan.timed).toBe(true);
  });
});

describe('withMeditateMinutes', () => {
  it('moves planned time with a session that ran as planned', () => {
    expect(withMeditateMinutes(session('a', '2026-11-20'), 20)).toMatchObject({ duration_sec: 1200, planned_sec: 1200 });
  });

  it('keeps an early session early until it reaches its plan', () => {
    const early = session('a', '2026-11-20', { duration_sec: 300, ended_early: true });
    expect(withMeditateMinutes(early, 7)).toMatchObject({ duration_sec: 420, planned_sec: 600, ended_early: true });
    expect(withMeditateMinutes(early, 10)).toMatchObject({ duration_sec: 600, planned_sec: 600, ended_early: false });
  });

  it('keeps to the mode’s steps', () => {
    const nsdr = session('a', '2026-11-20', { mode: 'nsdr', planned_sec: 1200, duration_sec: 1200 });
    expect(withMeditateMinutes(nsdr, 23).duration_sec).toBe(1500);
  });

  it('never changes a guided session’s length', () => {
    const guided = session('a', '2026-11-20', { style: 'guided' });
    expect(canEditMeditateLength(guided)).toBe(false);
    expect(withMeditateMinutes(guided, 20)).toBe(guided);
  });

  it('returns the same session when nothing changed', () => {
    const s = session('a', '2026-11-20');
    expect(withMeditateMinutes(s, 10)).toBe(s);
  });
});

describe('replaceMeditateSession', () => {
  it('replaces in date order and removes on null', () => {
    const list = [session('b', '2026-11-21'), session('a', '2026-11-20')];
    expect(replaceMeditateSession(list, 'a', { ...list[1], duration_sec: 60 }).map((s) => s.id)).toEqual(['b', 'a']);
    expect(replaceMeditateSession(list, 'a', null).map((s) => s.id)).toEqual(['b']);
  });
});

describe('the week', () => {
  const window = weekWindow('rolling', NOW);
  const prior = weekWindow('rolling', NOW, 1);

  it('adds up time, kinds and the change on the week before', () => {
    const week = buildMeditateWeek({
      sessions: [
        session('a', '2026-11-20'),
        session('b', '2026-11-21', { mode: 'breathe', pattern: 'box', style: 'pacer', duration_sec: 300, planned_sec: 300 }),
        session('old', '2026-11-12', { duration_sec: 450, planned_sec: 450 }),
      ],
      logs: [],
      window,
      prior,
      now: NOW,
    });
    expect(week).toMatchObject({ count: 2, activeDays: 2, sec: 900, priorSec: 450, changePct: 100, longestSec: 600 });
    expect(week.byMode.find((m) => m.mode === 'breathe')).toMatchObject({ sec: 300, sessions: 1 });
  });

  it('pairs a rating with its session rather than counting it twice', () => {
    const week = buildMeditateWeek({
      sessions: [session('a', '2026-11-20')],
      logs: [rating({ session_id: 'a', difficulty: 2, resistance: 2 } as Partial<CompletionLog>)],
      window,
      prior,
      now: NOW,
    });
    expect(week.count).toBe(1);
  });

  it('shows a rating with no session as a session without details', () => {
    const day = buildMeditateDay({ sessions: [], logs: [rating({})], date: '2026-11-20', now: NOW });
    expect(day.kind).toBe('logged');
    expect(day.sessions[0].session).toBeNull();
  });

  it('names the mix on a day of two kinds', () => {
    const day = buildMeditateDay({
      sessions: [session('a', '2026-11-20'), session('b', '2026-11-20', { mode: 'breathe', style: 'pacer', pattern: 'box' })],
      logs: [],
      date: '2026-11-20',
      now: NOW,
    });
    expect(day.kind).toBe('mixed');
    expect(day.caption).toBe('Sit +1');
  });

  it('tells a Done it entry from a session that really ran', () => {
    const entered = pastSession({ id: 'p', mode: 'sit', date: '2026-11-20', minutes: 10, now: NOW });
    expect(wasLoggedAfter(entered)).toBe(true);
    expect(wasLoggedAfter({ started_at: new Date(2026, 10, 20, 12, 0, 4).toISOString() })).toBe(false);
  });

  it('counts against the goal only for this Monday week', () => {
    const calendar = weekWindow('calendar', NOW);
    expect(describeMeditateWeek({ count: 2, window: calendar }, 3)).toBe('2 of 3 sessions');
    expect(describeMeditateWeek({ count: 1, window }, 3)).toBe('1 session');
  });
});

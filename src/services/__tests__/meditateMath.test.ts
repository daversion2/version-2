import {
  addPacedSeconds,
  breakdown,
  checkinChoices,
  clampMinutes,
  computeRecords,
  describeSession,
  endSession,
  modeForHabit,
  newRecords,
  normalizeLink,
  startDefaults,
  startSession,
  techniqueSteps,
  toCompletedSession,
  totals,
  weekOf,
  weeklyTotals,
} from '../meditateMath';
import { CompletedMeditateSession } from '../../types/meditate';

// Local times throughout: weeks and months are counted by the user's own calendar.
const local = (y: number, m: number, d: number, h = 9, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s);
const NOW = local(2026, 10, 17); // a Saturday; its week starts Mon Oct 12

let seq = 0;
const done = (
  date: string,
  minutes: number,
  extra: Partial<CompletedMeditateSession> = {}
): CompletedMeditateSession => {
  const [y, m, d] = date.split('-').map(Number);
  const start = local(y, m, d, 7, seq++ % 60);
  return {
    id: `s${seq}`,
    mode: 'sit',
    style: 'timer',
    technique: 'breath',
    planned_sec: minutes * 60,
    duration_sec: minutes * 60,
    ended_early: false,
    started_at: start.toISOString(),
    finished_at: start.toISOString(),
    date,
    ...extra,
  };
};

describe('modeForHabit', () => {
  it('maps the meditation family, breathwork and NSDR — aliases included', () => {
    expect(modeForHabit('meditation')).toBe('sit');
    expect(modeForHabit('morning-meditation')).toBe('sit');
    expect(modeForHabit('trad-meditate')).toBe('sit');
    expect(modeForHabit('breathwork')).toBe('breathe');
    expect(modeForHabit('breathing-break')).toBe('breathe');
    expect(modeForHabit('nsdr')).toBe('nsdr');
    expect(modeForHabit('workout')).toBeUndefined();
    expect(modeForHabit(undefined)).toBeUndefined();
  });
});

describe('clampMinutes', () => {
  it('keeps each mode on its own steps and range', () => {
    expect(clampMinutes('sit', 0)).toBe(1);
    expect(clampMinutes('sit', 90)).toBe(60);
    expect(clampMinutes('breathe', 30)).toBe(20);
    expect(clampMinutes('nsdr', 12)).toBe(10);
    expect(clampMinutes('nsdr', 1)).toBe(5);
  });
});

describe('techniqueSteps', () => {
  it('reads the steps from the meditation habit’s own guide', () => {
    expect(techniqueSteps('body_scan').length).toBeGreaterThan(3);
    expect(techniqueSteps('open')[0]).toMatch(/no single anchor/);
  });
});

describe('startDefaults', () => {
  const links = [
    { id: 'l1', title: 'Yoga nidra', url: 'https://youtu.be/a' },
    { id: 'l2', title: 'NSDR 10', url: 'https://youtu.be/b' },
  ];

  it('opens a first-timer on a 10-minute focused sit', () => {
    expect(startDefaults({ sessions: [], nsdrLinks: [] })).toEqual({
      mode: 'sit',
      technique: 'breath',
      pattern: 'box',
      breatheStyle: 'pacer',
      nsdrLinkId: undefined,
      minutes: { sit: 10, breathe: 5, nsdr: 20 },
    });
  });

  it('copies the last session of each kind', () => {
    const sessions = [
      done('2026-10-16', 7, { mode: 'breathe', technique: undefined, pattern: '478', style: 'timer' }),
      done('2026-10-15', 15, { technique: 'body_scan' }),
      done('2026-10-14', 25, { mode: 'nsdr', technique: undefined, nsdr_title: 'NSDR 10' }),
      done('2026-10-13', 30, { technique: 'open' }),
    ];
    const d = startDefaults({ sessions, nsdrLinks: links });
    expect(d.mode).toBe('breathe');
    expect(d.technique).toBe('body_scan');
    expect(d.pattern).toBe('478');
    expect(d.breatheStyle).toBe('timer');
    expect(d.nsdrLinkId).toBe('l2');
    expect(d.minutes).toEqual({ sit: 15, breathe: 7, nsdr: 25 });
  });

  it('lets the launching habit pick the mode, and its commitment stand in for a missing last time', () => {
    const sessions = [done('2026-10-15', 15)];
    const d = startDefaults({ sessions, nsdrLinks: links, launchPracticeId: 'nsdr', launchGoalMin: 30 });
    expect(d.mode).toBe('nsdr');
    expect(d.minutes.nsdr).toBe(30);
    expect(d.nsdrLinkId).toBe('l1');
    // Last time still wins over the commitment.
    expect(startDefaults({ sessions, nsdrLinks: [], launchPracticeId: 'meditation', launchGoalMin: 20 }).minutes.sit).toBe(15);
  });
});

describe('a session, start to finish', () => {
  const start = local(2026, 10, 17, 7);
  const plus = (sec: number) => new Date(start.getTime() + sec * 1000);

  it('starts a sit that always locks and bells', () => {
    const s = startSession({ id: 'x', mode: 'sit', minutes: 10, now: start, technique: 'open', breatheStyle: 'pacer', habitId: 'h1' });
    expect(s).toEqual({
      id: 'x',
      mode: 'sit',
      style: 'timer',
      technique: 'open',
      plannedSec: 600,
      startedAt: start.toISOString(),
      habitId: 'h1',
    });
  });

  it('keeps the NSDR recording’s title on the session', () => {
    const s = startSession({ id: 'x', mode: 'nsdr', minutes: 20, now: start, nsdrLink: { id: 'l1', title: 'Yoga nidra', url: 'u' } });
    expect(s.nsdrTitle).toBe('Yoga nidra');
    expect(s.style).toBe('timer');
  });

  it('logs a timed session by the clock — real time early, the plan after the bell', () => {
    const s = startSession({ id: 'x', mode: 'sit', minutes: 10, now: start });
    const early = endSession(s, plus(372), true);
    expect(early.loggedSec).toBe(372);
    expect(early.endedEarly).toBe(true);
    const late = endSession(s, plus(3600), false);
    expect(late.loggedSec).toBe(600);
    expect(late.endedEarly).toBe(false);
    // Ending twice changes nothing.
    expect(endSession(early, plus(900), false)).toBe(early);
  });

  it('logs a paced session by the breaths actually taken, pauses excluded', () => {
    let s = startSession({ id: 'x', mode: 'breathe', minutes: 5, now: start, pattern: 'coherent', breatheStyle: 'pacer' });
    s = addPacedSeconds(s, 12);
    s = addPacedSeconds(s, 12);
    const ended = endSession(s, plus(900), true);
    expect(ended.loggedSec).toBe(24);
    expect(ended.endedEarly).toBe(true);
    expect(addPacedSeconds({ ...s, pacedSec: 295 }, 12).pacedSec).toBe(300);
  });

  it('saves a finished session with the day it started on', () => {
    const s = startSession({ id: 'x', mode: 'breathe', minutes: 5, now: start, pattern: 'sigh', breatheStyle: 'timer', habitId: 'h2' });
    const c = toCompletedSession(endSession(s, plus(300), false), plus(320));
    expect(c).toEqual({
      id: 'x',
      mode: 'breathe',
      style: 'timer',
      pattern: 'sigh',
      planned_sec: 300,
      duration_sec: 300,
      ended_early: false,
      started_at: start.toISOString(),
      finished_at: plus(320).toISOString(),
      date: '2026-10-17',
      habit_id: 'h2',
    });
  });

  it('hands the technique or pattern to the check-in', () => {
    expect(checkinChoices({ technique: 'body_scan' })).toEqual({ technique: 'body_scan' });
    expect(checkinChoices({ pattern: '478' })).toEqual({ technique: '478' });
    expect(checkinChoices({})).toBeUndefined();
  });
});

describe('describeSession', () => {
  it('names the mode and what was done', () => {
    expect(describeSession({ mode: 'sit', technique: 'body_scan', style: 'timer' })).toBe('Sit · Body scan');
    expect(describeSession({ mode: 'breathe', pattern: '478', style: 'pacer' })).toBe('Breathe · 4-7-8');
    expect(describeSession({ mode: 'nsdr', nsdr_title: 'Yoga nidra', style: 'timer' })).toBe('NSDR · Yoga nidra');
  });
});

describe('stats', () => {
  const sessions = [
    done('2026-10-17', 10),
    done('2026-10-12', 20, { mode: 'breathe', technique: undefined, pattern: 'box' }),
    done('2026-10-11', 30), // Sunday — last week
    done('2026-10-01', 15, { mode: 'nsdr', technique: undefined }),
    done('2026-09-30', 5), // last month
  ];

  it('weeks start on Monday', () => {
    expect(weekOf('2026-10-17')).toBe('2026-10-12');
    expect(weekOf('2026-10-11')).toBe('2026-10-05');
  });

  it('totals this week, this month and all time', () => {
    expect(totals(sessions, NOW)).toEqual({
      weekSec: 30 * 60,
      monthSec: 75 * 60,
      allSec: 80 * 60,
      sessions: 5,
    });
  });

  it('builds the chart’s bars oldest first, empty weeks included', () => {
    const bars = weeklyTotals(sessions, NOW, 4);
    expect(bars.map((b) => b.weekStart)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
    expect(bars.map((b) => b.sec / 60)).toEqual([0, 20, 30, 30]);
    expect(bars[3].byMode).toEqual({ sit: 600, breathe: 1200, nsdr: 0 });
  });

  it('keeps the longest session per mode and the best week', () => {
    const r = computeRecords(sessions);
    expect(r.longest.sit?.duration_sec).toBe(1800);
    expect(r.longest.breathe?.duration_sec).toBe(1200);
    expect(r.longest.nsdr?.duration_sec).toBe(900);
    // Two weeks tie at 30 minutes; the first to get there keeps it.
    expect(r.bestWeek).toEqual({ weekStart: '2026-10-05', sec: 1800 });
  });

  it('breaks time down by mode and technique, biggest first', () => {
    expect(breakdown(sessions).map((r) => [r.label, r.sec / 60, r.sessions])).toEqual([
      ['Sit · Focused', 45, 3],
      ['Breathe · Box', 20, 1],
      ['NSDR', 15, 1],
    ]);
  });
});

describe('newRecords', () => {
  it('calls a longer session a record, but a first one only a baseline', () => {
    expect(newRecords([], done('2026-10-17', 10))).toEqual([]);
    const prev = [done('2026-10-10', 12)];
    expect(newRecords(prev, done('2026-10-17', 12))).toEqual([]);
    expect(newRecords(prev, done('2026-10-17', 13)).map((r) => r.label)).toContain('Longest sit');
    // Another mode's record is its own.
    const firstNsdr = newRecords(prev, done('2026-10-17', 20, { mode: 'nsdr' })).map((r) => r.label);
    expect(firstNsdr).not.toContain('Longest NSDR');
    expect(firstNsdr).not.toContain('Longest sit');
  });

  it('calls the best week once — when this week passes every other week', () => {
    const prev = [done('2026-10-06', 30), done('2026-10-12', 20, { mode: 'breathe' })];
    const passing = newRecords(prev, done('2026-10-17', 15, { mode: 'breathe' }));
    expect(passing).toContainEqual({ label: 'Most minutes in a week', sec: 35 * 60, previousSec: 30 * 60 });
    // Already ahead this week: no second call.
    const ahead = [...prev, done('2026-10-17', 15, { mode: 'breathe' })];
    expect(newRecords(ahead, done('2026-10-17', 5, { mode: 'breathe' })).map((r) => r.label)).not.toContain(
      'Most minutes in a week'
    );
    // Only one week of history: nothing to beat.
    expect(newRecords([done('2026-10-12', 5)], done('2026-10-17', 50)).map((r) => r.label)).toEqual(['Longest sit']);
  });
});

describe('normalizeLink', () => {
  it('accepts web and app links, and adds https:// to a bare one', () => {
    expect(normalizeLink(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
    expect(normalizeLink('spotify://episode/123')).toBe('spotify://episode/123');
    expect(normalizeLink('youtu.be/abc')).toBe('https://youtu.be/abc');
  });

  it('rejects what can’t be opened', () => {
    expect(normalizeLink('')).toBeNull();
    expect(normalizeLink('yoga nidra')).toBeNull();
    expect(normalizeLink('nsdr')).toBeNull();
  });
});

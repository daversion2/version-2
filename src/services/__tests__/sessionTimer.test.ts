import { elapsedSec, endsAt, formatMinutes, isDue, loggedSec, remainingSec } from '../sessionTimer';

const clock = { startedAt: '2026-10-17T10:00:00.000Z', plannedSec: 600 };
const at = (sec: number) => new Date(Date.parse(clock.startedAt) + sec * 1000);

describe('sessionTimer', () => {
  it('rings planned seconds after the start', () => {
    expect(endsAt(clock).toISOString()).toBe('2026-10-17T10:10:00.000Z');
  });

  it('answers from the wall clock, with nothing ticking', () => {
    expect(elapsedSec(clock, at(125.9))).toBe(125);
    expect(remainingSec(clock, at(125))).toBe(475);
    expect(isDue(clock, at(599))).toBe(false);
    expect(isDue(clock, at(600))).toBe(true);
    expect(remainingSec(clock, at(4000))).toBe(0);
  });

  it('never runs backwards when the phone clock moves', () => {
    expect(elapsedSec(clock, at(-30))).toBe(0);
    expect(remainingSec(clock, at(-30))).toBe(600);
  });

  it('logs the real time when ended early, and the plan once the bell has rung', () => {
    expect(loggedSec(clock, at(372))).toBe(372);
    expect(loggedSec(clock, at(600))).toBe(600);
    // Back an hour late: still a 10-minute sit.
    expect(loggedSec(clock, at(4200))).toBe(600);
  });

  it('formats seconds for copy', () => {
    expect(formatMinutes(45)).toBe('45 sec');
    expect(formatMinutes(60)).toBe('1 min');
    expect(formatMinutes(629)).toBe('10 min');
  });
});

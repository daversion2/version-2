import {
  findTacticPattern,
  buildTacticPatternText,
  PATTERN_WINDOW,
} from '../tacticPatterns';
import { CompletionLog } from '../../types';
import { RESISTANCE_SCALE, LEGACY_RESISTANCE_MAX } from '../../constants/resistance';

// The service module pulls in Firestore through ./practices for its async
// wrapper; the pure detector under test never touches it.
jest.mock('../practices', () => ({ getHabitCompletionLogs: jest.fn() }));

let counter = 0;
const log = (
  overrides: Partial<CompletionLog> & { date: string }
): CompletionLog => ({
  id: `log-${++counter}`,
  user_id: 'u1',
  type: 'nudge',
  reference_id: 'habit-1',
  points: 1,
  difficulty: 1,
  resistance_scale: RESISTANCE_SCALE,
  ...overrides,
});

/** A hard rep (resistance 3) on `date` carrying `tactics`. */
const hard = (date: string, tactics: string[], resistance = 3): CompletionLog =>
  log({ date, resistance, tactics });

/** An easy rep — never offered the tactic question. */
const easy = (date: string, tactics?: string[]): CompletionLog =>
  log({ date, resistance: 1, tactics });

describe('findTacticPattern', () => {
  it('returns null with fewer hard reps than the minimum', () => {
    expect(findTacticPattern([hard('2026-08-01', ['countdown'])])).toBeNull();
  });

  it('returns null when hard reps carry no tactics', () => {
    const logs = [
      hard('2026-08-01', []),
      hard('2026-08-02', []),
      hard('2026-08-03', []),
    ];
    expect(findTacticPattern(logs)).toBeNull();
  });

  it('finds the dominant tactic across hard reps', () => {
    const logs = [
      hard('2026-08-01', ['countdown']),
      hard('2026-08-02', ['countdown']),
      hard('2026-08-03', ['self_talk']),
      hard('2026-08-04', ['countdown']),
    ];
    const pattern = findTacticPattern(logs);
    expect(pattern?.tactic.id).toBe('countdown');
    expect(pattern?.count).toBe(3);
    expect(pattern?.window).toBe(4);
  });

  it('ignores easy reps entirely — window and counts are hard reps only', () => {
    // Ten easy reps around three hard ones must not dilute the denominator.
    const logs = [
      ...Array.from({ length: 10 }, (_, i) => easy(`2026-07-${String(i + 1).padStart(2, '0')}`)),
      hard('2026-08-01', ['made_smaller']),
      hard('2026-08-02', ['made_smaller']),
      hard('2026-08-03', ['first_step']),
    ];
    const pattern = findTacticPattern(logs);
    expect(pattern?.tactic.id).toBe('made_smaller');
    expect(pattern?.count).toBe(2);
    expect(pattern?.window).toBe(3);
  });

  it('does not count a tactic somehow attached to an easy rep', () => {
    const logs = [
      easy('2026-08-01', ['countdown']),
      easy('2026-08-02', ['countdown']),
      easy('2026-08-03', ['countdown']),
      hard('2026-08-04', ['self_talk']),
      hard('2026-08-05', ['self_talk']),
    ];
    expect(findTacticPattern(logs)?.tactic.id).toBe('self_talk');
  });

  it('counts a rep once even if it lists the same tactic twice', () => {
    const logs = [
      hard('2026-08-01', ['countdown', 'countdown']),
      hard('2026-08-02', ['countdown']),
    ];
    expect(findTacticPattern(logs)?.count).toBe(2);
  });

  it('windows to the most recent hard reps', () => {
    // Older reps all used countdown; the recent window is all self_talk.
    const old = Array.from({ length: 8 }, (_, i) =>
      hard(`2026-06-${String(i + 1).padStart(2, '0')}`, ['countdown'])
    );
    const recent = Array.from({ length: PATTERN_WINDOW }, (_, i) =>
      hard(`2026-08-${String(i + 1).padStart(2, '0')}`, ['self_talk'])
    );
    const pattern = findTacticPattern([...old, ...recent]);
    expect(pattern?.tactic.id).toBe('self_talk');
    expect(pattern?.window).toBe(PATTERN_WINDOW);
  });

  it('reads a legacy 1–10 log through the scale before judging it hard', () => {
    // 8/10 normalizes to 3 — hard. Without the scale it would read as a raw 8.
    const logs = [
      log({ date: '2026-08-01', resistance: 8, resistance_scale: LEGACY_RESISTANCE_MAX, tactics: ['reframed'] }),
      log({ date: '2026-08-02', resistance: 9, resistance_scale: LEGACY_RESISTANCE_MAX, tactics: ['reframed'] }),
    ];
    expect(findTacticPattern(logs)?.tactic.id).toBe('reframed');
  });

  it('excludes a legacy 1–10 log that was actually easy', () => {
    const logs = [
      log({ date: '2026-08-01', resistance: 2, resistance_scale: LEGACY_RESISTANCE_MAX, tactics: ['reframed'] }),
      log({ date: '2026-08-02', resistance: 2, resistance_scale: LEGACY_RESISTANCE_MAX, tactics: ['reframed'] }),
    ];
    expect(findTacticPattern(logs)).toBeNull();
  });

  it('drops an unknown tactic id rather than surfacing a raw string', () => {
    const logs = [
      hard('2026-08-01', ['retired_tactic']),
      hard('2026-08-02', ['retired_tactic']),
    ];
    expect(findTacticPattern(logs)).toBeNull();
  });

  it('treats resistance 2 as hard — the gate is ≥ 2', () => {
    const logs = [hard('2026-08-01', ['countdown'], 2), hard('2026-08-02', ['countdown'], 2)];
    expect(findTacticPattern(logs)?.count).toBe(2);
  });
});

describe('buildTacticPatternText', () => {
  it('reads as a grammatical sentence for a possessive tactic', () => {
    const pattern = findTacticPattern([
      hard('2026-08-01', ['breathing']),
      hard('2026-08-02', ['breathing']),
    ])!;
    // "you slowed your breathing", never "you slowed my breathing".
    expect(buildTacticPatternText(pattern)).toBe(
      'The last 2 times this was hard, you slowed your breathing 2 of them.'
    );
    expect(buildTacticPatternText(pattern)).not.toContain(' my ');
  });

  it('reports the hard-rep window, not the total rep count', () => {
    const pattern = findTacticPattern([
      easy('2026-07-01'),
      easy('2026-07-02'),
      hard('2026-08-01', ['made_smaller']),
      hard('2026-08-02', ['made_smaller']),
      hard('2026-08-03', ['first_step']),
    ])!;
    expect(buildTacticPatternText(pattern)).toBe(
      'The last 3 times this was hard, you made it smaller 2 of them.'
    );
  });
});

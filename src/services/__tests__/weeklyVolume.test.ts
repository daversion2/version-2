import {
  addLoggedSets,
  applySessionChange,
  canRemoveSet,
  checkinPending,
  describeWeekTotals,
  describeTarget,
  describeWeekRow,
  prefillFrom,
  weekLabel,
  editSet,
  entriesByDay,
  isLoggableSet,
  logSessionId,
  recordsFor,
  removeSet,
  replaceSession,
  shouldAskCheckin,
  targetFraction,
  weekSummary,
} from '../weeklyVolume';
import { saveSessionChange, listSessions, getRecords } from '../labWorkouts';
import { CompletedWorkoutSession, Exercise, LoggedSet } from '../../types/workouts';
import { toLocalDateString } from '../../utils/date';

const EX: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  pushup: { id: 'pushup', name: 'Push-up', kind: 'reps', muscle: 'chest' },
  squat: { id: 'squat', name: 'Squat', kind: 'weight', muscle: 'legs' },
  plank: { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
  mile: { id: 'mile', name: 'Mile', kind: 'distance', muscle: 'full_body', distanceM: 1609 },
};

// Local-time dates, so week edges don't depend on the machine's zone.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
// Saturday 17 Oct 2026; its week began Monday 12 Oct.
const NOW = local(2026, 10, 17);

const set = (exerciseId: string, v: Partial<LoggedSet>, at: Date): LoggedSet => ({
  exerciseId,
  round: 0,
  at: at.toISOString(),
  ...v,
});

const workout = (id: string, when: Date, sets: LoggedSet[]): CompletedWorkoutSession => ({
  id,
  workout_name: `Workout ${id}`,
  started_at: when.toISOString(),
  finished_at: when.toISOString(),
  duration_sec: 1800,
  total_sets: sets.length,
  total_volume_kg: 0,
  prs: [],
  blocks: [
    { id: 'b', type: 'circuit', items: [], rounds: 1, restSec: 0, plannedRounds: 1, skipped: false, added: false, sets },
  ],
});

const legDay = workout('w1', local(2026, 10, 13), [
  set('squat', { weightKg: 60, reps: 10 }, local(2026, 10, 13)),
  set('squat', { weightKg: 60, reps: 10 }, local(2026, 10, 13)),
  set('squat', { weightKg: 60, reps: 10 }, local(2026, 10, 13)),
]);
const lastWeek = workout('w0', local(2026, 10, 8), [set('squat', { weightKg: 60, reps: 20 }, local(2026, 10, 8))]);

describe('weekSummary', () => {
  it('adds up each exercise this week from every session, and compares with last week', () => {
    const s = weekSummary({ sessions: [legDay, lastWeek], exercisesById: EX, now: NOW });
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({
      exerciseId: 'squat',
      sets: 3,
      reps: 30,
      volumeKg: 1800,
      lastWeightKg: 60,
      lastWeekVolumeKg: 1200,
      lastWeekProgress: 20,
    });
    expect(s.totalSets).toBe(3);
    expect(s.volumeChangePct).toBe(50);
  });

  it('starts the week on Monday, so last Sunday is last week', () => {
    const sunday = workout('w2', local(2026, 10, 11, 20), [set('bench', { weightKg: 50, reps: 5 }, local(2026, 10, 11, 20))]);
    const s = weekSummary({ sessions: [sunday], exercisesById: EX, now: NOW });
    expect(s.rows).toHaveLength(0);
    expect(s.lastWeekVolumeKg).toBe(250);
  });

  it('keeps a targeted exercise on screen at zero, after the ones already done', () => {
    const s = weekSummary({ sessions: [legDay], exercisesById: EX, targets: { bench: 100, pushup: 0 }, now: NOW });
    expect(s.rows.map((r) => r.exerciseId)).toEqual(['squat', 'bench']);
    expect(s.rows[1]).toMatchObject({ sets: 0, progress: 0, target: 100 });
  });

  it('counts a hold in seconds toward its target, and volume only for weighted lifts', () => {
    const core = workout('w3', local(2026, 10, 14), [
      set('plank', { seconds: 60 }, local(2026, 10, 14)),
      set('pushup', { reps: 20 }, local(2026, 10, 14)),
    ]);
    const s = weekSummary({ sessions: [core], exercisesById: EX, targets: { plank: 300 }, now: NOW });
    const plank = s.rows.find((r) => r.exerciseId === 'plank')!;
    expect(plank).toMatchObject({ progress: 60, target: 300, volumeKg: 0 });
    expect(targetFraction(plank)).toBeCloseTo(0.2);
    expect(s.rows.find((r) => r.exerciseId === 'pushup')).toMatchObject({ reps: 20, volumeKg: 0 });
  });

  it('caps the target bar at full', () => {
    expect(targetFraction({ progress: 150, target: 100 })).toBe(1);
    expect(targetFraction({ progress: 10 })).toBe(0);
  });

  it('has no percentage with nothing last week', () => {
    expect(weekSummary({ sessions: [legDay], exercisesById: EX, now: NOW }).volumeChangePct).toBeNull();
  });
});

describe('addLoggedSets', () => {
  it('makes today’s logged-sets session, with one real set per count', () => {
    const { session, prs } = addLoggedSets({
      exercise: EX.squat,
      values: { weightKg: 60, reps: 10 },
      count: 3,
      records: {},
      exercisesById: EX,
      now: NOW,
    });
    expect(session.id).toBe(logSessionId(toLocalDateString(NOW)));
    expect(session.logged_sets).toBe(true);
    expect(session.workout_name).toBe('Logged sets');
    expect(session.blocks).toHaveLength(1);
    expect(session.blocks[0].sets.map((s) => s.round)).toEqual([0, 1, 2]);
    expect(session).toMatchObject({ total_sets: 3, total_volume_kg: 1800 });
    expect(prs).toEqual([]); // first time ever sets the baseline quietly
  });

  it('adds to the same exercise’s block, and a new block for a new exercise', () => {
    const first = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 1, records: {}, exercisesById: EX, now: NOW }).session;
    const later = new Date(NOW.getTime() + 3600_000);
    const second = addLoggedSets({ existing: first, exercise: EX.squat, values: { weightKg: 60, reps: 7 }, count: 1, records: {}, exercisesById: EX, now: later }).session;
    const third = addLoggedSets({ existing: second, exercise: EX.pushup, values: { reps: 20, weightKg: 99 }, count: 1, records: {}, exercisesById: EX, now: later }).session;
    expect(third.blocks).toHaveLength(2);
    expect(third.blocks[0].sets.map((s) => s.reps)).toEqual([10, 7]);
    expect(third.blocks[1].sets[0]).not.toHaveProperty('weightKg'); // no stray weight on a bodyweight move
    expect(third.finished_at).toBe(later.toISOString());
    expect(third.started_at).toBe(NOW.toISOString());
  });

  it('reports a PR against the existing record', () => {
    const { prs, record } = addLoggedSets({
      exercise: EX.squat,
      values: { weightKg: 70, reps: 5 },
      count: 1,
      records: { squat: { exerciseId: 'squat', heaviestKg: 60, repsAtWeight: {} } },
      exercisesById: EX,
      now: NOW,
    });
    expect(prs[0]).toMatchObject({ type: 'heaviest', value: 70, previous: 60 });
    expect(record.heaviestKg).toBe(70);
  });

  it('shows up in the week straight away', () => {
    const { session } = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 17 }, count: 1, records: {}, exercisesById: EX, now: NOW });
    const s = weekSummary({ sessions: [session, legDay], exercisesById: EX, now: NOW });
    expect(s.rows[0]).toMatchObject({ reps: 47, sets: 4 });
    expect(s.rows[0].entries[0]).toMatchObject({ fromLog: true, sessionName: 'Logged sets' });
  });
});

describe('isLoggableSet', () => {
  it('needs reps for lifts and bodyweight, seconds for holds, and never a distance', () => {
    expect(isLoggableSet('weight', { weightKg: 0, reps: 10 })).toBe(true); // an empty bar is a set
    expect(isLoggableSet('weight', { weightKg: 60, reps: 0 })).toBe(false);
    expect(isLoggableSet('reps', { reps: 1 })).toBe(true);
    expect(isLoggableSet('time', { seconds: 0 })).toBe(false);
    expect(isLoggableSet('distance', { seconds: 400 })).toBe(false);
  });
});

describe('editSet / removeSet', () => {
  it('changes one set and its session’s totals, keeping its time', () => {
    const next = editSet(legDay, { blockIndex: 0, setIndex: 1 }, { weightKg: 80, reps: 5 }, EX);
    expect(next.blocks[0].sets[1]).toMatchObject({ weightKg: 80, reps: 5, at: legDay.blocks[0].sets[1].at });
    expect(next.total_volume_kg).toBe(600 + 400 + 600);
    expect(legDay.blocks[0].sets[1].weightKg).toBe(60); // the original is untouched
  });

  it('removes a set from a workout but keeps the workout', () => {
    let next: CompletedWorkoutSession | null = legDay;
    for (let i = 0; i < 3; i++) next = removeSet(next!, { blockIndex: 0, setIndex: 0 }, EX);
    expect(next).not.toBeNull();
    expect(next!.total_sets).toBe(0);
  });

  it('deletes a logged-sets day once its last set goes', () => {
    const { session } = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 2, records: {}, exercisesById: EX, now: NOW });
    const one = removeSet(session, { blockIndex: 0, setIndex: 0 }, EX)!;
    expect(one.blocks[0].sets.map((s) => s.round)).toEqual([0]);
    expect(one.blocks[0].rounds).toBe(1);
    expect(removeSet(one, { blockIndex: 0, setIndex: 0 }, EX)).toBeNull();
  });
});

describe('a set in a circuit', () => {
  // Pull-ups then push-ups, two rounds: sets go pull, push, pull, push.
  const circuit: CompletedWorkoutSession = {
    ...workout('c1', local(2026, 10, 14), [
      set('bench', { weightKg: 60, reps: 8 }, local(2026, 10, 14)),
      set('pushup', { reps: 20 }, local(2026, 10, 14)),
      set('bench', { weightKg: 60, reps: 8 }, local(2026, 10, 14)),
      set('pushup', { reps: 18 }, local(2026, 10, 14)),
    ]),
  };
  circuit.blocks[0].items = [
    { exerciseId: 'bench', target: {} },
    { exerciseId: 'pushup', target: {} },
  ];

  it('can’t be removed on its own — later sets would shift onto the wrong exercise', () => {
    expect(canRemoveSet(circuit, { blockIndex: 0 })).toBe(false);
    expect(removeSet(circuit, { blockIndex: 0, setIndex: 1 }, EX)).toBe(circuit);
  });

  it('can still be edited, keeping its place', () => {
    const next = editSet(circuit, { blockIndex: 0, setIndex: 1 }, { reps: 25 }, EX);
    expect(next.blocks[0].sets.map((s) => s.exerciseId)).toEqual(['bench', 'pushup', 'bench', 'pushup']);
    expect(next.blocks[0].sets[1].reps).toBe(25);
  });

  it('is removable from a single exercise', () => {
    expect(canRemoveSet(legDay, { blockIndex: 0 })).toBe(true);
    const { session } = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 2, records: {}, exercisesById: EX, now: NOW });
    expect(canRemoveSet(session, { blockIndex: 0 })).toBe(true);
  });
});

describe('applySessionChange', () => {
  const before = workout('a', local(2026, 10, 12), [set('squat', { weightKg: 60, reps: 10 }, local(2026, 10, 12))]);
  const record = {
    ...workout('b', local(2026, 10, 13), [set('squat', { weightKg: 80, reps: 5 }, local(2026, 10, 13))]),
    prs: [
      { exerciseId: 'squat', type: 'heaviest' as const, value: 80, previous: 60 },
      { exerciseId: 'bench', type: 'heaviest' as const, value: 70, previous: 65 },
    ],
  };

  it('drops a record badge once the set that earned it is edited down', () => {
    const edited = editSet(record, { blockIndex: 0, setIndex: 0 }, { weightKg: 50, reps: 5 }, EX);
    const out = applySessionChange({ sessions: [record, before], sessionId: 'b', next: edited, exercisesById: EX, exerciseIds: ['squat'] });
    // The squat badge goes; the bench one, untouched by this edit, stays.
    expect(out.session!.prs).toEqual([{ exerciseId: 'bench', type: 'heaviest', value: 70, previous: 65 }]);
    expect(out.records.squat.heaviestKg).toBe(60);
    expect(out.sessions.find((s) => s.id === 'b')!.prs).toEqual(out.session!.prs);
  });

  it('awards one when a set is edited up past the best before it', () => {
    const plain = { ...before, id: 'c', finished_at: local(2026, 10, 14).toISOString(), prs: [] };
    plain.blocks = [{ ...before.blocks[0], sets: [set('squat', { weightKg: 60, reps: 10 }, local(2026, 10, 14))] }];
    const edited = editSet(plain, { blockIndex: 0, setIndex: 0 }, { weightKg: 90, reps: 3 }, EX);
    const out = applySessionChange({ sessions: [plain, before], sessionId: 'c', next: edited, exercisesById: EX, exerciseIds: ['squat'] });
    expect(out.session!.prs).toEqual([{ exerciseId: 'squat', type: 'heaviest', value: 90, previous: 60 }]);
  });

  it('removes a deleted session and rebuilds its records', () => {
    const out = applySessionChange({ sessions: [record, before], sessionId: 'b', next: null, exercisesById: EX, exerciseIds: ['squat'] });
    expect(out.session).toBeNull();
    expect(out.sessions.map((s) => s.id)).toEqual(['a']);
    expect(out.records.squat.heaviestKg).toBe(60);
  });
});

describe('describeWeekTotals', () => {
  it('leaves the weight out of a bodyweight-only week', () => {
    expect(describeWeekTotals({ rows: [{ sets: 6 } as never], totalSets: 6, totalVolumeKg: 0 }, 'lb')).toBe(
      '6 sets across 1 exercise'
    );
  });

  it('leads with the volume when there is some', () => {
    const week = weekSummary({ sessions: [legDay], exercisesById: EX, now: NOW });
    expect(describeWeekTotals(week, 'kg')).toBe('1,800 kg · 3 sets across 1 exercise');
  });
});

describe('recordsFor', () => {
  it('lets a best go back down after the set that made it is edited', () => {
    const heavy = editSet(legDay, { blockIndex: 0, setIndex: 0 }, { weightKg: 100, reps: 1 }, EX);
    expect(recordsFor([heavy], EX, ['squat']).squat.heaviestKg).toBe(100);
    const fixed = editSet(heavy, { blockIndex: 0, setIndex: 0 }, { weightKg: 60, reps: 10 }, EX);
    expect(recordsFor(replaceSession([heavy], heavy.id, fixed), EX, ['squat']).squat.heaviestKg).toBe(60);
  });

  it('empties a record whose sets are all gone', () => {
    expect(recordsFor([], EX, ['squat'])).toEqual({ squat: { exerciseId: 'squat' } });
  });
});

describe('entriesByDay', () => {
  it('groups a week’s sets by day, newest first', () => {
    const { session } = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 1, records: {}, exercisesById: EX, now: NOW });
    const s = weekSummary({ sessions: [session, legDay], exercisesById: EX, now: NOW });
    const days = entriesByDay(s.rows[0].entries);
    expect(days.map((d) => d.date)).toEqual(['2026-10-17', '2026-10-13']);
    expect(days[1].entries).toHaveLength(3);
  });
});

describe('the check-in', () => {
  const logged = () =>
    addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 1, records: {}, exercisesById: EX, now: NOW }).session;

  it('asks after the day’s first logged sets, and only once', () => {
    const log = logged();
    expect(shouldAskCheckin([], log)).toBe(true);
    expect(shouldAskCheckin([], { ...log, checkin_asked_at: NOW.toISOString() })).toBe(false);
  });

  it('doesn’t ask when a workout already ran that day — its rating counted the day', () => {
    const morning = workout('w9', local(2026, 10, 17, 8), []);
    expect(shouldAskCheckin([morning], logged())).toBe(false);
    expect(checkinPending([morning, logged()], NOW)).toBeUndefined();
  });

  it('keeps today’s rating pending until it’s handed to Today', () => {
    const log = logged();
    expect(checkinPending([log], NOW)?.id).toBe(log.id);
    expect(checkinPending([{ ...log, checkin_sent_at: NOW.toISOString() }], NOW)).toBeUndefined();
    expect(checkinPending([], NOW)).toBeUndefined();
  });
});

describe('saveSessionChange', () => {
  it('writes the session and its records together, and deletes an emptied day', async () => {
    const { session, record } = addLoggedSets({ exercise: EX.squat, values: { weightKg: 60, reps: 10 }, count: 1, records: {}, exercisesById: EX, now: NOW });
    await saveSessionChange('u1', { sessionId: session.id, session, records: { squat: record } });
    expect((await listSessions('u1')).map((s) => s.id)).toEqual([session.id]);
    expect((await getRecords('u1')).squat.heaviestKg).toBe(60);

    await saveSessionChange('u1', { sessionId: session.id, session: null, records: { squat: { exerciseId: 'squat' } } });
    expect(await listSessions('u1')).toEqual([]);
    expect((await getRecords('u1')).squat.heaviestKg).toBeUndefined();
  });
});

describe('labels', () => {
  it('names the week, across a month too', () => {
    expect(weekLabel(local(2026, 10, 12, 0))).toBe('Oct 12 – 18');
    expect(weekLabel(local(2026, 10, 26, 0))).toBe('Oct 26 – Nov 1');
  });

  it('describes a row by its kind', () => {
    const s = weekSummary({ sessions: [legDay], exercisesById: EX, targets: { bench: 50 }, now: NOW });
    expect(describeWeekRow(s.rows[0], 'kg')).toBe('60 kg · 30 reps · 3 sets · 1,800 kg');
    expect(describeWeekRow(s.rows[1], 'kg')).toBe('Not done yet this week');
    expect(describeTarget(s.rows[1])).toBe('0 / 50 reps');
    expect(describeTarget({ kind: 'time', progress: 150, target: 300 })).toBe('2:30 / 5:00');
    expect(describeTarget({ kind: 'weight', progress: 10 })).toBeNull();
  });
});

describe('prefillFrom', () => {
  it('opens on the most recent set of that exercise', () => {
    const later = workout('w5', local(2026, 10, 15), [set('squat', { weightKg: 65, reps: 8 }, local(2026, 10, 15))]);
    expect(prefillFrom([legDay, later], EX.squat)).toEqual({ weightKg: 65, reps: 8 });
  });

  it('falls back to a starting point for something never done', () => {
    expect(prefillFrom([], EX.bench)).toEqual({ weightKg: 0, reps: 10 });
    expect(prefillFrom([], EX.pushup)).toEqual({ reps: 10 });
    expect(prefillFrom([], EX.plank)).toEqual({ seconds: 30 });
  });
});

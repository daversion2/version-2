import {
  afterLeave,
  canRemoveMember,
  celebrationDay,
  checkJoin,
  checkPodReaction,
  cleanFirstName,
  everyoneDaysSummary,
  everyoneShowedUp,
  isPodDay,
  lastDays,
  localDay,
  makeInviteCode,
  memberWeek,
  newInvite,
  normalizeInviteCode,
  podPushAllows,
  podStreak,
  podWeek,
  POD_DAYS_KEPT,
  POD_EVERYONE_DAYS_KEPT,
  POD_INVITE_ALPHABET,
  POD_MAX_MEMBERS,
  POD_PUSHES_PER_DAY,
  pruneDays,
  recordEveryoneDay,
  recordPodPush,
  sharedSession,
  shiftDay,
  showedUp,
  suggestedFirstName,
  withSession,
  withoutSession,
  type PodDays,
  type PodMemberSummary,
  type PodReactionRecord,
  type PodSession,
} from '../podMath';

const TODAY = '2026-11-27';

let n = 0;
const s = (app: string, over: Partial<PodSession> = {}): PodSession => ({ id: `s${++n}`, app, ...over });

const member = (uid: string, days: PodDays = {}, goals: Record<string, number> = {}): PodMemberSummary => ({
  uid,
  goals,
  days,
});

/** A member who showed up on each of these days (one Meditate session each). */
const on = (uid: string, ...days: string[]): PodMemberSummary =>
  member(uid, Object.fromEntries(days.map((d) => [d, [s('meditate')]])));

describe('dates', () => {
  it('shifts across months and years', () => {
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('lists the last N days ending today, oldest first', () => {
    expect(lastDays(TODAY, 3)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
  });

  it("reads an instant as the member's own calendar day", () => {
    const iso = '2026-11-27T03:00:00Z';
    expect(localDay(iso, 'America/Los_Angeles')).toBe('2026-11-26');
    expect(localDay(iso, 'Asia/Tokyo')).toBe('2026-11-27');
  });

  it('falls back to the UTC day for a missing or unknown zone', () => {
    expect(localDay('2026-11-27T03:00:00Z')).toBe('2026-11-27');
    expect(localDay('2026-11-27T03:00:00Z', 'Not/AZone')).toBe('2026-11-27');
  });

  it('only accepts real YYYY-MM-DD days', () => {
    expect(isPodDay('2026-11-27')).toBe(true);
    expect(isPodDay('2026-13-01')).toBe(false);
    expect(isPodDay('27/11/2026')).toBe(false);
    expect(isPodDay(20261127)).toBe(false);
  });
});

describe('sharedSession', () => {
  it('shares both ratings when friction is on', () => {
    expect(sharedSession({ id: 'a', app: 'workouts', start: 3, keep: 2 }, true)).toEqual({
      id: 'a',
      app: 'workouts',
      start: 3,
      keep: 2,
    });
  });

  it('shares only that the session happened when friction is off', () => {
    expect(sharedSession({ id: 'a', app: 'meals', day: 2 }, false)).toEqual({ id: 'a', app: 'meals' });
  });

  it('clamps ratings to the 3-level scale and drops junk', () => {
    expect(sharedSession({ id: 'a', app: 'meditate', start: 7, keep: 0.2, day: NaN }, true)).toEqual({
      id: 'a',
      app: 'meditate',
      start: 3,
      keep: 1,
    });
  });
});

describe("a member's days", () => {
  it('adds a session to its day', () => {
    const a = s('meditate');
    expect(withSession({}, TODAY, a, TODAY)).toEqual({ [TODAY]: [a] });
  });

  it('replaces a session with the same id instead of doubling it, even on another day', () => {
    const first = { id: 'x', app: 'workouts', start: 3 };
    const days = withSession({}, '2026-11-26', first, TODAY);
    const again = withSession(days, TODAY, { ...first, start: 1 }, TODAY);
    expect(again).toEqual({ [TODAY]: [{ id: 'x', app: 'workouts', start: 1 }] });
  });

  it('keeps only the last POD_DAYS_KEPT days and nothing after today', () => {
    const oldest = shiftDay(TODAY, -(POD_DAYS_KEPT - 1));
    const days: PodDays = {
      [shiftDay(oldest, -1)]: [s('meals')],
      [oldest]: [s('meals')],
      [shiftDay(TODAY, 1)]: [s('meals')],
      junk: [s('meals')],
      [TODAY]: [],
    };
    expect(Object.keys(pruneDays(days, TODAY))).toEqual([oldest]);
  });

  it('drops a session logged for a day older than the window', () => {
    expect(withSession({}, shiftDay(TODAY, -30), s('meals'), TODAY)).toEqual({});
  });

  it('removes a deleted session and its day once empty', () => {
    const a = s('meditate');
    const b = s('workouts');
    const days: PodDays = { [TODAY]: [a, b], '2026-11-26': [a] };
    expect(withoutSession(days, a.id)).toEqual({ [TODAY]: [b] });
    expect(withoutSession({ [TODAY]: [b] }, b.id)).toEqual({});
  });

  it('copes with a missing days map', () => {
    expect(withoutSession(undefined, 'x')).toEqual({});
    expect(pruneDays(undefined, TODAY)).toEqual({});
  });

  it('knows whether someone showed up on a day', () => {
    expect(showedUp(on('a', TODAY), TODAY)).toBe(true);
    expect(showedUp(on('a', TODAY), '2026-11-26')).toBe(false);
  });
});

describe('podStreak: anyone showed up', () => {
  it('counts days in a row when anyone showed up, across members', () => {
    const pod = [on('a', TODAY, '2026-11-25'), on('b', '2026-11-26')];
    expect(podStreak(pod, TODAY)).toBe(3);
  });

  it("doesn't break on a today with nothing yet", () => {
    const pod = [on('a', '2026-11-26', '2026-11-25'), on('b')];
    expect(podStreak(pod, TODAY)).toBe(2);
  });

  it('stops at the first day nobody showed up', () => {
    const pod = [on('a', TODAY, '2026-11-25'), on('b')];
    expect(podStreak(pod, TODAY)).toBe(1);
  });

  it('is 0 when nobody showed up today or yesterday', () => {
    expect(podStreak([on('a', '2026-11-25')], TODAY)).toBe(0);
    expect(podStreak([], TODAY)).toBe(0);
  });

  it('reads at most what members keep', () => {
    expect(podStreak([on('a', ...lastDays(TODAY, 30))], TODAY)).toBe(POD_DAYS_KEPT);
  });
});

describe('everyone showed up', () => {
  it('needs every member on that day', () => {
    expect(everyoneShowedUp([on('a', TODAY), on('b', TODAY)], TODAY)).toBe(true);
    expect(everyoneShowedUp([on('a', TODAY), on('b')], TODAY)).toBe(false);
  });

  it("never counts a pod of one: there's no everyone yet", () => {
    expect(everyoneShowedUp([on('a', TODAY)], TODAY)).toBe(false);
  });

  it('celebrates when the last member lands on their today', () => {
    const pod = [on('a', TODAY), on('b', TODAY), on('c', TODAY)];
    expect(celebrationDay(pod, TODAY, TODAY, [])).toBe(TODAY);
  });

  it('celebrates a day only once', () => {
    const pod = [on('a', TODAY), on('b', TODAY)];
    expect(celebrationDay(pod, TODAY, TODAY, [TODAY])).toBeNull();
  });

  it('sends nothing for a late Done it, even when it completes the day', () => {
    const y = '2026-11-26';
    const pod = [on('a', y), on('b', y)];
    expect(celebrationDay(pod, y, TODAY, [])).toBeNull();
  });

  it('sends nothing while someone is still missing', () => {
    expect(celebrationDay([on('a', TODAY), on('b')], TODAY, TODAY, undefined)).toBeNull();
  });

  it('records everyone days unique, sorted and capped', () => {
    expect(recordEveryoneDay(['2026-11-26', 'junk'], '2026-11-25')).toEqual(['2026-11-25', '2026-11-26']);
    expect(recordEveryoneDay([TODAY], TODAY)).toEqual([TODAY]);
    const many = lastDays('2026-11-26', POD_EVERYONE_DAYS_KEPT);
    const next = recordEveryoneDay(many, TODAY);
    expect(next).toHaveLength(POD_EVERYONE_DAYS_KEPT);
    expect(next[next.length - 1]).toBe(TODAY);
    expect(next[0]).toBe(many[1]);
  });

  it('summarises everyone days: total, current run, best run', () => {
    const list = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-20', '2026-11-25', '2026-11-26'];
    expect(everyoneDaysSummary(list, TODAY)).toEqual({ total: 6, current: 2, best: 3 });
    expect(everyoneDaysSummary([...list, TODAY], TODAY)).toEqual({ total: 7, current: 3, best: 3 });
    expect(everyoneDaysSummary(['2026-11-20'], TODAY)).toEqual({ total: 1, current: 0, best: 1 });
    expect(everyoneDaysSummary(undefined, TODAY)).toEqual({ total: 0, current: 0, best: 0 });
  });
});

describe('the week', () => {
  const d = (back: number) => shiftDay(TODAY, -back);

  it('counts sessions per app up to that app’s goal', () => {
    const m = member(
      'a',
      { [d(0)]: [s('workouts'), s('meditate')], [d(1)]: [s('workouts')], [d(2)]: [s('workouts'), s('workouts')] },
      { workouts: 3, meditate: 5 }
    );
    // Workouts 4 done, capped at 3; Meditate 1 of 5.
    expect(memberWeek(m, TODAY)).toEqual({ done: 4, goal: 8 });
  });

  it('counts Meals as days logged, not plates', () => {
    const m = member('a', { [d(0)]: [s('meals'), s('meals')], [d(3)]: [s('meals')] }, { meals: 5 });
    expect(memberWeek(m, TODAY)).toEqual({ done: 2, goal: 5 });
  });

  it('only looks at the rolling last 7 days', () => {
    const m = member('a', { [d(6)]: [s('meditate')], [d(7)]: [s('meditate')] }, { meditate: 7 });
    expect(memberWeek(m, TODAY)).toEqual({ done: 1, goal: 7 });
  });

  it("ignores apps that aren't on the member's Today, and junk goals", () => {
    const m = member('a', { [d(0)]: [s('hotcold'), s('meditate')] }, { meditate: 3, workouts: 0, meals: -2 });
    expect(memberWeek(m, TODAY)).toEqual({ done: 1, goal: 3 });
  });

  it('adds members up for the pod', () => {
    const a = member('a', { [d(0)]: [s('meditate')] }, { meditate: 3 });
    const b = member('b', { [d(1)]: [s('workouts')], [d(2)]: [s('workouts')] }, { workouts: 2 });
    expect(podWeek([a, b], TODAY)).toEqual({ done: 3, goal: 5 });
    expect(podWeek([], TODAY)).toEqual({ done: 0, goal: 0 });
  });
});

describe('reactions and nudges', () => {
  const session = s('workouts');
  const receiver = member('b', { [TODAY]: [session] });
  const reaction: PodReactionRecord = { from: 'a', to: 'b', kind: 'reaction', session_id: session.id, for_day: TODAY };
  const nudge: PodReactionRecord = { from: 'a', to: 'c', kind: 'nudge', for_day: TODAY };

  it('allows one reaction per sender per session', () => {
    expect(checkPodReaction(reaction, receiver, [])).toBe('ok');
    expect(checkPodReaction(reaction, receiver, [reaction])).toBe('already_sent');
    expect(checkPodReaction({ ...reaction, from: 'c' }, receiver, [reaction])).toBe('ok');
  });

  it('needs a session the receiver actually shared', () => {
    expect(checkPodReaction({ ...reaction, session_id: 'gone' }, receiver, [])).toBe('no_session');
    expect(checkPodReaction({ ...reaction, session_id: undefined }, receiver, [])).toBe('no_session');
  });

  it('never to yourself', () => {
    expect(checkPodReaction({ ...reaction, to: 'a' }, receiver, [])).toBe('self');
    expect(checkPodReaction({ ...nudge, to: 'a' }, member('a'), [])).toBe('self');
  });

  it('nudges only someone who hasn’t shown up, once a day per sender', () => {
    expect(checkPodReaction(nudge, member('c'), [])).toBe('ok');
    expect(checkPodReaction(nudge, member('c'), [nudge])).toBe('already_sent');
    expect(checkPodReaction(nudge, member('c'), [{ ...nudge, for_day: '2026-11-26' }])).toBe('ok');
    expect(checkPodReaction(nudge, on('c', TODAY), [])).toBe('already_showed_up');
  });

  it('caps pod pushes at POD_PUSHES_PER_DAY in any 24 hours', () => {
    const now = '2026-11-27T20:00:00Z';
    let history: string[] = [];
    for (let i = 0; i < POD_PUSHES_PER_DAY; i++) {
      expect(podPushAllows(history, now)).toBe(true);
      history = recordPodPush(history, now);
    }
    expect(podPushAllows(history, now)).toBe(false);
    expect(podPushAllows(history, '2026-11-28T20:00:01Z')).toBe(true);
  });

  it('drops old pushes from the stored history and refuses a bad clock', () => {
    const old = '2026-11-25T10:00:00Z';
    expect(recordPodPush([old, 'junk'], '2026-11-27T20:00:00Z')).toEqual(['2026-11-27T20:00:00.000Z']);
    expect(podPushAllows([], 'not a time')).toBe(false);
    expect(recordPodPush([old], 'not a time')).toEqual([old.replace('Z', '.000Z')]);
  });
});

describe('invites', () => {
  it('makes codes from the no-look-alike alphabet', () => {
    const code = makeInviteCode();
    expect(code).toHaveLength(6);
    expect([...code].every((c) => POD_INVITE_ALPHABET.includes(c))).toBe(true);
    expect(POD_INVITE_ALPHABET).not.toMatch(/[O0I1L5S8B2Z]/);
  });

  it('is deterministic with an injected random, and stays in range at the edges', () => {
    expect(makeInviteCode(() => 0)).toBe('AAAAAA');
    expect(makeInviteCode(() => 0.9999999)).toBe('999999');
    expect(makeInviteCode(() => 1)).toBe('999999');
  });

  it('reads what someone typed', () => {
    expect(normalizeInviteCode(' acd-efg ')).toBe('ACDEFG');
    expect(normalizeInviteCode('ACD EFG')).toBe('ACDEFG');
    expect(normalizeInviteCode('ACDEF')).toBeNull();
    expect(normalizeInviteCode('ACDEF0')).toBeNull();
  });

  it('expires after 7 days', () => {
    expect(newInvite('2026-11-27T12:00:00.000Z', () => 0)).toEqual({
      code: 'AAAAAA',
      expires_at: '2026-12-04T12:00:00.000Z',
    });
  });
});

describe('joining', () => {
  const invite = { code: 'ACDEFG', expires_at: '2026-12-04T12:00:00Z' };
  const base = {
    uid: 'z',
    code: 'ACDEFG',
    memberIds: ['a'],
    invite,
    podId: 'p1',
    nowIso: '2026-11-27T12:00:00Z',
  };

  it('lets someone in with a live code and room', () => {
    expect(checkJoin(base)).toBe('ok');
  });

  it(`holds at most ${POD_MAX_MEMBERS}`, () => {
    expect(checkJoin({ ...base, memberIds: ['a', 'b', 'c', 'd'] })).toBe('ok');
    expect(checkJoin({ ...base, memberIds: ['a', 'b', 'c', 'd', 'e'] })).toBe('full');
  });

  it('refuses a wrong, missing or expired code', () => {
    expect(checkJoin({ ...base, code: 'ACDEFH' })).toBe('no_invite');
    expect(checkJoin({ ...base, invite: null })).toBe('no_invite');
    expect(checkJoin({ ...base, nowIso: '2026-12-04T12:00:00Z' })).toBe('expired');
    expect(checkJoin({ ...base, invite: { ...invite, expires_at: 'junk' } })).toBe('expired');
  });

  it('one pod per person', () => {
    expect(checkJoin({ ...base, currentPodId: 'p2' })).toBe('in_another_pod');
    expect(checkJoin({ ...base, currentPodId: 'p1' })).toBe('ok');
    expect(checkJoin({ ...base, memberIds: ['a', 'z'] })).toBe('already_member');
  });
});

describe('leaving and removing', () => {
  it('only the starter removes, and not themselves', () => {
    expect(canRemoveMember('a', 'b', 'a', ['a', 'b'])).toBe(true);
    expect(canRemoveMember('b', 'a', 'a', ['a', 'b'])).toBe(false);
    expect(canRemoveMember('a', 'a', 'a', ['a', 'b'])).toBe(false);
    expect(canRemoveMember('a', 'x', 'a', ['a', 'b'])).toBe(false);
  });

  it('hands removing to the longest-standing member when the starter leaves', () => {
    expect(afterLeave(['a', 'b', 'c'], 'a', 'a')).toEqual({ memberIds: ['b', 'c'], createdBy: 'b', deletePod: false });
    expect(afterLeave(['a', 'b', 'c'], 'c', 'a')).toEqual({ memberIds: ['a', 'b'], createdBy: 'a', deletePod: false });
  });

  it('deletes the pod when the last person leaves', () => {
    expect(afterLeave(['a'], 'a', 'a')).toEqual({ memberIds: [], createdBy: null, deletePod: true });
  });
});

describe('first names', () => {
  it('trims and collapses spaces', () => {
    expect(cleanFirstName('  Mary   Jo ')).toBe('Mary Jo');
  });

  it("keeps names with accents, apostrophes, hyphens and scripts without case", () => {
    expect(cleanFirstName('Zoë')).toBe('Zoë');
    expect(cleanFirstName("D'Arcy")).toBe("D'Arcy");
    expect(cleanFirstName('Jean-Luc')).toBe('Jean-Luc');
    expect(cleanFirstName('翔太')).toBe('翔太');
  });

  it('refuses empty, too long, digits, links and symbols', () => {
    expect(cleanFirstName('   ')).toBeNull();
    expect(cleanFirstName(null)).toBeNull();
    expect(cleanFirstName('A'.repeat(21))).toBeNull();
    expect(cleanFirstName('A'.repeat(20))).toBe('A'.repeat(20));
    expect(cleanFirstName('Sam2')).toBeNull();
    expect(cleanFirstName('bit.ly/x')).toBeNull();
    expect(cleanFirstName('me@x.com')).toBeNull();
    expect(cleanFirstName('<b>Hi</b>')).toBeNull();
    expect(cleanFirstName("'-.")).toBeNull();
  });

  it("pre-fills Google's given name, else the first word of the full name", () => {
    expect(suggestedFirstName('Jonny', 'Jonny McFadden')).toBe('Jonny');
    expect(suggestedFirstName(null, 'Jonny McFadden')).toBe('Jonny');
    expect(suggestedFirstName('', '  Ana Lucía Pérez')).toBe('Ana');
    expect(suggestedFirstName(undefined, undefined)).toBeNull();
    expect(suggestedFirstName('j0nny', 'x@y.com')).toBeNull();
  });
});

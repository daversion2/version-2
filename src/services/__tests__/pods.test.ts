const mockHttpsCallable = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

import { addMockDocument, getMockDB } from '../__mocks__/firestore';
import {
  buildPodView,
  frictionLine,
  hardestLevel,
  inviteMessage,
  joinPodWithCode,
  loadPod,
  podErrorMessage,
  podErrorReason,
  podGoalsFrom,
  sendPodReaction,
  setPodFirstName,
  setPodFriction,
  setPodMuted,
  sharePodRating,
  startPod,
  syncPodMember,
  unsharePodRating,
  type PodData,
  type PodMember,
} from '../pods';
import { shiftDay } from '../podMath';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const member = (uid: string, over: Partial<PodMember> = {}): PodMember => ({
  uid,
  first_name: uid.toUpperCase(),
  joined_at: '2026-11-01T00:00:00Z',
  timezone: 'UTC',
  goals: { meditate: 3 },
  share_friction: true,
  days: {},
  ...over,
});

const memberData = (m: PodMember) => {
  const { uid: _uid, ...data } = m;
  return data;
};

const memberDoc = (podId: string, uid: string) => getMockDB()[`pods/${podId}/members`]?.[uid]?.data;

describe('calling the pod functions', () => {
  beforeEach(() => {
    mockHttpsCallable.mockImplementation((_fns: unknown, name: string) =>
      jest.fn(async (data: unknown) => ({ data: { name, data } }))
    );
  });

  it('starts a pod with the device time zone added', async () => {
    const out = (await startPod({ firstName: 'Ana', goals: { meditate: 3 }, shareFriction: true })) as any;
    expect(out.name).toBe('createPod');
    expect(out.data).toMatchObject({ firstName: 'Ana', goals: { meditate: 3 }, shareFriction: true });
    expect(typeof out.data.timezone).toBe('string');
  });

  it('joins with the code as typed (the server cleans it)', async () => {
    const out = (await joinPodWithCode('acd-efg', { firstName: 'Ben', goals: {}, shareFriction: false })) as any;
    expect(out.name).toBe('joinPod');
    expect(out.data).toMatchObject({ code: 'acd-efg', firstName: 'Ben', shareFriction: false });
  });

  it('sends a reaction as given', async () => {
    const out = (await sendPodReaction({ to: 'b', kind: 'nudge', preset: 'with_you' })) as any;
    expect(out).toEqual({ name: 'sendPodReaction', data: { to: 'b', kind: 'nudge', preset: 'with_you' } });
  });

  it("reads the server's reason and words it", () => {
    const err = Object.assign(new Error('x'), { details: { reason: 'full' } });
    expect(podErrorReason(err)).toBe('full');
    expect(podErrorMessage(err)).toBe('That pod is full: five is the most.');
    expect(podErrorReason(new Error('offline'))).toBeNull();
    expect(podErrorMessage(new Error('offline'))).toMatch(/connection/);
    expect(podErrorMessage(null)).toMatch(/connection/);
  });

  it('writes an invite with the code and the App Store link', () => {
    expect(inviteMessage('Ana', 'ACDEFG')).toMatch(/^Ana wants you in their Neuro-Nudge pod/);
    expect(inviteMessage('Ana', 'ACDEFG')).toContain('apps.apple.com');
    expect(inviteMessage(null, 'ACDEFG')).toMatch(/^Want you in/);
    expect(inviteMessage('Ana', 'ACDEFG')).toContain('ACDEFG');
  });
});

describe('reading a pod', () => {
  it('returns null for a pod that is gone', async () => {
    expect(await loadPod('nope')).toBeNull();
  });

  it('returns members in join order, and the reactions', async () => {
    addMockDocument('pods', 'p1', { created_by: 'a', created_at: 'x', member_ids: ['b', 'a'], everyone_days: [] });
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    addMockDocument('pods/p1/members', 'b', memberData(member('b')));
    addMockDocument('pods/p1/reactions', 'r1', { from: 'a', to: 'b', kind: 'nudge', preset: 'with_you', for_day: 'd', created_at: 'x' });
    const data = await loadPod('p1');
    expect(data?.members.map((m) => m.uid)).toEqual(['b', 'a']);
    expect(data?.reactions).toEqual([expect.objectContaining({ id: 'r1', kind: 'nudge' })]);
    expect(data?.pod.id).toBe('p1');
  });

  it('skips a member id whose doc is missing', async () => {
    addMockDocument('pods', 'p1', { created_by: 'a', created_at: 'x', member_ids: ['a', 'ghost'] });
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    expect((await loadPod('p1'))?.members.map((m) => m.uid)).toEqual(['a']);
  });
});

describe('sharing a rating', () => {
  it('does nothing without a pod', async () => {
    expect(await sharePodRating('a', undefined, { logId: 'l1', appId: 'workouts', date: today() })).toBe(false);
    expect(await sharePodRating('a', 'p1', { logId: 'l1', appId: 'workouts', date: today() })).toBe(false);
  });

  it('adds the session with both ratings when friction is shared', async () => {
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    expect(await sharePodRating('a', 'p1', { logId: 'l1', appId: 'workouts', date: today(), start: 3, keep: 2 })).toBe(true);
    expect(memberDoc('p1', 'a').days).toEqual({ [today()]: [{ id: 'l1', app: 'workouts', start: 3, keep: 2 }] });
  });

  it('leaves the ratings out when friction is off', async () => {
    addMockDocument('pods/p1/members', 'a', memberData(member('a', { share_friction: false })));
    await sharePodRating('a', 'p1', { logId: 'l1', appId: 'meals', date: today(), day: 3 });
    expect(memberDoc('p1', 'a').days).toEqual({ [today()]: [{ id: 'l1', app: 'meals' }] });
  });

  it('a re-rating replaces, never doubles', async () => {
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    await sharePodRating('a', 'p1', { logId: 'l1', appId: 'meditate', date: today(), start: 3 });
    await sharePodRating('a', 'p1', { logId: 'l1', appId: 'meditate', date: today(), start: 1 });
    expect(memberDoc('p1', 'a').days[today()]).toEqual([{ id: 'l1', app: 'meditate', start: 1 }]);
  });

  it('takes a deleted rating back out, finding the pod itself', async () => {
    addMockDocument('users', 'a', { pod_id: 'p1' });
    addMockDocument('pods/p1/members', 'a', memberData(member('a', { days: { [today()]: [{ id: 'l1', app: 'meals' }, { id: 'l2', app: 'workouts' }] } })));
    expect(await unsharePodRating('a', 'l1')).toBe(true);
    expect(memberDoc('p1', 'a').days).toEqual({ [today()]: [{ id: 'l2', app: 'workouts' }] });
    expect(await unsharePodRating('a', 'l1')).toBe(false);
  });

  it('unsharing without a pod is a no-op', async () => {
    addMockDocument('users', 'a', {});
    expect(await unsharePodRating('a', 'l1')).toBe(false);
    expect(await unsharePodRating('nobody', 'l1')).toBe(false);
  });
});

describe('your own settings', () => {
  it('turning friction off strips what is already shared', async () => {
    const days = { [today()]: [{ id: 'l1', app: 'workouts', start: 3, keep: 3 }] };
    addMockDocument('pods/p1/members', 'a', memberData(member('a', { days })));
    await setPodFriction('a', 'p1', false, days);
    expect(memberDoc('p1', 'a')).toMatchObject({ share_friction: false, days: { [today()]: [{ id: 'l1', app: 'workouts' }] } });
  });

  it('turning it on leaves past sessions alone', async () => {
    const days = { [today()]: [{ id: 'l1', app: 'workouts' }] };
    addMockDocument('pods/p1/members', 'a', memberData(member('a', { days, share_friction: false })));
    await setPodFriction('a', 'p1', true, days);
    expect(memberDoc('p1', 'a')).toMatchObject({ share_friction: true, days });
  });

  it('syncs goals and time zone only when they changed', async () => {
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(await syncPodMember('a', 'p1', { goals: { meditate: 3 }, timezone: tz }, { meditate: 3 })).toBe(false);
    expect(await syncPodMember('a', 'p1', { goals: { meditate: 3 }, timezone: tz }, { meditate: 4 })).toBe(true);
    expect(memberDoc('p1', 'a').goals).toEqual({ meditate: 4 });
  });

  it('sets a first name on the profile and in the pod, cleaned', async () => {
    addMockDocument('users', 'a', {});
    addMockDocument('pods/p1/members', 'a', memberData(member('a')));
    expect(await setPodFirstName('a', 'p1', '  Ana ')).toBe('Ana');
    expect(getMockDB().users.a.data.first_name).toBe('Ana');
    expect(memberDoc('p1', 'a').first_name).toBe('Ana');
    await expect(setPodFirstName('a', 'p1', 'x@y.com')).rejects.toThrow(/first name/);
  });

  it('mutes pod notifications on the profile', async () => {
    await setPodMuted('a', true);
    expect(getMockDB().users.a.data.pod_muted).toBe(true);
  });

  it('counts only the apps on your Today', () => {
    expect(podGoalsFrom({ meditate: 3, workouts: 3, meals: 5 }, ['meals'])).toEqual({ meditate: 3, workouts: 3 });
    expect(podGoalsFrom({ meditate: 0 }, [])).toEqual({});
  });
});

describe('friction words', () => {
  it("uses the rating sheet's own words", () => {
    expect(frictionLine({ id: 's', app: 'workouts', start: 3, keep: 3 })).toBe('Almost didn’t · Took everything');
    expect(frictionLine({ id: 's', app: 'meditate', start: 1 })).toBe('Easy start');
    expect(frictionLine({ id: 's', app: 'meals', day: 2 })).toBe('Said no a few times');
    expect(frictionLine({ id: 's', app: 'workouts' })).toBeNull();
  });

  it('tints by the hardest level shared', () => {
    expect(hardestLevel({ id: 's', app: 'workouts', start: 1, keep: 3 })).toBe(3);
    expect(hardestLevel({ id: 's', app: 'meals' })).toBeNull();
  });
});

describe('buildPodView', () => {
  const NOW = new Date('2026-11-27T15:00:00Z');
  const T = '2026-11-27';
  const pod = (members: PodMember[], over: Partial<PodData['pod']> = {}): PodData['pod'] => ({
    id: 'p1',
    created_by: 'a',
    created_at: 'x',
    member_ids: members.map((m) => m.uid),
    everyone_days: [],
    invite: { code: 'ACDEFG', expires_at: '2026-12-01T00:00:00Z' },
    ...over,
  });

  it('shows who showed up today, with reactions', () => {
    const a = member('a', { days: { [T]: [{ id: 'l1', app: 'workouts', start: 3 }] } });
    const b = member('b');
    const data: PodData = {
      pod: pod([a, b]),
      members: [a, b],
      reactions: [
        { id: 'r1', from: 'b', to: 'a', kind: 'reaction', preset: 'hard_one', session_id: 'l1', for_day: T, created_at: 'x' },
      ],
    };
    const asB = buildPodView(data, 'b', NOW);
    const rowA = asB.members[0];
    expect(rowA).toMatchObject({ name: 'A', isStarter: true, showedUpToday: true, canNudge: false, isMe: false });
    expect(rowA.sessionsToday[0]).toMatchObject({
      appLabel: 'Workouts',
      friction: 'Almost didn’t',
      level: 3,
      myReaction: 'hard_one',
      canReact: false,
      reactions: [{ preset: 'hard_one', label: 'Hard one, done', count: 1 }],
    });
    // B hasn't shown up; A can nudge B, B can't nudge themselves.
    expect(asB.members[1]).toMatchObject({ isMe: true, canNudge: false });
    expect(buildPodView(data, 'a', NOW).members[1]).toMatchObject({ canNudge: true, nudgedByMe: false });
    // A can't react to their own session.
    expect(buildPodView(data, 'a', NOW).members[0].sessionsToday[0].canReact).toBe(false);
  });

  it('marks a nudge already sent today', () => {
    const a = member('a');
    const b = member('b');
    const data: PodData = {
      pod: pod([a, b]),
      members: [a, b],
      reactions: [{ id: 'n', from: 'a', to: 'b', kind: 'nudge', preset: 'with_you', for_day: T, created_at: 'x' }],
    };
    expect(buildPodView(data, 'a', NOW).members[1]).toMatchObject({ canNudge: false, nudgedByMe: true });
  });

  it("uses each member's own today", () => {
    // 15:00 UTC is already the 28th in Tokyo? No: 00:00 JST on the 28th is 15:00 UTC on the 27th.
    const tokyo = member('b', { timezone: 'Asia/Tokyo', days: { '2026-11-28': [{ id: 'x', app: 'meals' }] } });
    const a = member('a');
    const view = buildPodView({ pod: pod([a, tokyo]), members: [a, tokyo], reactions: [] }, 'a', NOW);
    expect(view.members[1]).toMatchObject({ today: '2026-11-28', showedUpToday: true });
  });

  it('adds up the week, the streak and everyone days', () => {
    const a = member('a', { goals: { workouts: 2 }, days: { [T]: [{ id: '1', app: 'workouts' }], [shiftDay(T, -1)]: [{ id: '2', app: 'workouts' }] } });
    const b = member('b', { goals: { meditate: 3 }, days: { [T]: [{ id: '3', app: 'meditate' }] } });
    const view = buildPodView(
      { pod: pod([a, b], { everyone_days: [T] }), members: [a, b], reactions: [] },
      'a',
      NOW
    );
    expect(view.week).toEqual({ done: 3, goal: 5 });
    expect(view.summary).toBe('Pod: 3 of 5 this week · 2-day streak');
    expect(view.everyoneToday).toBe(true);
    expect(view.everyone).toEqual({ total: 1, current: 1, best: 1 });
    expect(view.members[0].week).toEqual([false, false, false, false, false, true, true]);
    expect(view.weekDays[6]).toBe(T);
  });

  it('a pod of one is alone, and only the starter can remove', () => {
    const a = member('a');
    expect(buildPodView({ pod: pod([a]), members: [a], reactions: [] }, 'a', NOW).alone).toBe(true);
    const b = member('b');
    const data: PodData = { pod: pod([a, b]), members: [a, b], reactions: [] };
    expect(buildPodView(data, 'a', NOW).members[1].canRemove).toBe(true);
    expect(buildPodView(data, 'b', NOW).members[0].canRemove).toBe(false);
    expect(buildPodView(data, 'a', NOW).isStarter).toBe(true);
  });

  it('an invite is live until it expires or the pod is full', () => {
    const ms = ['a', 'b'].map((u) => member(u));
    expect(buildPodView({ pod: pod(ms), members: ms, reactions: [] }, 'a', NOW).invite?.live).toBe(true);
    const expired = pod(ms, { invite: { code: 'ACDEFG', expires_at: '2026-11-01T00:00:00Z' } });
    expect(buildPodView({ pod: expired, members: ms, reactions: [] }, 'a', NOW).invite?.live).toBe(false);
    const five = ['a', 'b', 'c', 'd', 'e'].map((u) => member(u));
    expect(buildPodView({ pod: pod(five), members: five, reactions: [] }, 'a', NOW).invite?.live).toBe(false);
    expect(buildPodView({ pod: pod(ms, { invite: null }), members: ms, reactions: [] }, 'a', NOW).invite).toBeNull();
  });
});

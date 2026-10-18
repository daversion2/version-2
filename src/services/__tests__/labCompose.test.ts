import {
  composeDisplayTitle,
  composeSessionMeta,
  composeStepIndex,
  createComposeSession,
  deleteComposeSession,
  effectiveStatus,
  formatClock,
  renameComposeSession,
  saveComposeSession,
  splitComposeSessions,
  unsaveComposeSession,
  watchComposeSession,
  watchComposeSessions,
  watchComposeUsage,
} from '../labCompose';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';
import type { ComposeRequest, ComposeSession } from '../../utils/meditation/compose';

const COL = 'users/u1/lab_compose';
const known = { voices: ['daisy', 'regina'], ambience: ['rain'] };
const req: ComposeRequest = {
  request: '  Calm before my first 400m race  ',
  kind: 'imagery',
  minutes: 6,
  voice: 'regina',
  ambience: 'rain',
};
const NOW = new Date('2026-10-18T09:00:00.000Z');

const session = (id: string, extra: Partial<ComposeSession> = {}): ComposeSession => ({
  id,
  ...req,
  status: 'ready',
  saved: false,
  created_at: '2026-10-18T08:00:00.000Z',
  updated_at: '2026-10-18T08:01:00.000Z',
  ...extra,
});

describe('createComposeSession', () => {
  it('queues a trimmed request, unsaved, returning the id at once', async () => {
    const { id, written } = createComposeSession('u1', req, known, NOW);
    expect(typeof id).toBe('string');
    await written;
    expect(getMockDB()[COL][id].data).toEqual({
      request: 'Calm before my first 400m race',
      kind: 'imagery',
      minutes: 6,
      voice: 'regina',
      ambience: 'rain',
      status: 'queued',
      saved: false,
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    });
  });

  it('refuses a request the server would reject, writing nothing', () => {
    expect(() => createComposeSession('u1', { ...req, minutes: 30 }, known, NOW)).toThrow(/minutes/);
    expect(getMockDB()[COL]).toBeUndefined();
  });
});

describe('saving, renaming, deleting', () => {
  beforeEach(() => addMockDocument(COL, 's1', session('s1')));

  it('saves to My recordings, with an optional new title', async () => {
    await saveComposeSession('u1', 's1', '  Race morning  ', NOW);
    expect(getMockDB()[COL].s1.data).toMatchObject({ saved: true, saved_at: NOW.toISOString(), title: 'Race morning' });
  });

  it('keeps the title when saving without one', async () => {
    addMockDocument(COL, 's1', session('s1', { title: 'Original' }));
    await saveComposeSession('u1', 's1', '   ', NOW);
    expect(getMockDB()[COL].s1.data).toMatchObject({ saved: true, title: 'Original' });
  });

  it('unsaves', async () => {
    await saveComposeSession('u1', 's1', undefined, NOW);
    await unsaveComposeSession('u1', 's1', NOW);
    expect(getMockDB()[COL].s1.data.saved).toBe(false);
  });

  it('renames, and will not blank the name', async () => {
    await renameComposeSession('u1', 's1', 'New name', NOW);
    expect(getMockDB()[COL].s1.data.title).toBe('New name');
    await expect(renameComposeSession('u1', 's1', '   ', NOW)).rejects.toThrow();
  });

  it('deletes', async () => {
    await deleteComposeSession('u1', 's1');
    expect(getMockDB()[COL].s1).toBeUndefined();
  });
});

describe('watching', () => {
  it('delivers the list with ids', async () => {
    addMockDocument(COL, 's1', session('s1'));
    const got = await new Promise<ComposeSession[]>((resolve) => watchComposeSessions('u1', resolve));
    expect(got.map((s) => s.id)).toEqual(['s1']);
  });

  it('delivers one session, or null when it is gone', async () => {
    addMockDocument(COL, 's1', session('s1'));
    const one = await new Promise<ComposeSession | null>((resolve) => watchComposeSession('u1', 's1', resolve));
    expect(one?.id).toBe('s1');
    const gone = await new Promise<ComposeSession | null>((resolve) => watchComposeSession('u1', 'nope', resolve));
    expect(gone).toBeNull();
  });
});

describe('watchComposeUsage', () => {
  it('delivers the allowance, or null before any session', async () => {
    const none = await new Promise((resolve) => watchComposeUsage('u1', resolve));
    expect(none).toBeNull();
    addMockDocument('composeUsage', 'u1', { month: '2026-10', minutes: 12 });
    const usage = await new Promise((resolve) => watchComposeUsage('u1', resolve));
    expect(usage).toEqual({ month: '2026-10', minutes: 12 });
  });
});

describe('effectiveStatus', () => {
  it('passes finished statuses through', () => {
    expect(effectiveStatus(session('a', { status: 'ready', updated_at: '2020-01-01T00:00:00Z' }), NOW)).toBe('ready');
  });

  it('treats a session stuck working for over 15 minutes as failed', () => {
    expect(effectiveStatus(session('a', { status: 'recording', updated_at: '2026-10-18T08:50:00.000Z' }), NOW)).toBe(
      'recording',
    );
    expect(effectiveStatus(session('a', { status: 'recording', updated_at: '2026-10-18T08:40:00.000Z' }), NOW)).toBe(
      'failed',
    );
  });
});

describe('splitComposeSessions', () => {
  it('puts saved ones in My recordings by save time, the rest in Recent by creation', () => {
    const { saved, recent } = splitComposeSessions([
      session('old-saved', { saved: true, saved_at: '2026-10-18T08:10:00Z' }),
      session('new-saved', { saved: true, saved_at: '2026-10-18T08:30:00Z' }),
      session('old', { created_at: '2026-10-17T08:00:00Z' }),
      session('new', { created_at: '2026-10-18T08:00:00Z' }),
    ]);
    expect(saved.map((s) => s.id)).toEqual(['new-saved', 'old-saved']);
    expect(recent.map((s) => s.id)).toEqual(['new', 'old']);
  });
});

describe('display helpers', () => {
  it('steps through writing, recording, mixing, done', () => {
    expect(['queued', 'writing', 'recording', 'mixing', 'ready', 'failed'].map((s) => composeStepIndex(s as never))).toEqual([
      0, 0, 1, 2, 3, 3,
    ]);
  });

  it('formats a clock', () => {
    expect(formatClock(360)).toBe('6:00');
    expect(formatClock(65.4)).toBe('1:05');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('shows the title once written, else a trimmed request', () => {
    expect(composeDisplayTitle({ title: 'Race day', request: 'x' })).toBe('Race day');
    expect(composeDisplayTitle({ request: 'short one' })).toBe('short one');
    expect(composeDisplayTitle({ request: 'a'.repeat(60) })).toHaveLength(48);
  });

  it('describes a session in one line', () => {
    expect(composeSessionMeta(session('a'))).toBe('Guided imagery · 6 min · Regina · Rain');
    expect(composeSessionMeta(session('a', { kind: 'meditation', ambience: null, voice: 'daisy' }))).toBe(
      'Meditation · 6 min · Daisy · No background',
    );
  });
});

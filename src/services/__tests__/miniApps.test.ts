// The library's mock exports the store itself; the app reads `.default` like the real module.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

import {
  canOpenMiniApp,
  checkinMetricsFor,
  finishSession,
  isHabitLinkedToMiniApp,
  takePendingFinish,
} from '../miniApps';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../miniAppDrafts';
import type { TrackingField } from '../../data/practices';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('canOpenMiniApp', () => {
  it('opens a Lab mini-app for admins only', () => {
    expect(canOpenMiniApp('workouts', { is_admin: true })).toBe(true);
    expect(canOpenMiniApp('workouts', { is_admin: false })).toBe(false);
    expect(canOpenMiniApp('workouts', {})).toBe(false);
    expect(canOpenMiniApp('workouts', null)).toBe(false);
  });
});

describe('isHabitLinkedToMiniApp', () => {
  it('links library Workout habits automatically', () => {
    expect(isHabitLinkedToMiniApp('workouts', { id: 'h1', practice_id: 'workout' })).toBe(true);
    expect(isHabitLinkedToMiniApp('workouts', { id: 'h2', practice_id: 'trad-exercise' })).toBe(true);
  });

  it('links any other habit only when the user chose to', () => {
    const legDay = { id: 'custom-1' };
    expect(isHabitLinkedToMiniApp('workouts', legDay)).toBe(false);
    expect(isHabitLinkedToMiniApp('workouts', legDay, ['custom-1'])).toBe(true);
    expect(isHabitLinkedToMiniApp('workouts', { id: 'h3', practice_id: 'meditation' }, [])).toBe(false);
  });
});

describe('the finish handoff', () => {
  it('is read once', () => {
    finishSession({ appId: 'workouts', habitId: 'h1', durationSec: 1800 });
    expect(takePendingFinish()).toEqual({ appId: 'workouts', habitId: 'h1', durationSec: 1800 });
    expect(takePendingFinish()).toBeNull();
  });

  it('keeps only the latest finish', () => {
    finishSession({ appId: 'workouts', habitId: 'a' });
    finishSession({ appId: 'workouts', habitId: 'b' });
    expect(takePendingFinish()?.habitId).toBe('b');
  });
});

describe('checkinMetricsFor', () => {
  const duration: TrackingField = {
    key: 'duration_min',
    label: 'How long?',
    type: 'duration',
    unit: 'min',
    min: 10,
    max: 120,
    step: 5,
  };

  it('snaps the session length to the habit’s duration slider', () => {
    expect(checkinMetricsFor([duration], { durationSec: 32 * 60 })).toEqual({ duration_min: 30 });
    expect(checkinMetricsFor([duration], { durationSec: 33 * 60 })).toEqual({ duration_min: 35 });
  });

  it('clamps to the slider’s bounds', () => {
    expect(checkinMetricsFor([duration], { durationSec: 4 * 60 })).toEqual({ duration_min: 10 });
    expect(checkinMetricsFor([duration], { durationSec: 200 * 60 })).toEqual({ duration_min: 120 });
  });

  it('prefills nothing when the habit has no duration field', () => {
    expect(checkinMetricsFor([], { durationSec: 1800 })).toBeUndefined();
    expect(checkinMetricsFor(undefined, { durationSec: 1800 })).toBeUndefined();
    expect(checkinMetricsFor([duration], {})).toBeUndefined();
  });
});

describe('session drafts', () => {
  beforeEach(() => AsyncStorage.clear());

  it('saves, loads and clears per app and user', async () => {
    await saveSessionDraft('workouts', 'u1', { sets: 4 }, new Date('2026-10-17T10:00:00Z'));
    expect(await loadSessionDraft('workouts', 'u1')).toEqual({
      data: { sets: 4 },
      savedAt: '2026-10-17T10:00:00.000Z',
    });
    expect(await loadSessionDraft('workouts', 'u2')).toBeNull();

    await clearSessionDraft('workouts', 'u1');
    expect(await loadSessionDraft('workouts', 'u1')).toBeNull();
  });

  it('drops a draft it cannot read', async () => {
    await AsyncStorage.setItem('miniapp_draft:workouts:u1', 'not json');
    expect(await loadSessionDraft('workouts', 'u1')).toBeNull();
    expect(await AsyncStorage.getItem('miniapp_draft:workouts:u1')).toBeNull();
  });

  it('drops a draft from another format version', async () => {
    await AsyncStorage.setItem('miniapp_draft:workouts:u1', JSON.stringify({ v: 99, data: {} }));
    expect(await loadSessionDraft('workouts', 'u1')).toBeNull();
  });
});

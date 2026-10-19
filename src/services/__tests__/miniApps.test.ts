// The library's mock exports the store itself; the app reads `.default` like the real module.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

import {
  canOpenMiniApp,
  checkinMetricsFor,
  finishSession,
  takePendingFinish,
} from '../miniApps';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../miniAppDrafts';
import type { TrackingField } from '../../data/practices';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('canOpenMiniApp', () => {
  it('opens a Lab mini-app for admins only', () => {
    // Compose is still in the Lab.
    expect(canOpenMiniApp('compose', { is_admin: true })).toBe(true);
    expect(canOpenMiniApp('compose', { is_admin: false })).toBe(false);
    expect(canOpenMiniApp('compose', {})).toBe(false);
    expect(canOpenMiniApp('compose', null)).toBe(false);
  });

  it('opens the live mini-apps for everyone', () => {
    // Workouts, Meditate and Meals went live on 2026-10-18.
    for (const id of ['workouts', 'meditate', 'meals'] as const) {
      expect(canOpenMiniApp(id, { is_admin: false })).toBe(true);
      expect(canOpenMiniApp(id, null)).toBe(true);
    }
  });
});

describe('the finish handoff', () => {
  it('is read once', () => {
    finishSession({ appId: 'workouts', durationSec: 1800, date: '2026-10-17' });
    expect(takePendingFinish()).toEqual({ appId: 'workouts', durationSec: 1800, date: '2026-10-17' });
    expect(takePendingFinish()).toBeNull();
  });

  it('keeps only the latest finish', () => {
    finishSession({ appId: 'workouts' });
    finishSession({ appId: 'meditate', mode: 'nsdr' });
    expect(takePendingFinish()).toEqual({ appId: 'meditate', mode: 'nsdr' });
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

  const technique: TrackingField = {
    key: 'technique',
    label: 'Technique',
    type: 'choice',
    options: [
      { value: 'breath', label: 'Breath focus' },
      { value: 'body_scan', label: 'Body scan' },
    ],
  };

  it('prefills a choice the habit’s field offers, alongside the duration', () => {
    expect(
      checkinMetricsFor([duration, technique], { durationSec: 20 * 60, choices: { technique: 'body_scan' } })
    ).toEqual({ duration_min: 20, technique: 'body_scan' });
    expect(checkinMetricsFor([technique], { choices: { technique: 'breath' } })).toEqual({ technique: 'breath' });
  });

  it('drops a choice the habit doesn’t offer, or a field it doesn’t have', () => {
    // A breathwork pattern handed to a meditation habit.
    expect(checkinMetricsFor([technique], { choices: { technique: '478' } })).toBeUndefined();
    expect(checkinMetricsFor([duration], { durationSec: 1200, choices: { technique: 'breath' } })).toEqual({
      duration_min: 20,
    });
    // A duration field with the same key is not a choice field.
    expect(checkinMetricsFor([duration], { choices: { duration_min: '5' } })).toBeUndefined();
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

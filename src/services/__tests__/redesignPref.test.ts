// The library's mock exports the store itself; the app reads `.default` like the real module.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

import { loadRedesignPref, saveRedesignPref } from '../redesignPref';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

beforeEach(() => AsyncStorage.clear());

describe('redesign pref', () => {
  it('is off on a device that never saved it', async () => {
    expect(await loadRedesignPref()).toBe(false);
  });

  it('remembers on, and clears on off', async () => {
    await saveRedesignPref(true);
    expect(await loadRedesignPref()).toBe(true);
    await saveRedesignPref(false);
    expect(await loadRedesignPref()).toBe(false);
  });

  it('reads as off when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await loadRedesignPref()).toBe(false);
  });
});

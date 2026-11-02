// The library's mock exports the store itself; the app reads `.default` like the real module.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

import { loadClassicPref, saveClassicPref } from '../redesignPref';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

beforeEach(() => AsyncStorage.clear());

describe('classic-look pref', () => {
  it('is off on a device that never saved it, so the redesign shows', async () => {
    expect(await loadClassicPref()).toBe(false);
  });

  it('ignores the old redesign key', async () => {
    await AsyncStorage.setItem('nn.redesign', '1');
    expect(await loadClassicPref()).toBe(false);
  });

  it('remembers on, and clears on off', async () => {
    await saveClassicPref(true);
    expect(await loadClassicPref()).toBe(true);
    await saveClassicPref(false);
    expect(await loadClassicPref()).toBe(false);
  });

  it('reads as off when storage fails, so a broken disk still gets the redesign', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await loadClassicPref()).toBe(false);
  });
});

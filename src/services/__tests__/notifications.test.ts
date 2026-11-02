const mockNotifications = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
};
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'Europe/London' }] }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../auth', () => ({ logOut: jest.fn() }));

import { refreshPushToken } from '../notifications';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';

const token = () => getMockDB().users?.u1?.data.expoPushToken;

beforeEach(() => {
  addMockDocument('users', 'u1', { id: 'u1', expoPushToken: 'ExponentPushToken[old]' });
  mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[new]' });
});

describe('refreshPushToken', () => {
  it('saves the device’s token when it has changed', async () => {
    expect(await refreshPushToken('u1', 'ExponentPushToken[old]')).toBe('ExponentPushToken[new]');
    expect(token()).toBe('ExponentPushToken[new]');
  });

  it('writes nothing when the token is the same', async () => {
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[old]' });
    expect(await refreshPushToken('u1', 'ExponentPushToken[old]')).toBeNull();
    expect(token()).toBe('ExponentPushToken[old]');
  });

  it('leaves push off for someone who turned it off (no saved token)', async () => {
    expect(await refreshPushToken('u1', null)).toBeNull();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('never prompts: without permission it does nothing', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    expect(await refreshPushToken('u1', 'ExponentPushToken[old]')).toBeNull();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(token()).toBe('ExponentPushToken[old]');
  });

  it('never throws', async () => {
    mockNotifications.getExpoPushTokenAsync.mockRejectedValue(new Error('no network'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(refreshPushToken('u1', 'ExponentPushToken[old]')).resolves.toBeNull();
    warn.mockRestore();
  });
});

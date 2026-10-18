const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
};
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../habitReminders', () => ({ ensureReminderPermissions: jest.fn() }));

import { cancelBell, getBellPermission, scheduleBell } from '../sessionBell';

describe('sessionBell', () => {
  it('rings with a sound — a local notification without one arrives silently on iOS', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('bell-1');
    expect(await scheduleBell(600.4, { title: 'Time', body: 'Done' })).toBe('bell-1');
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Time', body: 'Done', sound: 'default' },
      trigger: { type: 'timeInterval', seconds: 600, repeats: false },
    });
  });

  it('schedules nothing without permission, and never prompts on its own', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    expect(await scheduleBell(600, { title: 'Time', body: 'Done' })).toBeUndefined();
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await getBellPermission()).toBe('denied');
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    expect(await getBellPermission()).toBe('undetermined');
  });

  it('survives a failed schedule or cancel', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.scheduleNotificationAsync.mockRejectedValue(new Error('nope'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await scheduleBell(60, { title: 'Time', body: 'Done' })).toBeUndefined();
    mockNotifications.cancelScheduledNotificationAsync.mockRejectedValue(new Error('gone'));
    await expect(cancelBell('bell-1')).resolves.toBeUndefined();
    await expect(cancelBell(undefined)).resolves.toBeUndefined();
  });
});

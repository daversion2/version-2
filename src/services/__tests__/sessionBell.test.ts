const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
};
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../habitReminders', () => ({ ensureReminderPermissions: jest.fn() }));

import { cancelBell, getBellPermission, isSessionBell, scheduleBell, SESSION_BELL_KIND } from '../sessionBell';

describe('sessionBell', () => {
  it('rings with a sound — a local notification without one arrives silently on iOS', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('bell-1');
    expect(await scheduleBell(600.4, { title: 'Time', body: 'Done' })).toBe('bell-1');
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Time', body: 'Done', sound: 'default', data: { kind: SESSION_BELL_KIND } },
      trigger: { type: 'timeInterval', seconds: 600, repeats: false },
    });
  });

  it('tags every bell, keeping what the caller routes on — the tag lets it ring with the app open', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('bell-2');
    await scheduleBell(300, { title: 'Time', body: 'Done', data: { open: 'MeditateApp' } });
    const { content } = mockNotifications.scheduleNotificationAsync.mock.calls.at(-1)[0];
    expect(content.data).toEqual({ open: 'MeditateApp', kind: 'session-bell' });
    expect(isSessionBell(content.data)).toBe(true);
  });

  it('tells a bell from every other notification', () => {
    expect(isSessionBell({ kind: 'session-bell' })).toBe(true);
    expect(isSessionBell({ kind: 'reminder' })).toBe(false);
    expect(isSessionBell({ screen: 'MicroExerciseFollowUp' })).toBe(false);
    expect(isSessionBell(undefined)).toBe(false);
    expect(isSessionBell(null)).toBe(false);
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

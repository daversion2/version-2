const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
};
jest.mock('expo-notifications', () => mockNotifications);
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
const mockEnsure = jest.fn();
jest.mock('../habitReminders', () => ({ ensureReminderPermissions: () => mockEnsure() }));

import {
  CLOSEOUT_REMINDER_ID,
  formatReminderTime,
  parseTime,
  setCloseOutReminder,
  syncCloseOutReminder,
} from '../closeOutReminder';
import { getMockDB } from '../__mocks__/firestore';

beforeEach(() => jest.clearAllMocks());

describe('times', () => {
  it('reads and writes clock times', () => {
    expect(parseTime('21:00')).toEqual({ hour: 21, minute: 0 });
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime(null)).toBeNull();
    expect(formatReminderTime('21:00')).toBe('9 PM');
    expect(formatReminderTime('19:30')).toBe('7:30 PM');
    expect(formatReminderTime('00:00')).toBe('12 AM');
  });
});

describe('setCloseOutReminder', () => {
  it('schedules one daily notification under a fixed id and saves the time', async () => {
    mockEnsure.mockResolvedValue(true);
    expect(await setCloseOutReminder('u1', '20:00')).toBe(true);
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: CLOSEOUT_REMINDER_ID,
        trigger: { type: 'daily', hour: 20, minute: 0 },
      })
    );
    expect(getMockDB().users.u1.data.closeout_reminder_time).toBe('20:00');
  });

  it('saves nothing when permission is refused', async () => {
    mockEnsure.mockResolvedValue(false);
    expect(await setCloseOutReminder('u1', '20:00')).toBe(false);
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(getMockDB().users?.u1).toBeUndefined();
  });

  it('turns off with null', async () => {
    expect(await setCloseOutReminder('u1', null)).toBe(false);
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(CLOSEOUT_REMINDER_ID);
    expect(getMockDB().users.u1.data.closeout_reminder_time).toBeNull();
  });
});

describe('syncCloseOutReminder', () => {
  it('reschedules a saved time without ever prompting', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await syncCloseOutReminder('21:00');
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('does nothing without permission, and cancels with no time saved', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await syncCloseOutReminder('21:00');
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    await syncCloseOutReminder(undefined);
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(CLOSEOUT_REMINDER_ID);
  });
});

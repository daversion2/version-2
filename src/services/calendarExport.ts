import { Linking, Alert } from 'react-native';

/**
 * Export a planned item to the device calendar by opening a Google Calendar
 * event creation URL. Pre-fills title, dates, and notes.
 * Uses only React Native's built-in Linking API — zero native modules needed.
 */
export async function exportToCalendar(params: {
  title: string;
  notes?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<boolean> {
  try {
    const now = new Date();
    const start = params.startDate || now;
    const end = params.endDate || addMinutes(now, 30);

    const url = buildGoogleCalendarURL(params.title, start, end, params.notes);
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }

    Alert.alert(
      'Cannot Open Calendar',
      'Unable to open the calendar link. Please add the event manually.'
    );
    return false;
  } catch (err) {
    console.warn('Calendar export failed:', err);
    return false;
  }
}

function buildGoogleCalendarURL(
  title: string,
  start: Date,
  end: Date,
  notes?: string
): string {
  const startStr = formatGCalDate(start);
  const endStr = formatGCalDate(end);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
  });

  if (notes) {
    params.set('details', notes);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Format Date to Google Calendar format: YYYYMMDDTHHMMSSZ */
function formatGCalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60000);
}

import {
  CHECKIN_SLOT_ORDER,
  CheckinSlot,
  JourneyCheckin,
  referenceCheckin,
  slotForJourneyDay,
} from '../checkins';

const take = (mood: number, date = '2026-01-01'): JourneyCheckin => ({
  mood,
  focus: mood,
  motivation: mood,
  date,
});

describe('slotForJourneyDay', () => {
  it('reads an early visit as the two-week take', () => {
    expect(slotForJourneyDay(14)).toBe('day14');
    expect(slotForJourneyDay(20)).toBe('day14');
  });

  it('reads day 21 onward as the four-week take', () => {
    expect(slotForJourneyDay(21)).toBe('day28');
    expect(slotForJourneyDay(28)).toBe('day28');
    expect(slotForJourneyDay(60)).toBe('day28');
  });
});

describe('referenceCheckin', () => {
  it('prefers the day-0 baseline when there is one', () => {
    const ref = referenceCheckin({ baseline: take(2), day14: take(3) }, 'day28');
    expect(ref?.slot).toBe('baseline');
    expect(ref?.checkin.mood).toBe(2);
  });

  it('falls back to the earliest take when onboarding recorded no baseline', () => {
    // The seven-beat onboarding stopped asking for a baseline. Without this
    // fallback the day-28 screen would compare against an empty slot and show
    // no deltas at all — an absent payoff, not a degraded one.
    const ref = referenceCheckin({ day14: take(3), day28: take(4) }, 'day28');
    expect(ref?.slot).toBe('day14');
    expect(ref?.checkin.mood).toBe(3);
  });

  it('never returns the take being viewed as its own reference', () => {
    expect(referenceCheckin({ day14: take(3) }, 'day14')).toBeUndefined();
  });

  it('returns undefined when nothing at all has been recorded', () => {
    expect(referenceCheckin({}, 'day14')).toBeUndefined();
    expect(referenceCheckin(undefined, 'day14')).toBeUndefined();
  });

  it('is happy without an exclusion, for a read-only view', () => {
    expect(referenceCheckin({ day14: take(3) })?.slot).toBe('day14');
  });

  it('walks the slots in chronological order', () => {
    // The fallback is only honest if "earliest" really is earliest — an order
    // that listed day28 first would measure improvement against the latest take.
    expect(CHECKIN_SLOT_ORDER).toEqual(['baseline', 'day14', 'day28']);

    const all: Record<CheckinSlot, JourneyCheckin> = {
      baseline: take(1),
      day14: take(3),
      day28: take(5),
    };
    expect(referenceCheckin(all, 'day28')?.slot).toBe('baseline');
    expect(referenceCheckin({ day14: all.day14, day28: all.day28 }, 'day28')?.slot).toBe('day14');
  });
});

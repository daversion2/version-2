import {
  interpolate,
  parseBold,
  stripBold,
  placeholdersIn,
  missingPlaceholders,
  resolveCopy,
  fetchCopyOverrides,
  saveCopyOverride,
  resetCopyOverride,
  copyText,
  declareCopy,
  declaredCopy,
  setLiveCopyOverrides,
} from '../appCopy';
import { resetMockDB } from '../__mocks__/firestore';

describe('interpolate', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(interpolate('You did {habit} today.', { habit: 'Workout' })).toBe('You did Workout today.');
    expect(interpolate('{count} habits', { count: 3 })).toBe('3 habits');
    expect(interpolate('Hi {nmae}', { name: 'Jo' })).toBe('Hi {nmae}');
    expect(interpolate('No vars here')).toBe('No vars here');
  });
});

describe('parseBold', () => {
  it('splits emphasis out of a sentence', () => {
    expect(parseBold('they become **friction you can handle** on Progress.')).toEqual([
      { text: 'they become ', bold: false },
      { text: 'friction you can handle', bold: true },
      { text: ' on Progress.', bold: false },
    ]);
  });

  it('handles several spans and a span at either end', () => {
    expect(parseBold('**A** and **B**').map((s) => s.bold)).toEqual([true, false, true]);
  });

  it('keeps an unmatched marker as literal text', () => {
    expect(parseBold('2 ** 3')).toEqual([{ text: '2 ** 3', bold: false }]);
  });

  it('returns one empty segment for empty text', () => {
    expect(parseBold('')).toEqual([{ text: '', bold: false }]);
  });
});

describe('stripBold', () => {
  it('drops the markers for places that cannot style a span', () => {
    expect(stripBold('Save **now**')).toBe('Save now');
  });
});

describe('placeholders', () => {
  it('lists each placeholder once', () => {
    expect(placeholdersIn('{a} and {b} and {a}')).toEqual(['a', 'b']);
  });

  it('flags placeholders an edit dropped', () => {
    expect(missingPlaceholders('You did {habit} — {count} times', 'You did it {count} times')).toEqual([
      'habit',
    ]);
    expect(missingPlaceholders('Hi {name}', 'Hello {name}!')).toEqual([]);
  });
});

describe('resolveCopy', () => {
  it('prefers an edit, and ignores a blank one', () => {
    expect(resolveCopy('k', 'Default', { k: 'Edited' })).toBe('Edited');
    expect(resolveCopy('k', 'Default', { k: '   ' })).toBe('Default');
    expect(resolveCopy('k', 'Default', {})).toBe('Default');
  });
});

describe('Firestore round trip', () => {
  beforeEach(() => resetMockDB());

  it('saves, reads back, and resets an edit', async () => {
    await saveCopyOverride('today.empty', 'Nothing here yet.');
    expect(await fetchCopyOverrides()).toEqual({ 'today.empty': 'Nothing here yet.' });
    await resetCopyOverride('today.empty');
    expect(await fetchCopyOverrides()).toEqual({});
  });
});

describe('copyText (wording built outside a screen)', () => {
  afterEach(() => setLiveCopyOverrides({}));

  it('returns the default with no edits, filled and without bold markers', () => {
    expect(copyText('test.plain', 'Hi **{name}**', { name: 'Sam' })).toBe('Hi Sam');
  });

  it('returns the admin edit once the provider has one', () => {
    setLiveCopyOverrides({ 'test.edited': 'Edited {n}' });
    expect(copyText('test.edited', 'Default {n}', { n: 2 })).toBe('Edited 2');
  });

  it('lists declared keys for the admin even before they are used', () => {
    declareCopy({ 'test.declared': 'Never shown yet' });
    expect(declaredCopy()).toContainEqual({ key: 'test.declared', defaultText: 'Never shown yet' });
  });

  it('lists a key the first time copyText sees it', () => {
    copyText('test.lazy', 'Seen once');
    expect(declaredCopy()).toContainEqual({ key: 'test.lazy', defaultText: 'Seen once' });
  });
});

import {
  OVERRIDE_TACTICS,
  OFFERED_TACTICS,
  getTactic,
  getTacticLabel,
  getTacticLabels,
} from '../overrideTactics';

describe('OVERRIDE_TACTICS integrity', () => {
  it('has unique ids', () => {
    const ids = OVERRIDE_TACTICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every tactic a recall phrasing that starts lowercase', () => {
    // The playbook sentence reads "you <recall> 3 of them", so a capitalised or
    // missing recall lands mid-sentence as a visible bug.
    OVERRIDE_TACTICS.forEach((t) => {
      expect(t.recall.length).toBeGreaterThan(0);
      expect(t.recall[0]).toBe(t.recall[0].toLowerCase());
    });
  });

  it('keeps every id the pre-2026-07 chips UI could have written', () => {
    // Historical logs still hold these; dropping one would render a raw id.
    const legacy = [
      'breathing',
      'countdown',
      'self_talk',
      'focused_why',
      'relaxed_in',
      'one_more',
      'watched_urge',
      'reframed',
    ];
    legacy.forEach((id) => expect(getTactic(id)).toBeDefined());
  });
});

describe('OFFERED_TACTICS', () => {
  it('offers starting moves', () => {
    const ids = OFFERED_TACTICS.map((t) => t.id);
    expect(ids).toContain('made_smaller');
    expect(ids).toContain('first_step');
    expect(ids).toContain('gave_an_out');
  });

  it('no longer offers the arena-era endurance moves', () => {
    // "Watched the urge pass" is not an answer to "what helped you get started",
    // and it means nothing at all when the task is opening a book.
    const ids = OFFERED_TACTICS.map((t) => t.id);
    ['breathing', 'relaxed_in', 'one_more', 'watched_urge'].forEach((id) => {
      expect(ids).not.toContain(id);
    });
  });

  it('still resolves a label for every retired tactic', () => {
    // The reason they stay in the registry: logs written while they were on
    // offer must not start rendering raw ids.
    OVERRIDE_TACTICS.filter((t) => t.retired).forEach((t) => {
      expect(getTacticLabel(t.id)).toBe(t.label);
      expect(t.label).not.toBe(t.id);
    });
  });

  it('is one shared list, not one per habit shape', () => {
    // The cross-habit playbook can only find "made it smaller shows up
    // everywhere" if every habit draws from the same vocabulary.
    expect(OFFERED_TACTICS).toBe(OFFERED_TACTICS);
    expect(OFFERED_TACTICS.length).toBe(OVERRIDE_TACTICS.filter((t) => !t.retired).length);
  });

  it('is short enough to still be read', () => {
    expect(OFFERED_TACTICS.length).toBeLessThanOrEqual(14);
  });
});

describe('label resolution', () => {
  it('falls back to the raw id for a retired tactic', () => {
    expect(getTacticLabel('no_such_tactic')).toBe('no_such_tactic');
  });

  it('drops unknown ids when resolving a list', () => {
    expect(getTacticLabels(['countdown', 'no_such_tactic'])).toEqual(['Counted it down']);
  });

  it('handles a missing list', () => {
    expect(getTacticLabels()).toEqual([]);
  });
});

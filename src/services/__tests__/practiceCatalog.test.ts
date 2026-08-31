import { validatePractice } from '../practiceCatalog';
import { BUNDLED_HABIT_DEFINITIONS } from '../../data/practices';

// Phase 4: the validator was loosened because most fields became optional under
// the unified HabitDefinition. These tests pin both halves of that — it must let
// a plain library habit through, and must still reject genuinely broken docs.

const minimal = {
  id: 'trad-floss',
  name: 'Floss',
  description: 'Floss your teeth.',
  category_id: 'Body',
  suggested_target_per_week: 7,
};

describe('validatePractice — required floor', () => {
  it('accepts a plain library habit with no group, flow, core, order or howTo', () => {
    expect(validatePractice(minimal)).not.toBeNull();
  });

  it('accepts every bundled definition, so a full reseed cannot drop one', () => {
    const rejected = BUNDLED_HABIT_DEFINITIONS.filter((d) => validatePractice({ ...d }) === null);
    expect(rejected.map((d) => d.id)).toEqual([]);
  });

  for (const field of ['id', 'name', 'description', 'category_id']) {
    it(`rejects a doc missing ${field}`, () => {
      const doc: any = { ...minimal };
      delete doc[field];
      expect(validatePractice(doc)).toBeNull();
    });
  }

  it('rejects a doc with no weekly target', () => {
    const doc: any = { ...minimal };
    delete doc.suggested_target_per_week;
    expect(validatePractice(doc)).toBeNull();
  });

  it('rejects non-objects outright', () => {
    expect(validatePractice(null)).toBeNull();
    expect(validatePractice('nope')).toBeNull();
  });
});

describe('validatePractice — optional fields', () => {
  it("accepts 'tap' as a flow", () => {
    expect(validatePractice({ ...minimal, flow: 'tap' })).not.toBeNull();
  });

  it('accepts the richer session flows', () => {
    for (const flow of ['timer', 'away', 'moment']) {
      expect(validatePractice({ ...minimal, flow })).not.toBeNull();
    }
  });

  it('rejects a present-but-invalid enum rather than passing it through', () => {
    // Absent is fine; wrong is a bug worth catching at the boundary.
    expect(validatePractice({ ...minimal, flow: 'sideways' })).toBeNull();
    expect(validatePractice({ ...minimal, group: 'nonsense' })).toBeNull();
  });

  it('rejects a present-but-wrongly-typed optional field', () => {
    expect(validatePractice({ ...minimal, core: 'yes' })).toBeNull();
    expect(validatePractice({ ...minimal, order: 'first' })).toBeNull();
    expect(validatePractice({ ...minimal, tips: 'be careful' })).toBeNull();
    expect(validatePractice({ ...minimal, howTo: [1, 2] })).toBeNull();
  });

  it('drops malformed research entries without dropping the whole doc', () => {
    const result = validatePractice({
      ...minimal,
      research: [
        { finding: 'Real finding', source: 'Real source' },
        { finding: 'Missing its source' },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.research).toHaveLength(1);
  });
});

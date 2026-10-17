import { isLabExperimentOn, setLabExperiment } from '../lab';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';

describe('isLabExperimentOn', () => {
  it('is on only for an admin with the switch on', () => {
    expect(isLabExperimentOn({ is_admin: true, lab_flags: { newCard: true } }, 'newCard')).toBe(true);
  });

  it('ignores a switch on a non-admin account', () => {
    // lab_flags is owner-writable, so a non-admin can set it. It must do nothing.
    expect(isLabExperimentOn({ is_admin: false, lab_flags: { newCard: true } }, 'newCard')).toBe(false);
    expect(isLabExperimentOn({ lab_flags: { newCard: true } }, 'newCard')).toBe(false);
  });

  it('is off for an admin until the switch is turned on', () => {
    expect(isLabExperimentOn({ is_admin: true }, 'newCard')).toBe(false);
    expect(isLabExperimentOn({ is_admin: true, lab_flags: { other: true } }, 'newCard')).toBe(false);
    expect(isLabExperimentOn({ is_admin: true, lab_flags: { newCard: false } }, 'newCard')).toBe(false);
  });

  it('is off with no profile loaded', () => {
    expect(isLabExperimentOn(null, 'newCard')).toBe(false);
    expect(isLabExperimentOn(undefined, 'newCard')).toBe(false);
  });
});

describe('setLabExperiment', () => {
  beforeEach(() => {
    resetMockDB();
    addMockDocument('users', 'u1', { email: 'a@b.c', is_admin: true });
  });

  const userDoc = () => getMockDB().users.u1.data;

  it('flips one switch and leaves the others and the profile alone', async () => {
    await setLabExperiment('u1', 'newCard', true);
    await setLabExperiment('u1', 'otherIdea', true);
    await setLabExperiment('u1', 'newCard', false);

    expect(userDoc().lab_flags).toEqual({ newCard: false, otherIdea: true });
    expect(userDoc().email).toBe('a@b.c');
    expect(userDoc().is_admin).toBe(true);
  });
});

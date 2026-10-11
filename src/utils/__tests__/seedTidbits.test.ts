// utils/ imports '../services/firebase', which jest.config's moduleNameMapper
// doesn't cover — use the services' manual mock explicitly.
jest.mock('../../services/firebase');

import { syncNeuroscienceTidbits } from '../seedTidbits';
import { TIDBIT_SEED_DATA } from '../../data/tidbitSeedData';
import { addMockDocument, getMockDB, resetMockDB } from '../../services/__mocks__/firestore';

const PATH = 'neuroscienceTidbits';
const docs = () => Object.values(getMockDB()[PATH] || {}).map((d) => ({ id: d.id, ...d.data })) as any[];
const active = () => docs().filter((d) => d.active === true);

beforeEach(() => resetMockDB());

describe('syncNeuroscienceTidbits', () => {
  it('seeds an empty collection with exactly the code set', async () => {
    const result = await syncNeuroscienceTidbits();
    expect(result.added).toBe(TIDBIT_SEED_DATA.length);
    expect(active()).toHaveLength(TIDBIT_SEED_DATA.length);
  });

  it('switches off tidbits the code no longer has, without deleting them', async () => {
    addMockDocument(PATH, 'old', { text: 'An old tidbit that was cut.', active: true, tags: [] });
    const result = await syncNeuroscienceTidbits();
    expect(result.deactivated).toBe(1);
    expect(docs().find((d) => d.id === 'old')!.active).toBe(false);
    expect(active()).toHaveLength(TIDBIT_SEED_DATA.length);
  });

  it('switches back on an inactive doc whose text is still in the code, and refreshes it', async () => {
    const seed = TIDBIT_SEED_DATA[0];
    addMockDocument(PATH, 'kept', { ...seed, extended_text: 'stale', active: false });
    const result = await syncNeuroscienceTidbits();
    const kept = docs().find((d) => d.id === 'kept')!;
    expect(kept.active).toBe(true);
    expect(kept.extended_text).toBe(seed.extended_text);
    expect(result.added).toBe(TIDBIT_SEED_DATA.length - 1);
    expect(result.updated).toBe(1);
  });

  it('leaves an up-to-date doc alone and is a no-op the second time', async () => {
    await syncNeuroscienceTidbits();
    const again = await syncNeuroscienceTidbits();
    expect(again).toEqual({ active: TIDBIT_SEED_DATA.length, added: 0, updated: 0, deactivated: 0 });
  });

  it('keeps only one copy active when the same text exists twice', async () => {
    const seed = TIDBIT_SEED_DATA[1];
    addMockDocument(PATH, 'a', { ...seed, active: true });
    addMockDocument(PATH, 'b', { ...seed, active: true });
    await syncNeuroscienceTidbits();
    expect(docs().filter((d) => d.text === seed.text && d.active)).toHaveLength(1);
    expect(active()).toHaveLength(TIDBIT_SEED_DATA.length);
  });

  it('matches text regardless of case and surrounding spaces', async () => {
    const seed = TIDBIT_SEED_DATA[2];
    addMockDocument(PATH, 'x', { ...seed, text: `  ${seed.text.toUpperCase()} `, active: true });
    const result = await syncNeuroscienceTidbits();
    expect(result.added).toBe(TIDBIT_SEED_DATA.length - 1);
  });
});

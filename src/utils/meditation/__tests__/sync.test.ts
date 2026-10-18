import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// The Cloud Function builds from a copy of this folder (functions/src/
// meditation-core/), refreshed by `npm --prefix functions run sync-core` and
// before every functions deploy. This catches an edit that wasn't synced, so
// the committed copy never quietly differs from what the local tools run.
const ORIGINALS = join(__dirname, '..');
const COPIES = join(__dirname, '../../../../functions/src/meditation-core');
const tsFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();

describe('functions/src/meditation-core', () => {
  it('has exactly the shared files', () => {
    expect(tsFiles(COPIES)).toEqual(tsFiles(ORIGINALS));
  });

  it.each(tsFiles(ORIGINALS))('%s matches the original — run `npm --prefix functions run sync-core`', (file) => {
    expect(readFileSync(join(COPIES, file), 'utf8')).toBe(readFileSync(join(ORIGINALS, file), 'utf8'));
  });
});

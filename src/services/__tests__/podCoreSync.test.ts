import { readFileSync } from 'fs';
import { join } from 'path';

// The pod Cloud Functions (functions/src/pods.ts) build from a copy of
// podMath.ts in functions/src/pod-core/, refreshed by
// `npm --prefix functions run sync-core` before every functions deploy. This
// catches an edit that wasn't synced, so the app and the server never quietly
// disagree about the cap, the streak or the push limits.
describe('functions/src/pod-core/podMath.ts', () => {
  it('matches src/services/podMath.ts — run `npm --prefix functions run sync-core`', () => {
    const original = readFileSync(join(__dirname, '../podMath.ts'), 'utf8');
    const copy = readFileSync(join(__dirname, '../../../functions/src/pod-core/podMath.ts'), 'utf8');
    expect(copy).toBe(original);
  });
});

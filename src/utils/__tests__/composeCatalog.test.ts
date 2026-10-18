import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COMPOSE_BACKGROUNDS, COMPOSE_VOICES } from '../../data/composeCatalog';

// The app's pickers must offer exactly what the Cloud Function can make —
// a key the server doesn't know would fail every request that picks it.
const CONTENT = join(__dirname, '../../../content/meditations');
const ASSETS = join(__dirname, '../../../assets/compose');

describe('Compose catalog', () => {
  it('offers exactly the voices in content/meditations/voices.json, in order', () => {
    const voices = JSON.parse(readFileSync(join(CONTENT, 'voices.json'), 'utf8')) as { key: string; name: string }[];
    expect(COMPOSE_VOICES.map((v) => [v.key, v.name])).toEqual(voices.map((v) => [v.key, v.name]));
  });

  it('offers exactly the backgrounds in content/meditations/ambience/', () => {
    const files = readdirSync(join(CONTENT, 'ambience')).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
    expect(COMPOSE_BACKGROUNDS.map((b) => b.key).sort()).toEqual(files.sort());
  });

  it('has a sample clip for every voice and background', () => {
    const clips = readdirSync(ASSETS);
    for (const v of COMPOSE_VOICES) expect(clips).toContain(`voice-${v.key}.mp3`);
    for (const b of COMPOSE_BACKGROUNDS) expect(clips).toContain(`bg-${b.key}.mp3`);
  });
});

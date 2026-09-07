import { SCREEN_INTROS, getScreenIntro } from '../screenIntros';

const entries = Object.entries(SCREEN_INTROS);

describe('screen intros', () => {
  it('keys every intro by its own id', () => {
    // The key is what lands in User.seen_intros. If it drifts from the id, the
    // lookup and the seen-flag disagree and the intro shows on every visit.
    for (const [key, intro] of entries) {
      expect(intro.id).toBe(key);
    }
  });

  it('gives every screen something to actually do', () => {
    // A modal that interrupts someone should earn it. An intro with no
    // how-to points is a paragraph in the way of the screen.
    for (const [key, intro] of entries) {
      expect(intro.points.length).toBeGreaterThan(0);
      expect(intro.title.length).toBeGreaterThan(0);
      expect(intro.intro.length).toBeGreaterThan(0);
    }
  });

  it('writes a label and body for every point', () => {
    for (const intro of Object.values(SCREEN_INTROS)) {
      for (const point of intro.points) {
        expect(point.label.trim().length).toBeGreaterThan(0);
        expect(point.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('stays short enough to read standing in a doorway', () => {
    // Not style policing — a first-visit modal is between the user and the
    // thing they opened the app for, so length is a real cost.
    for (const [key, intro] of entries) {
      expect(intro.points.length).toBeLessThanOrEqual(4);
      expect(intro.intro.length).toBeLessThanOrEqual(160);
    }
  });

  it('resolves a known id and shrugs at an unknown one', () => {
    // The renderer returns null for a miss, so a screen can adopt the hook
    // before its copy exists without crashing.
    expect(getScreenIntro('today')?.title).toBe('Today');
    expect(getScreenIntro('not_a_screen')).toBeUndefined();
  });
});

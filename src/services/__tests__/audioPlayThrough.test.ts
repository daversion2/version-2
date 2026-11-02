import { createPlayThroughWatcher, END_SLACK_SEC, PlaybackSnapshot } from '../audioPlayThrough';

const status = (over: Partial<PlaybackSnapshot>): PlaybackSnapshot => ({
  isLoaded: true,
  playing: false,
  currentTime: 0,
  duration: 600,
  didJustFinish: false,
  ...over,
});

describe('createPlayThroughWatcher', () => {
  it('fires on the didJustFinish event, once', () => {
    const watch = createPlayThroughWatcher();
    expect(watch(status({ playing: true, currentTime: 599.5 }))).toBe(false);
    expect(watch(status({ playing: false, currentTime: 600, didJustFinish: true }))).toBe(true);
    // A late duplicate, or the render path seeing it too, doesn't fire again.
    expect(watch(status({ didJustFinish: true, currentTime: 600 }))).toBe(false);
  });

  it('fires when playing stops at the end, even if didJustFinish never arrives', () => {
    const watch = createPlayThroughWatcher();
    expect(watch(status({ playing: true, currentTime: 598 }))).toBe(false);
    expect(watch(status({ playing: true, currentTime: 599.6 }))).toBe(false);
    expect(watch(status({ playing: false, currentTime: 600 - END_SLACK_SEC + 0.2 }))).toBe(true);
  });

  it('a pause before the end is just a pause', () => {
    const watch = createPlayThroughWatcher();
    watch(status({ playing: true, currentTime: 300 }));
    expect(watch(status({ playing: false, currentTime: 300 }))).toBe(false);
  });

  it("a seek to the end while paused doesn't count — nothing was playing", () => {
    const watch = createPlayThroughWatcher();
    watch(status({ playing: true, currentTime: 100 }));
    watch(status({ playing: false, currentTime: 100 }));
    expect(watch(status({ playing: false, currentTime: 600 }))).toBe(false);
  });

  it('never fires before the file has loaded or with no duration', () => {
    const watch = createPlayThroughWatcher();
    watch(status({ isLoaded: false, playing: true, duration: 0 }));
    expect(watch(status({ isLoaded: false, playing: false, duration: 0 }))).toBe(false);
  });

  it('after finishing, playing it again does not fire a second time', () => {
    const watch = createPlayThroughWatcher();
    expect(watch(status({ didJustFinish: true, currentTime: 600 }))).toBe(true);
    watch(status({ playing: true, currentTime: 2 }));
    watch(status({ playing: true, currentTime: 599.8 }));
    expect(watch(status({ playing: false, currentTime: 600, didJustFinish: true }))).toBe(false);
  });
});

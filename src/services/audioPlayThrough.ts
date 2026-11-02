// =============================================================================
// When has a recording played through? For components/audio/SessionPlayer.
//
// expo-audio sets didJustFinish in exactly one status event (iOS: the
// AVPlayerItemDidPlayToEndTime one). A React render can batch that event
// away, so a fully-played guided session never reached Done. The player now
// feeds every raw status event here, and as a second signal anything that
// stops within END_SLACK_SEC of the end after playing counts too. A seek to
// the end while paused never counts: nothing was playing.
// =============================================================================

/** How close to the end a stop still counts as the end. */
export const END_SLACK_SEC = 1;

export interface PlaybackSnapshot {
  isLoaded: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

/**
 * One watcher per recording: feed it each status event, in order. Returns
 * true exactly once — on the event where it has played to the end.
 */
export const createPlayThroughWatcher = (): ((status: PlaybackSnapshot) => boolean) => {
  let wasPlaying = false;
  let done = false;
  return (status) => {
    if (done) return false;
    const atEnd =
      status.isLoaded && status.duration > 0 && status.currentTime >= status.duration - END_SLACK_SEC;
    const finished = status.didJustFinish || (atEnd && wasPlaying && !status.playing);
    wasPlaying = status.playing;
    if (finished) done = true;
    return finished;
  };
};

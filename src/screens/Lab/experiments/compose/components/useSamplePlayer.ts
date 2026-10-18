import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Picker previews, one at a time: tap a sample to hear it, tap it again (or
 * another one) to stop. Plays even with the ringer switch on silent, since
 * the whole point is to hear the voice.
 */
export function useSamplePlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const keyRef = useRef<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const stop = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    keyRef.current = null;
    setPlayingKey(null);
    if (!player) return;
    // pause() first: in expo-audio, remove() only unregisters the player and
    // the sound plays on until garbage collection. release() frees it now.
    try {
      player.pause();
    } catch {
      /* already gone */
    }
    try {
      player.release();
    } catch {
      /* already gone */
    }
  }, []);

  const toggle = useCallback(
    (key: string, source: number) => {
      const wasThis = keyRef.current === key;
      stop();
      if (wasThis) return;
      // setAudioModeAsync replaces the whole mode, so say all of it: previews
      // play through the silent switch, stop in the background, and mix with
      // whatever else is playing.
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
      }).catch(() => undefined);
      const player = createAudioPlayer(source);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && keyRef.current === key) stop();
      });
      player.play();
      playerRef.current = player;
      keyRef.current = key;
      setPlayingKey(key);
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { playingKey, toggle, stop };
}

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { markScreenIntroSeen } from '../services/users';

// =============================================================================
// SCREEN INTRO — show it once, then leave a way back to it.
//
// A first-visit modal that explains what a screen is for, and an ⓘ in the
// header that reopens it forever after. The seen-state lives on the user doc
// (User.seen_intros), so it follows the account rather than the device.
//
// Two rules the implementation exists to enforce:
//
//   IT NEVER SHOWS TWICE by accident. The flag is written the moment it opens,
//   not when it is dismissed — a user who force-quits mid-read has still seen
//   it, and showing it again on every launch until they press a button would be
//   the worst version of this feature.
//
//   IT NEVER SHOWS BEFORE THE PROFILE LOADS. userProfile is null on first
//   render while it fetches, and treating that as "not seen yet" would flash
//   the intro at every returning user, every launch.
// =============================================================================

export interface ScreenIntroState {
  /** The intro to render. Stable for the life of the screen. */
  screenId: string;
  visible: boolean;
  dismiss: () => void;
  /** Open it again from the ⓘ. Never re-marks anything. */
  reopen: () => void;
}

interface Options {
  /**
   * Pass the screen's navigation prop to get the ⓘ button installed in the
   * header automatically. Omit on screens with no header — they need to place
   * the button themselves.
   */
  navigation?: {
    setOptions: (options: Record<string, unknown>) => void;
  };
  /**
   * Which header slot. 'right' by default; Today uses 'left' because its right
   * slot already holds the library shortcut.
   */
  side?: 'left' | 'right';
  /** Renders the header button. Supplied by the screen to avoid a cycle. */
  renderButton?: (onPress: () => void) => React.ReactNode;
}

export const useScreenIntro = (
  screenId: string,
  { navigation, side = 'right', renderButton }: Options = {}
): ScreenIntroState => {
  const { user, userProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  // Guards against a second auto-open in the same session: userProfile refreshes
  // after the write lands, and without this the effect would consider opening
  // again on every profile change.
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    // Wait for the profile. Null means "still loading", never "never seen".
    if (!user || !userProfile || autoOpened) return;
    if (userProfile.seen_intros?.[screenId]) return;

    setAutoOpened(true);
    setVisible(true);
    // Written on OPEN, not on dismiss — see the header comment.
    markScreenIntroSeen(user.uid, screenId).catch((err) => {
      // A failed write means they may see it once more. That is a far better
      // failure than blocking the screen or swallowing the intro entirely.
      console.warn('Failed to record screen intro as seen:', err);
    });
  }, [user, userProfile, screenId, autoOpened]);

  const dismiss = useCallback(() => setVisible(false), []);
  const reopen = useCallback(() => setVisible(true), []);

  useLayoutEffect(() => {
    if (!navigation || !renderButton) return;
    navigation.setOptions({
      [side === 'left' ? 'headerLeft' : 'headerRight']: () => renderButton(reopen),
    });
    // renderButton is defined inline by callers, so depending on it would reset
    // the header every render. The button only ever calls `reopen`, which is
    // stable, so the identity of the renderer does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, side, reopen]);

  return { screenId, visible, dismiss, reopen };
};

import { BorderRadius, Colors, REDESIGN } from '../constants/theme';

// =============================================================================
// THE REDESIGN, applied at startup. See the REDESIGN block in constants/theme.ts
// for why it can't flip live: App.tsx calls applyRedesign() before it loads a
// single screen, and only when services/redesignPref.ts says the switch is on.
// =============================================================================

let active = false;

/** True once applyRedesign() has run in this launch. */
export const isRedesignOn = (): boolean => active;

/**
 * Write the redesign's colours and radii over the theme objects every screen
 * imports. Must run before any screen module loads: a StyleSheet built earlier
 * keeps the old values.
 */
export const applyRedesign = (): void => {
  Object.assign(Colors, REDESIGN.colors);
  Object.assign(BorderRadius, REDESIGN.radius);
  active = true;
};

// =============================================================================
// THE CLASSIC-LOOK ESCAPE HATCH, as this device remembers it.
//
// The Apple-style redesign is the default for everyone since 2026-11-01. An
// admin can still switch back with Lab → "Classic look" while the old branches
// exist. That switch lives on the user doc, which only arrives after sign-in:
// too late, since the look has to be settled before any screen loads
// (App.tsx). So RootNavigator copies the switch here whenever the profile
// changes, and the next launch reads it. Only an admin's switch can be on
// (services/lab.ts), so for everyone else this stays empty and they get the
// redesign.
// =============================================================================

const KEY = 'nn.classic';
const storage = () => require('@react-native-async-storage/async-storage').default;

export const loadClassicPref = async (): Promise<boolean> => {
  try {
    return (await storage().getItem(KEY)) === '1';
  } catch {
    return false;
  }
};

export const saveClassicPref = async (on: boolean): Promise<void> => {
  try {
    if (on) await storage().setItem(KEY, '1');
    else await storage().removeItem(KEY);
  } catch {
    // Worst case the next launch shows the other look; nothing to recover.
  }
};

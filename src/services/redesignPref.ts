// =============================================================================
// THE REDESIGN SWITCH, as this device remembers it.
//
// The Lab switch lives on the user doc, which only arrives after sign-in — too
// late, since the redesign has to apply before any screen loads (App.tsx). So
// RootNavigator copies the switch here whenever the profile changes, and the
// next launch reads it. Flipping the switch therefore takes effect on the next
// launch. Only an admin's switch can be on (services/lab.ts), so for everyone
// else this stays empty.
// =============================================================================

const KEY = 'nn.redesign';
const storage = () => require('@react-native-async-storage/async-storage').default;

export const loadRedesignPref = async (): Promise<boolean> => {
  try {
    return (await storage().getItem(KEY)) === '1';
  } catch {
    return false;
  }
};

export const saveRedesignPref = async (on: boolean): Promise<void> => {
  try {
    if (on) await storage().setItem(KEY, '1');
    else await storage().removeItem(KEY);
  } catch {
    // Worst case the next launch shows the other look; nothing to recover.
  }
};

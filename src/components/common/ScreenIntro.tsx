import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from './FeatureInfoModal';
import { getScreenIntro } from '../../data/screenIntros';
import { ScreenIntroState } from '../../hooks/useScreenIntro';

/**
 * The ⓘ that reopens a screen's intro. Pass it to useScreenIntro's
 * `renderButton` and it lands in the header slot you asked for.
 *
 * The square frame is not decoration. react-native-screens wraps every
 * headerLeft/headerRight in a UIBarButtonItem, and on iOS 26 UIKit draws a
 * Liquid Glass capsule behind it, sized to THIS view's frame. Without a fixed
 * frame that view takes the glyph's natural text bounds — which carry the
 * font's asymmetric bearing — so the icon sits visibly off-centre in the
 * circle. A square with centred content makes the capsule a true circle with
 * the glyph in the middle of it.
 *
 * It does not remove the capsule. Nothing in JS can: the installed
 * react-native-screens (4.16.0) never sets UIBarButtonItem.hidesSharedBackground
 * and has no prop for it. 4.27.0 added one, and the installed
 * @react-navigation/native-stack already passes it through
 * unstable_headerLeftItems / unstable_headerRightItems — so the real fix is a
 * screens upgrade at the next native build, not more styling here.
 */
export const HEADER_BUTTON_SIZE = 36;

export const ScreenIntroButton: React.FC<{ onPress: () => void; color?: string }> = ({
  onPress,
  color = Colors.primary,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.headerButton}
    accessibilityRole="button"
    accessibilityLabel="How this screen works"
  >
    <Ionicons name="information-circle-outline" size={22} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * A screen's first-visit explainer, rendered from data/screenIntros.ts.
 *
 * Renders nothing when the id has no entry — a screen can adopt the hook before
 * its copy is written without crashing, and a typo degrades to silence rather
 * than a blank modal.
 */
export const ScreenIntro: React.FC<{ intro: ScreenIntroState; accent?: string }> = ({
  intro,
  accent,
}) => {
  const content = getScreenIntro(intro.screenId);
  if (!content) return null;

  return (
    <FeatureInfoModal
      visible={intro.visible}
      onDismiss={intro.dismiss}
      icon={content.icon}
      accent={accent}
      title={content.title}
      intro={content.intro}
      points={content.points}
      science={content.science}
      footer={content.footer}
    />
  );
};

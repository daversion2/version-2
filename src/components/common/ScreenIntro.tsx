import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from './FeatureInfoModal';
import { getScreenIntro } from '../../data/screenIntros';
import { ScreenIntroState } from '../../hooks/useScreenIntro';

/**
 * The ⓘ that reopens a screen's intro. Pass it to useScreenIntro's
 * `renderButton` and it lands in the header slot you asked for.
 */
export const ScreenIntroButton: React.FC<{ onPress: () => void; color?: string }> = ({
  onPress,
  color = Colors.primary,
}) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={12}
    accessibilityRole="button"
    accessibilityLabel="How this screen works"
  >
    <Ionicons name="information-circle-outline" size={22} color={color} />
  </TouchableOpacity>
);

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

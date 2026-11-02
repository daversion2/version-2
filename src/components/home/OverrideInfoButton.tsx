import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from '../common/FeatureInfoModal';
import { useCopy } from '../../context/CopyContext';

/**
 * The ⓘ on the rating sheet: what the override is, and why it's the one
 * question the app asks. Always there, unlike RatingExplainer, which shows
 * once. The modal renders inside the sheet's own Modal so it stacks above it.
 *
 * Vocabulary (founder, 2026-11-01): FRICTION is what makes starting hard;
 * your OVERRIDE is what it took to start anyway, the 1–3.
 */
export const OverrideInfoButton: React.FC<{ color?: string }> = ({ color = Colors.gray }) => {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.button}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('override.info.open', 'What is the override?')}
      >
        <Ionicons name="information-circle-outline" size={22} color={color} />
      </TouchableOpacity>
      <FeatureInfoModal
        visible={open}
        onDismiss={() => setOpen(false)}
        icon="flash-outline"
        copyPrefix="override.info"
        title="Your override"
        intro="Friction is what makes starting hard. Your override is what it took to start anyway: the 1, 2 or 3 you pick after every session."
        points={[
          {
            label: 'Rate the start, not the session',
            text: '1: you barely thought about it. 2: you had to push, but were never in doubt. 3: you nearly didn’t. A brutal workout you walked straight into is a 1.',
          },
          {
            label: 'Be honest',
            text: 'A 3 isn’t a bad mark. The hard starts are the ones doing the training, and an honest 3 today is what makes next month’s 1 mean something.',
          },
          {
            label: 'Watch it fall',
            text: 'After you rate, the app tells you how your override is moving. Each app’s page shows the trend, and Progress shows how much friction you can handle. The same session needing less override is the progress.',
          },
        ]}
        science={[
          {
            label: 'Starting is what gets trained',
            text: 'Repetition makes the start automatic, not the work. The session stays as demanding while the effort to begin it drops, and that drop is the clearest sign something is bedding in.',
          },
          {
            label: 'Pushing through is the exercise',
            text: 'Doing something you’d rather avoid engages the anterior mid-cingulate cortex, a region studies link to tenacity and willpower. The hard starts are where it’s working hardest.',
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: { padding: 2 },
});

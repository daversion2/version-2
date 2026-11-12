import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from '../common/FeatureInfoModal';
import { useCopy } from '../../context/CopyContext';

/**
 * The ⓘ on the Start sheet and the rating sheet: the two ratings, what each
 * measures, and which way each should move. Always there, unlike
 * RatingExplainer, which shows once. The modal renders inside the sheet's own
 * Modal so it stacks above it.
 *
 * Vocabulary (founder, 2026-11-01 and 2026-11-11): FRICTION is what makes
 * starting hard; your OVERRIDE is what it took to start anyway (asked on
 * Start); PUSH is how hard you went once you were going (asked at the end).
 * Discipline is the two together. The override should fall, push should hold
 * up — say so wherever the two numbers appear.
 *
 * Copy lives under `override.ratings.*`. The older `override.info.*` keys
 * described a single after-session rating and are no longer read.
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
        accessibilityLabel={t('override.ratings.open', 'How the ratings work')}
      >
        <Ionicons name="information-circle-outline" size={22} color={color} />
      </TouchableOpacity>
      <FeatureInfoModal
        visible={open}
        onDismiss={() => setOpen(false)}
        icon="flash-outline"
        copyPrefix="override.ratings"
        title="Override and push"
        intro="Discipline is two skills: getting yourself to start, and pushing once you’re going. The app asks about each one, separately. Think of a car on a cold morning: your override is getting the engine to turn over, push is how hard you press the accelerator."
        points={[
          {
            label: 'Override, as you start',
            text: 'How hard is it to start? 1: barely thinking about it. 2: talking yourself into it. 3: it took everything. Rate the start, not the session: a brutal workout you walked straight into is a 1.',
          },
          {
            label: 'Push, when you finish',
            text: 'How hard did you push? 1: cruised. 2: worked, with a little left. 3: emptied the tank. In Meditate it’s how hard it was to stay with it.',
          },
          {
            label: 'They move in opposite directions',
            text: 'Your override should fall: starting gets easier as it becomes automatic. Your push should hold up: once you’re going, you keep choosing hard work. A low push week after week means it’s time to raise the bar.',
          },
          {
            label: 'Be honest',
            text: 'A 3 is never a bad mark, on either. Honest numbers today are what make next month’s trend mean something.',
          },
          {
            label: 'Meals is the exception',
            text: 'Eating has no single start, so Meals asks once a day: how hard was it to eat this way? It’s counted on its own.',
          },
        ]}
        science={[
          {
            label: 'Starting is what gets trained',
            text: 'Repetition makes the start automatic, not the work. The session stays as demanding while the effort to begin it drops, and that drop is the clearest sign something is bedding in.',
          },
          {
            label: 'Pushing through is the exercise',
            text: 'Doing something you’d rather avoid engages the anterior mid-cingulate cortex, a region studies link to tenacity and willpower. The hard starts, and the hard last minutes, are where it’s working hardest.',
          },
          {
            label: 'Effort can be learned',
            text: 'In “learned industriousness” research, people rewarded for working hard come to find effort itself less aversive, and work harder at new tasks too. Choosing to push is a habit of its own.',
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: { padding: 2 },
});

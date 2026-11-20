import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from '../common/FeatureInfoModal';
import { useCopy } from '../../context/CopyContext';

/**
 * The ⓘ on the Start sheet and the rating sheet: the override, used twice —
 * to start and to keep going — what each rating measures, and which way it
 * should move. Always there, unlike RatingExplainer, which shows once. The
 * modal renders inside the sheet's own Modal so it stacks above it.
 *
 * Vocabulary (founder, 2026-11-01 and 2026-11-20): FRICTION is the resistance;
 * your OVERRIDE is what it takes to act anyway. Discipline is one skill used
 * twice: the override to START (asked on Start) and to KEEP GOING when part of
 * you wants to stop (asked at the end). On both, lower over the weeks is the
 * override getting stronger.
 *
 * Copy lives under `override.twice.*`. The older `override.ratings.*` (override
 * and push) and `override.info.*` keys are no longer read.
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
        copyPrefix="override.twice"
        title="Your override, twice"
        intro="Discipline is one skill, used twice. You override the urge not to start, and once you’re going, you override the urge to stop. The app asks about each one separately."
        points={[
          {
            label: 'As you start',
            text: 'How hard is it to start? 1: barely thought about it. 2: had to talk yourself into it. 3: almost didn’t. Rate the start, not the session: a brutal workout you walked straight into is a 1.',
          },
          {
            label: 'When you finish',
            text: 'How hard was it to keep going? In a workout it’s the “this sucks, stop” voice; in Meditate it’s the “I’ll stop a little early” one. 1: it barely showed up. 2: you talked yourself through it. 3: you wanted to quit and kept going.',
          },
          {
            label: 'Both should fall',
            text: 'As the override gets stronger, starting takes less and so does staying in. A heavy week can push keep going up for a while: that’s the training, not a step back.',
          },
          {
            label: 'Be honest',
            text: 'A 3 is never a bad mark, on either. Honest numbers today are what make next month’s trend mean something.',
          },
          {
            label: 'Meals is the exception',
            text: 'Eating has no single start, so Meals asks once a day: how hard was it to eat this way today?',
          },
        ]}
        science={[
          {
            label: 'Starting is what gets trained',
            text: 'Repetition makes the start automatic, not the work. The session stays as demanding while the effort to begin it drops, and that drop is the clearest sign something is bedding in.',
          },
          {
            label: 'Staying in is the exercise',
            text: 'Doing something you’d rather avoid engages the anterior mid-cingulate cortex, a region studies link to tenacity and willpower. The hard starts, and the hard last minutes, are where it’s working hardest.',
          },
          {
            label: 'Effort can be learned',
            text: 'In “learned industriousness” research, people rewarded for working hard come to find effort itself less aversive, and work harder at new tasks too. Keeping going is a habit of its own.',
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: { padding: 2 },
});

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { FeatureInfoModal } from '../common/FeatureInfoModal';
import { useCopy } from '../../context/CopyContext';
import { isTodayAppHidden } from '../../services/hiddenApps';

/**
 * The ⓘ on the Start sheet and the rating sheet: the override, used twice —
 * to start and to keep going — what each rating measures, and which way it
 * should move. Always there, unlike RatingExplainer, which shows once. The
 * modal renders inside the sheet's own Modal so it stacks above it.
 *
 * Vocabulary (founder, 2026-11-01 and 2026-11-20): FRICTION is the resistance;
 * your OVERRIDE is what it takes to act anyway. Discipline is one skill used
 * twice: the override to START (asked on Start) and to KEEP GOING when part of
 * you wants to stop (asked at the end).
 *
 * The effort is the reward (founder, 2026-11-20): a rating records what a
 * session cost, and is never a number that should fall. Copy lives under
 * `override.effort.*`, new keys so an older copy-editor edit of "Both should
 * fall" can't hide the new wording. `override.twice.*`, `override.ratings.*`
 * and `override.info.*` are no longer read.
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
        copyPrefix="override.effort"
        title="Your override, twice"
        intro="Before anything hard, your brain predicts what it will cost, and you feel that prediction as resistance. Acting against it is your override. You use it twice: getting started, and staying with it."
        points={[
          {
            label: 'Getting started, as you start',
            text: 'How hard is it to start? 1: barely thought about it. 2: had to talk yourself into it. 3: almost didn’t. Rate the start, not the session: a brutal workout you walked straight into is a 1.',
          },
          {
            label: 'Staying with it, when you finish',
            text: 'How hard was it to keep going? In a workout it’s the “this sucks, stop” voice; in Meditate it’s the “I’ll stop a little early” one. 1: it barely showed up. 2: you talked yourself through it. 3: you wanted to quit and kept going.',
          },
          {
            label: 'The effort is the training',
            text: 'Every rating is a session you did anyway. A 3 is the most training a session can give, not a bad day. The numbers aren’t meant to fall week to week: they’re a record of what you paid.',
          },
          {
            label: 'Be honest',
            text: 'A 3 is never a bad mark, on either. Rate what it actually took today, not what you think it should be.',
          },
          // Only while Meals is offered (services/hiddenApps.ts).
          ...(isTodayAppHidden('meals')
            ? []
            : [
                {
                  label: 'Meals is the exception',
                  text: 'Eating has no single start, so Meals asks once a day: how hard was it to eat this way today?',
                },
              ]),
        ]}
        science={[
          {
            label: 'Starting can become automatic',
            text: 'Each time you begin when you’d rather not, you act against the prediction. Over months, repetition can hand some starts to your brain’s habit system, but it takes weeks to months and it isn’t steady, so one week says little.',
          },
          {
            label: 'Staying with it',
            text: 'Doing something you’d rather avoid engages the anterior mid-cingulate cortex, a region research links to persistence.',
          },
          {
            label: 'Effort can be learned',
            text: 'In “learned industriousness” research, people rewarded for working hard come to find effort itself less aversive, and work harder at new tasks too. Staying with it is a habit of its own.',
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: { padding: 2 },
});

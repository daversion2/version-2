import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { WeekGlance } from '../../services/habitPace';
import { Copy } from '../common/Copy';

interface Props {
  glance: WeekGlance;
  /** First name, when we have one. */
  name?: string;
  /**
   * The one habit worth naming right now, resolved to its display name.
   * Null when every habit is either done for the week or already logged today.
   */
  nextAction?: { habitName: string; reps: number; recovers: boolean } | null;
}

/**
 * The one line above the list: what to do next, and where the week stands.
 *
 * Deliberately about the WEEK, not the day — every target in the app is weekly,
 * so a daily framing would be measuring something the product doesn't track.
 * Deliberately not streaks or points: attendance was the old headline.
 *
 * The headline is now an ACTION rather than a score. "2 of 6 on pace" is a
 * grade, and a grade is a thing to feel rather than a thing to do; the pace
 * summary is still there, demoted to the line underneath where it belongs.
 */
export const TodayHero: React.FC<Props> = ({ glance, name, nextAction }) => {
  const { onPace, total, behind, untracked } = glance;

  // No habits at all.
  if (total === 0 && untracked === 0) {
    return (
      <View style={styles.wrap}>
        <Copy id="today.hero.empty.title" style={styles.big}>
          {'Nothing tracked yet'}
        </Copy>
        <Copy id="today.hero.empty.subtitle" style={styles.sub}>
          {'Add a habit from the library to get started.'}
        </Copy>
      </View>
    );
  }

  // Habits exist but none carries a weekly goal — the state a new account is in,
  // since curated practices are seeded without one. Saying "0 of 0 on pace"
  // would be meaningless, so it asks for the missing piece instead.
  if (total === 0) {
    return (
      <View style={styles.wrap}>
        <Copy id="today.hero.eyebrow.thisWeek" style={styles.eyebrow}>
          {'This week'}
        </Copy>
        {untracked === 1 ? (
          <Copy id="today.hero.noGoals.one" style={styles.big} vars={{ count: untracked }}>
            {'{count} habit, no goals yet'}
          </Copy>
        ) : (
          <Copy id="today.hero.noGoals.other" style={styles.big} vars={{ count: untracked }}>
            {'{count} habits, no goals yet'}
          </Copy>
        )}
        <Copy id="today.hero.noGoals.subtitle" style={styles.sub}>
          {'Set how many times a week on any habit to start tracking your pace.'}
        </Copy>
      </View>
    );
  }

  const allGood = onPace === total;

  // Something is owed today — lead with it. The pace summary moves to the sub
  // line so the screen still says where the week stands, just second.
  if (nextAction) {
    const { habitName, reps, recovers } = nextAction;
    const paceVars = { onPace, total, behind };
    return (
      <View style={styles.wrap}>
        {name ? (
          <Copy id="today.hero.eyebrow.nextUpNamed" style={styles.eyebrow} vars={{ name }}>
            {'Next up, {name}'}
          </Copy>
        ) : (
          <Copy id="today.hero.eyebrow.nextUp" style={styles.eyebrow}>
            {'Next up'}
          </Copy>
        )}
        {reps === 1 ? (
          <Copy id="today.hero.next.once" style={styles.big} vars={{ habit: habitName }}>
            {'{habit} once today'}
          </Copy>
        ) : reps === 2 ? (
          <Copy id="today.hero.next.twice" style={styles.big} vars={{ habit: habitName }}>
            {'{habit} twice today'}
          </Copy>
        ) : (
          <Copy id="today.hero.next.many" style={styles.big} vars={{ habit: habitName, count: reps }}>
            {'{habit} {count}× today'}
          </Copy>
        )}
        {recovers ? (
          behind > 0 ? (
            <Copy id="today.hero.next.paceRecoversBehind" style={styles.sub} vars={paceVars}>
              {'Puts it back on pace. {onPace} of {total} on pace · {behind} behind'}
            </Copy>
          ) : (
            <Copy id="today.hero.next.paceRecovers" style={styles.sub} vars={paceVars}>
              {'Puts it back on pace. {onPace} of {total} on pace'}
            </Copy>
          )
        ) : behind > 0 ? (
          <Copy id="today.hero.next.paceBehind" style={styles.sub} vars={paceVars}>
            {'{onPace} of {total} on pace · {behind} behind'}
          </Copy>
        ) : (
          <Copy id="today.hero.next.pace" style={styles.sub} vars={paceVars}>
            {'{onPace} of {total} on pace'}
          </Copy>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {name ? (
        <Copy id="today.hero.eyebrow.thisWeekNamed" style={styles.eyebrow} vars={{ name }}>
          {'This week, {name}'}
        </Copy>
      ) : (
        <Copy id="today.hero.eyebrow.thisWeek" style={styles.eyebrow}>
          {'This week'}
        </Copy>
      )}
      <Copy id="today.hero.week.pace" style={styles.big} vars={{ onPace, total }}>
        {'{onPace} of {total} on pace'}
      </Copy>
      {allGood ? (
        <Copy id="today.hero.week.allGood" style={styles.sub}>
          {'Everything is where it should be.'}
        </Copy>
      ) : behind === 1 ? (
        <Copy id="today.hero.week.behindOne" style={styles.sub}>
          {'One is behind — it’s at the top.'}
        </Copy>
      ) : (
        <Copy id="today.hero.week.behindMany" style={styles.sub} vars={{ behind }}>
          {'{behind} are behind — they’re at the top.'}
        </Copy>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  eyebrow: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: 2,
  },
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
});

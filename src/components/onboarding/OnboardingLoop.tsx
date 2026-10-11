import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { Copy } from '../common/Copy';
import {
  RESISTANCE_LEVELS,
  TACTIC_GATE_RESISTANCE,
} from '../../constants/resistance';
import { TACTIC_PROMPT, TACTIC_HELPER, OFFERED_TACTICS } from '../../data/overrideTactics';
import { CHIP_CAPTIONS, CHIP_STYLES, CHIP_TEXT } from '../home/TodayHabitRow';
import { getEditableDates, formatRelativeDay } from '../../utils/date';
import { ob } from './onboardingStyles';

// ============================================================================
// BEATS 4–6 — HOW IT WORKS
//
// The daily loop as the app actually runs it:
//   4. Two ways to log — a one-tap 1/2/3 chip on Today, or tap the habit and
//      choose Log details.
//   5. What 1, 2 and 3 mean — the Log details rating, and the "Friction you
//      can handle" card on Progress those answers turn into.
//   6. After a 2 or 3, the celebration offers a reflection. Never required.
//
// The previous version described a flow the app had moved on from: a tick
// circle to tap, a rating asked as a separate step afterwards, and a
// reflection implied after every log. Each mock here is drawn from the real
// screen it depicts (TodayHabitRow, PracticeCaptureFlow, FrictionCard,
// HabitCelebrationModal, PracticeReflectionSheet) — if one of those changes
// shape, change its mock here too.
//
// NONE OF THESE STORE ANYTHING. The mock-ups are static pictures, not live
// screens, but their CONTENT is read from the same sources the real screens
// read (RESISTANCE_LEVELS, the Today chip captions and colours, the date-chip
// labels, TACTIC_PROMPT, OFFERED_TACTICS, TACTIC_GATE_RESISTANCE), so the
// wording cannot drift. Only the layout is restated.
//
// Each mock is one accessibility image with a plain description: a screen
// reader should hear what the picture shows, not a list of buttons that do
// nothing.
// ============================================================================

/** The eyebrow, so the user can see how much walkthrough is left. */
const Step: React.FC<{ n: number }> = ({ n }) => (
  <Copy id="onboarding.loop.eyebrow" style={ob.eyebrow} vars={{ step: n }}>
    {'How it works · {step} of 3'}
  </Copy>
);

/** "2 or 3" — the ratings that earn the reflection offer, from the real gate. */
const HARD_LEVELS = RESISTANCE_LEVELS.filter((l) => l.value >= TACTIC_GATE_RESISTANCE)
  .map((l) => String(l.value))
  .join(' or ');

/** Illustrative week for the opened Today card, Monday first. Not the user's data. */
const MOCK_WEEK: { initial: string; state: 'done' | 'missed' | 'open' | 'today' | 'future' }[] = [
  { initial: 'M', state: 'done' },
  { initial: 'T', state: 'missed' },
  { initial: 'W', state: 'open' },
  { initial: 'T', state: 'today' },
  { initial: 'F', state: 'future' },
  { initial: 'S', state: 'future' },
  { initial: 'S', state: 'future' },
];

/**
 * The friction card mock, oldest window first. Illustrative: one habit getting
 * easier, then a harder one added — faced climbs while felt falls behind it.
 */
const FRICTION_FACED = [9, 9, 9, 9, 9, 15, 18, 18];
const FRICTION_FELT = [9, 9, 8, 7, 6, 12, 15, 13];
const FRICTION_MAX = 18;

/** Shown in the celebration mock. Real tidbits come from Firestore and vary. */
const MOCK_TIDBIT =
  'Right now your prefrontal cortex is doing all of this by hand — every decision, every time. That’s why the early days cost the most.';

/** How many tactic rows the reflection mock draws before summarising the rest. */
const TACTICS_SHOWN = 2;

// ---------------------------------------------------------------- shared bits

/** Orange callout pinned to a mock, naming what to look at. */
const Tag: React.FC<{
  id: string;
  label: string;
  vars?: Record<string, string | number>;
  style: StyleProp<ViewStyle>;
}> = ({ id, label, vars, style }) => (
  <View style={[styles.tag, style]}>
    <Copy id={id} style={styles.tagText} vars={vars}>
      {label}
    </Copy>
  </View>
);

/** The Today row's three resistance chips, in their real captions and colours. */
const Chips: React.FC<{ highlight?: number }> = ({ highlight }) => (
  <View style={styles.chips}>
    {RESISTANCE_LEVELS.map((level, i) => (
      <View
        key={level.value}
        style={[styles.chip, CHIP_STYLES[i], highlight === level.value && styles.ring]}
      >
        <Text style={[styles.chipGlyph, CHIP_TEXT[i]]}>{level.value}</Text>
        <Text style={[styles.chipCap, CHIP_TEXT[i]]}>{CHIP_CAPTIONS[i]}</Text>
      </View>
    ))}
  </View>
);

// ---------------------------------------------------------------- beat 4

export const OnboardingLoopHabit: React.FC = () => (
  <View style={styles.container}>
    <FadeRise>
      <Step n={1} />
      <Copy id="onboarding.loop.habit.headline" style={ob.headline}>
        {'Two ways to log a habit.'}
      </Copy>
    </FadeRise>

    <FadeRise delay={400}>
      <View
        style={styles.mock}
        accessible
        accessibilityRole="image"
        accessibilityLabel="The Today screen. Each habit has 1, 2 and 3 buttons to log it in one tap. Tapping a habit opens it, with a Log details button."
      >
        <Copy id="onboarding.loop.habit.mockDueToday" style={styles.sectionHeading}>
          {'Due today · 2'}
        </Copy>

        {/* A collapsed row: the quick tap. */}
        <View style={styles.rowCard}>
          <View style={styles.rowHead}>
            <View style={styles.rowBody}>
              <View style={styles.nameLine}>
                <Text style={styles.rowName}>Cold shower</Text>
                <View style={styles.streakChip}>
                  <Ionicons name="flame" size={11} color={Colors.secondary} />
                  <Text style={styles.streakText}>4</Text>
                </View>
              </View>
            </View>
            <View>
              <Chips highlight={2} />
              <Tag id="onboarding.loop.habit.tagQuickTap" label="Quick tap" style={styles.tagQuick} />
            </View>
          </View>
        </View>

        {/* An opened row: the route to Log details. */}
        <View style={[styles.rowCard, styles.rowCardOpen]}>
          <View style={styles.rowHead}>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>Read</Text>
              <Copy id="onboarding.loop.habit.mockMissed" style={styles.rowDetail}>
                {'Missed 1 day this week'}
              </Copy>
            </View>
            <Chips />
          </View>
          <View style={styles.panel}>
            <View style={styles.weekStrip}>
              {MOCK_WEEK.map((day, i) => (
                <View
                  key={i}
                  style={[
                    styles.day,
                    day.state === 'done' && styles.dayDone,
                    day.state === 'missed' && styles.dayMissed,
                    day.state === 'today' && styles.dayToday,
                    day.state === 'future' && styles.dayFuture,
                  ]}
                >
                  <Text style={[styles.dayText, day.state === 'done' && styles.dayTextDone]}>
                    {day.initial}
                  </Text>
                </View>
              ))}
              <Copy id="onboarding.loop.habit.mockWeekCount" style={styles.weekCount}>
                {'1 of 3'}
              </Copy>
            </View>
            <Copy id="onboarding.loop.habit.mockBackfillHint" style={styles.backfillHint}>
              {'Tap a day to log it for that date.'}
            </Copy>
            <View style={styles.routes}>
              <View style={styles.route}>
                <Ionicons name="book-outline" size={14} color={Colors.gray} />
                <Copy id="onboarding.loop.habit.mockAbout" style={styles.routeText}>
                  {'About'}
                </Copy>
              </View>
              <View style={[styles.route, styles.routeOn, styles.ring]}>
                <Ionicons name="create-outline" size={14} color={Colors.gray} />
                <Copy id="onboarding.loop.habit.mockLogDetails" style={styles.routeText}>
                  {'Log details'}
                </Copy>
              </View>
              <View style={styles.route}>
                <Ionicons name="stats-chart-outline" size={14} color={Colors.gray} />
                <Copy id="onboarding.loop.habit.mockHistory" style={styles.routeText}>
                  {'History'}
                </Copy>
              </View>
            </View>
          </View>
          <Tag id="onboarding.loop.habit.tagTapHabit" label="Tap the habit" style={styles.tagOpen} />
        </View>
      </View>
    </FadeRise>

    <FadeRise delay={800}>
      <Copy id="onboarding.loop.habit.body1" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Done it? **Tap 1, 2 or 3** for how hard it was. One tap and it’s logged.'}
      </Copy>
      <Copy id="onboarding.loop.habit.body2" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Want to add minutes, pages or a note? **Tap the habit**, then Log details.'}
      </Copy>
    </FadeRise>
  </View>
);

// ---------------------------------------------------------------- beat 5

export const OnboardingLoopRating: React.FC = () => {
  // The same labels the real date picker shows, so "Today" is today.
  const dates = getEditableDates().slice(0, 5).map(formatRelativeDay);

  return (
    <View style={styles.container}>
      <FadeRise>
        <Step n={2} />
        <Copy id="onboarding.loop.rating.headline" style={ob.headline}>
          {'What 1, 2 and 3 mean.'}
        </Copy>
      </FadeRise>

      <FadeRise delay={400}>
        {/* Log details, cropped: top bar, day, and the rating. */}
        <View
          style={[styles.mock, styles.logDetails]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`The Log details screen asks how hard it was: ${RESISTANCE_LEVELS.map(
            (l) => `${l.value}, ${l.label}`
          ).join('; ')}.`}
        >
          <View style={styles.sheetBar}>
            <View style={styles.sheetBarButton} />
            <Text style={styles.sheetBarTitle}>Floss</Text>
            <View style={styles.sheetBarButton}>
              <Ionicons name="close" size={14} color={Colors.dark} />
            </View>
          </View>
          <Copy id="onboarding.loop.rating.mockWhen" style={styles.whenLabel}>
            {'When did you do it?'}
          </Copy>
          <View style={styles.dateRow}>
            {dates.map((label, i) => (
              <View key={label} style={[styles.dateChip, i === 0 && styles.dateChipOn]}>
                <Text style={[styles.dateChipText, i === 0 && styles.dateChipTextOn]}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.bubble}>
            <Copy id="onboarding.loop.rating.mockHowHard" style={styles.bubbleText}>
              {'How hard was it?'}
            </Copy>
          </View>
          <View style={styles.levels}>
            {RESISTANCE_LEVELS.map((level) => (
              <View key={level.value} style={styles.level}>
                <View style={styles.levelNum}>
                  <Text style={styles.levelNumText}>{level.value}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelLabel}>{level.label}</Text>
                  <Text style={styles.levelSub}>{level.sublabel}</Text>
                </View>
              </View>
            ))}
          </View>
          <Tag id="onboarding.loop.rating.tagLogDetails" label="Log details" style={styles.tagOpen} />
        </View>

        {/* The friction card from Progress: faced climbing, felt falling behind it. */}
        <View
          style={[styles.mock, styles.effortCard]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="The Friction you can handle card on Progress: 18 friction faced in the last 7 days, twice the first weeks, and it felt like a 13."
        >
          <Copy id="onboarding.loop.rating.mockFrictionTitle" style={styles.effortLabel}>
            {'Friction you can handle'}
          </Copy>
          <View style={styles.effortHead}>
            <Text style={styles.effortBig}>18</Text>
            <Copy id="onboarding.loop.rating.mockFrictionCaption" style={styles.effortCaption}>
              {'friction faced in the last 7 days'}
            </Copy>
          </View>
          <View style={styles.effortPill}>
            <Ionicons name="arrow-up" size={11} color={Colors.primary} />
            <Copy id="onboarding.loop.rating.mockFrictionTrend" style={styles.effortPillText}>
              {'Twice your first weeks'}
            </Copy>
          </View>
          <View style={styles.effortBars}>
            {FRICTION_FACED.map((faced, i) => (
              <View key={i} style={styles.effortTrack}>
                <View
                  style={[styles.effortBar, { height: (faced / FRICTION_MAX) * EFFORT_HEIGHT }]}
                />
                <View
                  style={[
                    styles.effortDot,
                    { bottom: (FRICTION_FELT[i] / FRICTION_MAX) * EFFORT_HEIGHT - EFFORT_DOT / 2 },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.axisRow}>
            <Copy id="onboarding.loop.rating.mockAxisStart" style={styles.axisText}>
              {'8 weeks ago'}
            </Copy>
            <Copy id="onboarding.loop.rating.mockAxisEnd" style={styles.axisText}>
              {'Last 7 days'}
            </Copy>
          </View>
        </View>
      </FadeRise>

      <FadeRise delay={800}>
        <Copy id="onboarding.loop.rating.body1" style={ob.body} boldStyle={ob.bodyStrong}>
          {'The same three answers whether you tap them on Today or pick one in Log details. Over the weeks, they become **friction you can handle** on Progress.'}
        </Copy>
        <Copy id="onboarding.loop.rating.body2" style={ob.body}>
          {'The bars climb as you take on more. The dots fall as it gets easier. That gap is you getting stronger.'}
        </Copy>
      </FadeRise>
    </View>
  );
};

// ---------------------------------------------------------------- beat 6

export const OnboardingLoopReflect: React.FC = () => {
  const shown = OFFERED_TACTICS.slice(0, TACTICS_SHOWN);
  const more = OFFERED_TACTICS.length - shown.length;

  return (
    <View style={styles.container}>
      <FadeRise>
        <Step n={3} />
        <Copy id="onboarding.loop.reflect.headline" style={ob.headline}>
          {'After a hard one, reflect — if you want to.'}
        </Copy>
      </FadeRise>

      <FadeRise delay={400}>
        {/* The celebration, over a dimmed Today. */}
        <View
          style={[styles.mock, styles.dim]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`After logging, the XP celebration. After a ${HARD_LEVELS}, it also offers "Reflect on what it took".`}
        >
          <View style={styles.celebrate}>
            <Text style={styles.xp}>+2</Text>
            <Copy id="onboarding.loop.reflect.mockXpUnit" style={styles.xpUnit}>
              {'XP'}
            </Copy>
            <View style={styles.dots}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotOn]} />
              ))}
            </View>
            <View style={styles.streakPill}>
              <Copy id="onboarding.loop.reflect.mockStreak" style={styles.streakPillText}>
                {'1 day streak'}
              </Copy>
            </View>
            <View style={styles.tidbit}>
              <View style={styles.tidbitHeader}>
                <Ionicons name="flash" size={12} color={Colors.primary} />
                <Copy id="onboarding.loop.reflect.mockTidbitLabel" style={styles.tidbitLabel}>
                  {'Your brain right now'}
                </Copy>
              </View>
              <Copy id="onboarding.loop.reflect.mockTidbit" style={styles.tidbitText}>
                {MOCK_TIDBIT}
              </Copy>
            </View>
            <View style={styles.doneButton}>
              <Copy id="onboarding.loop.reflect.mockDone" style={styles.doneText}>
                {'Done'}
              </Copy>
            </View>
            <View>
              <View style={[styles.reflectLink, styles.ring]}>
                <Ionicons name="chatbubbles-outline" size={14} color={Colors.primary} />
                <Copy id="onboarding.loop.reflect.mockReflectLink" style={styles.reflectText}>
                  {'Reflect on what it took'}
                </Copy>
              </View>
              <Tag
                id="onboarding.loop.reflect.tagAfterHard"
                label="After a {levels}"
                vars={{ levels: HARD_LEVELS }}
                style={styles.tagReflect}
              />
            </View>
          </View>
        </View>

        <View style={styles.arrow}>
          <Ionicons name="arrow-down" size={18} color={Colors.gray} />
        </View>

        {/* The reflection screen it opens (full-screen in the app). */}
        <View
          style={[styles.mock, styles.reflection]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`The reflection asks "${TACTIC_PROMPT}" with a list of things that might have helped. It's optional.`}
        >
          <View style={styles.sheetBar}>
            <Ionicons name="close" size={14} color={Colors.gray} />
            <Text style={styles.sheetBarTitle}>Cold shower</Text>
            <View style={{ width: 14 }} />
          </View>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{TACTIC_PROMPT}</Text>
            <Text style={styles.bubbleSub}>{TACTIC_HELPER}</Text>
          </View>
          <Copy id="onboarding.loop.reflect.mockOptional" style={styles.optional}>
            {'Optional — skip if nothing comes to mind'}
          </Copy>
          {shown.map((tactic, i) => {
            const on = i === 0;
            return (
              <View key={tactic.id} style={[styles.tacticRow, on && styles.tacticRowOn]}>
                <Ionicons
                  name={tactic.icon as any}
                  size={16}
                  color={on ? Colors.primary : Colors.gray}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tacticLabel, on && styles.tacticLabelOn]}>
                    {tactic.label}
                  </Text>
                  <Text style={styles.tacticDesc}>{tactic.description}</Text>
                </View>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                </View>
              </View>
            );
          })}
          {more > 0 && (
            <Copy id="onboarding.loop.reflect.mockMore" style={styles.more} vars={{ count: more }}>
              {'+ {count} more'}
            </Copy>
          )}
          <View style={styles.saveButton}>
            <Copy id="onboarding.loop.reflect.mockSave" style={styles.saveText}>
              {'Save reflection'}
            </Copy>
          </View>
          <Copy id="onboarding.loop.reflect.mockSkip" style={styles.skipText}>
            {'Skip for now'}
          </Copy>
        </View>
      </FadeRise>

      <FadeRise delay={800}>
        <Copy id="onboarding.loop.reflect.body" style={ob.body} boldStyle={ob.bodyStrong} vars={{ levels: HARD_LEVELS }}>
          {'Tap a {levels} and you’ll be offered this after the celebration. Never required, always worth it — it quietly builds a playbook of **what actually works for you.**'}
        </Copy>
      </FadeRise>
    </View>
  );
};

const EFFORT_HEIGHT = 44;
const EFFORT_DOT = 7;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },

  // ---- shared --------------------------------------------------------------
  mock: { marginBottom: Spacing.md },
  tag: {
    position: 'absolute',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  tagText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: Colors.white,
  },
  tagQuick: { top: -14, right: -4 },
  tagOpen: { top: -10, left: Spacing.sm + 4 },
  tagReflect: { top: -14, right: -8 },
  /** Soft orange halo on the element a tag points at. */
  ring: {
    shadowColor: Colors.secondary,
    shadowOpacity: 0.45,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetBarButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBarTitle: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  bubble: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderBottomLeftRadius: 4,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  bubbleText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md - 1, color: Colors.dark },
  bubbleSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ---- beat 4: Today -------------------------------------------------------
  sectionHeading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.gray,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  rowCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  rowCardOpen: { borderColor: Colors.gray + '55' },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  rowBody: { flex: 1, gap: 3, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  rowDetail: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.lightGray,
  },
  streakText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary },

  chips: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: Spacing.sm },
  chip: {
    width: 32,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: Colors.white,
  },
  chipGlyph: { fontFamily: Fonts.primaryBold, fontSize: 14, lineHeight: 16 },
  chipCap: { fontFamily: Fonts.secondary, fontSize: 8, lineHeight: 10 },

  panel: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  weekStrip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  day: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayMissed: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  dayToday: { backgroundColor: Colors.lightGray, borderColor: Colors.primary, borderWidth: 1.5 },
  dayFuture: { opacity: 0.4 },
  dayText: { fontFamily: Fonts.secondary, fontSize: 10, color: Colors.gray },
  dayTextDone: { fontFamily: Fonts.secondaryBold, color: Colors.white },
  weekCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
  backfillHint: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.border },
  routes: { flexDirection: 'row', gap: Spacing.xs },
  route: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  routeOn: { borderColor: Colors.secondary },
  routeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },

  // ---- beat 5: Log details + friction card ---------------------------------
  logDetails: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  whenLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
  dateRow: { flexDirection: 'row', gap: Spacing.xs + 1, overflow: 'hidden', marginTop: -2 },
  dateChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  dateChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipText: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: Colors.dark },
  dateChipTextOn: { color: Colors.white },
  levels: { gap: 6 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 1,
    paddingHorizontal: Spacing.sm + 4,
  },
  levelNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  levelLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  levelSub: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray, marginTop: 1 },

  effortCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  effortLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  effortHead: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  effortBig: { fontFamily: Fonts.primaryBold, fontSize: 30, lineHeight: 34, color: Colors.dark },
  effortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '1A',
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  effortPillText: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.primary },
  effortCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: 5,
    flexShrink: 1,
  },
  effortBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    height: EFFORT_HEIGHT,
    marginTop: Spacing.sm + 4,
  },
  effortTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: Colors.border + '55',
    borderRadius: BorderRadius.sm,
  },
  effortBar: { width: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.sm },
  effortDot: {
    position: 'absolute',
    width: EFFORT_DOT,
    height: EFFORT_DOT,
    borderRadius: EFFORT_DOT / 2,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  axisText: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray },

  // ---- beat 6: celebration + reflection ------------------------------------
  dim: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    marginBottom: 0,
  },
  celebrate: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md + 2,
    alignItems: 'center',
  },
  xp: { fontFamily: Fonts.primaryBold, fontSize: 42, lineHeight: 46, color: Colors.primary },
  xpUnit: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    opacity: 0.7,
    marginBottom: Spacing.sm,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lightGray },
  dotOn: { backgroundColor: Colors.secondary },
  streakPill: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  streakPillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  tidbit: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  tidbitHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  tidbitLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    color: Colors.dark,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl + 8,
    paddingVertical: Spacing.sm + 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  doneText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
  reflectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
  },
  reflectText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary },

  arrow: { alignItems: 'center', marginVertical: Spacing.xs + 2 },

  reflection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  optional: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  tacticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
  },
  tacticRowOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '14' },
  tacticLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs + 1, color: Colors.dark },
  tacticLabelOn: { color: Colors.primary },
  tacticDesc: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
    lineHeight: 15,
    marginTop: 1,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  more: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray, textAlign: 'center' },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  saveText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

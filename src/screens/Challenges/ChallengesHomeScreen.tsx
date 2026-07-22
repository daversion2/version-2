import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ChallengesScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { Challenge, ProgramEnrollment } from '../../types';
import { getActiveChallenges, getActiveExtendedChallenges } from '../../services/challenges';
import { getActiveEnrollment, getTodaysProgramContent, checkAndProcessMissedDays } from '../../services/programs';
import { FeatureInfoModal } from '../../components/common/FeatureInfoModal';

const UNLOCK_AT = 3; // practice check-ins required to unlock challenges
const EXTENDED_COLOR = '#7B61FF'; // multi-day/extended challenge accent (purple)

type Props = ChallengesScreenProps<'ChallengesHome'>;

/**
 * The Challenges tab landing screen. Custom challenges the user sets for
 * themselves. Gated behind {UNLOCK_AT} practice check-ins; once unlocked it's a
 * hub of active challenges + entry points to create / browse / past.
 */
export const ChallengesHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [daily, setDaily] = useState<Challenge[]>([]);
  const [extended, setExtended] = useState<Challenge[]>([]);
  const [program, setProgram] = useState<ProgramEnrollment | null>(null);
  const [programDayNumber, setProgramDayNumber] = useState(0);
  const [programCheckedIn, setProgramCheckedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const totalCompleted = userProfile?.totalHabitsCompleted ?? 0;
  const unlocked = totalCompleted >= UNLOCK_AT;
  const remaining = Math.max(UNLOCK_AT - totalCompleted, 0);
  // Programs are admin-only for now — hidden from regular users until launch.
  // An active enrollment stays reachable regardless, so nobody gets stranded
  // mid-program.
  const isAdmin = userProfile?.is_admin === true;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      await refreshProfile();
      const [d, e, enrollment] = await Promise.all([
        getActiveChallenges(user.uid),
        getActiveExtendedChallenges(user.uid),
        getActiveEnrollment(user.uid),
      ]);
      setDaily(d);
      setExtended(e);
      setProgram(enrollment);

      // Program day content + missed-day processing (used to run on Home).
      if (enrollment) {
        try {
          await checkAndProcessMissedDays(user.uid, enrollment.id);
          const content = await getTodaysProgramContent(user.uid, enrollment.id);
          if (content) {
            setProgramDayNumber(content.dayNumber);
            setProgramCheckedIn(content.isCheckedIn);
          }
        } catch (err) {
          console.warn('Program data load failed:', err);
        }
      } else {
        setProgramDayNumber(0);
        setProgramCheckedIn(false);
      }
    } catch (err) {
      console.warn('Failed to load challenges:', err);
    }
  }, [user, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ---- Locked state -------------------------------------------------------
  if (!unlocked) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.lockContent}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={44} color={Colors.secondary} />
        </View>
        <Text style={styles.lockTitle}>Challenges unlock soon</Text>
        <Text style={styles.lockText}>
          Build the habit first. Check off {UNLOCK_AT} practices and you'll unlock challenges you set
          for yourself.
        </Text>

        <View style={styles.dots}>
          {Array.from({ length: UNLOCK_AT }).map((_, i) => (
            <View key={i} style={[styles.dot, i < totalCompleted && styles.dotFilled]}>
              {i < totalCompleted && <Ionicons name="checkmark" size={12} color={Colors.white} />}
            </View>
          ))}
        </View>
        <Text style={styles.dotCount}>
          {Math.min(totalCompleted, UNLOCK_AT)} of {UNLOCK_AT} check-ins
        </Text>

        <TouchableOpacity
          style={styles.lockCta}
          activeOpacity={0.85}
          onPress={() => navigation.getParent()?.navigate('Home' as never)}
        >
          <Ionicons name="flame" size={18} color={Colors.white} />
          <Text style={styles.lockCtaText}>
            {remaining} more to go — go to my practices
          </Text>
        </TouchableOpacity>

        {/* Programs aren't gated — keep an active enrollment reachable. */}
        {program && (
          <View style={styles.lockProgram}>
            <ProgramCard
              program={program}
              dayNumber={programDayNumber}
              checkedIn={programCheckedIn}
              onPress={() => navigation.navigate('ProgramDashboard', { enrollmentId: program.id })}
            />
          </View>
        )}
      </ScrollView>
    );
  }

  // ---- Unlocked hub -------------------------------------------------------
  const hasActive = daily.length + extended.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.h1}>
            Set yourself a <Text style={styles.h1em}>test.</Text>
          </Text>
          <Text style={styles.h2}>
            Custom challenges you take on for yourself — a one-off push or a multi-day streak.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowInfo(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          style={styles.headerInfo}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Active */}
      {hasActive && (
        <>
          <Text style={styles.sectionLabel}>Active</Text>
          {daily.map((c) => (
            <ChallengeItem
              key={c.id}
              challenge={c}
              extended={false}
              onPress={() => navigation.navigate('CompleteChallenge', { challenge: c })}
            />
          ))}
          {extended.map((c) => (
            <ChallengeItem
              key={c.id}
              challenge={c}
              extended
              onPress={() => navigation.navigate('ExtendedChallengeProgress', { challenge: c })}
            />
          ))}
        </>
      )}

      {/* New challenge CTA */}
      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('CreateChallenge')}
      >
        <Ionicons name="add-circle" size={22} color={Colors.white} />
        <Text style={styles.ctaText}>New challenge</Text>
      </TouchableOpacity>

      {/* Links */}
      <View style={styles.links}>
        <LinkRow
          icon="grid-outline"
          name="Browse the library"
          desc="Ready-made challenges by the barrier they target"
          onPress={() => navigation.navigate('ChallengeLibrary')}
        />
        <LinkRow
          icon="time-outline"
          name="Past challenges"
          desc="Repeat one you've done, or review your wins"
          onPress={() => navigation.navigate('PastChallenges')}
          last
        />
      </View>

      {!hasActive && (
        <Text style={styles.emptyHint}>No active challenges. Create one or browse the library to start.</Text>
      )}

      {/* Programs — guided multi-day sequences (admin-only for now) */}
      {(isAdmin || program) && <Text style={styles.sectionLabel}>Programs</Text>}
      {program && (
        <ProgramCard
          program={program}
          dayNumber={programDayNumber}
          checkedIn={programCheckedIn}
          onPress={() => navigation.navigate('ProgramDashboard', { enrollmentId: program.id })}
        />
      )}
      {isAdmin && (
        <View style={styles.links}>
          <LinkRow
            icon="map-outline"
            name="Explore programs"
            desc="Guided multi-day sequences that build a skill"
            onPress={() => navigation.navigate('ProgramDiscovery')}
            last
          />
        </View>
      )}

      <FeatureInfoModal
        visible={showInfo}
        onDismiss={() => setShowInfo(false)}
        icon="trophy"
        accent={Colors.secondary}
        title="Challenges"
        intro="Challenges are tests you set for yourself — a deliberate push beyond your daily practices, on your own terms."
        points={[
          {
            label: 'Set the test.',
            text: 'Create a challenge: a one-off push to do today, or a multi-day streak you commit to holding.',
          },
          {
            label: 'Take it on.',
            text: 'Check in as you go. A challenge is meant to stretch you a little past comfortable — that’s the point.',
          },
          {
            label: 'Earn the win.',
            text: 'Completing a challenge banks XP and proves the practice is sticking. Then set the next, harder one.',
          },
        ]}
        footer="Unlocked by showing up to your practices — challenges are where you spend that momentum."
      />
    </ScrollView>
  );
};

// ---- Sub-components -------------------------------------------------------

const ChallengeItem: React.FC<{ challenge: Challenge; extended: boolean; onPress: () => void }> = ({
  challenge,
  extended,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.card, extended && styles.cardExt]}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={styles.cardRow}>
      <View style={[styles.cardIcon, extended && styles.cardIconExt]}>
        <Ionicons name={extended ? 'calendar' : 'flash'} size={20} color={extended ? EXTENDED_COLOR : Colors.secondary} />
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.cardTag, extended && styles.cardTagExt]}>{extended ? 'Multi-day' : 'Today'}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{challenge.name}</Text>
        {!!challenge.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{challenge.description}</Text>
        )}
      </View>
    </View>
    <View style={styles.cardFoot}>
      <Text style={styles.cardProg}>{extended ? 'In progress' : 'Set for today'}</Text>
      <View style={[styles.cardBtn, extended && styles.cardBtnExt]}>
        <Ionicons name={extended ? 'play' : 'checkmark'} size={14} color={Colors.white} />
        <Text style={styles.cardBtnText}>{extended ? 'Check in' : 'Complete'}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

/** Active program enrollment card — day counter + today's check-in status. */
const ProgramCard: React.FC<{
  program: ProgramEnrollment;
  dayNumber: number;
  checkedIn: boolean;
  onPress: () => void;
}> = ({ program, dayNumber, checkedIn, onPress }) => (
  <TouchableOpacity
    style={[styles.card, styles.cardProgram]}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={styles.cardRow}>
      <View style={[styles.cardIcon, styles.cardIconProgram]}>
        <Ionicons name="rocket" size={20} color={Colors.primary} />
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.cardTag, styles.cardTagProgram]}>
          Day {dayNumber} of {program.duration_days}
        </Text>
        <Text style={styles.cardName} numberOfLines={2}>{program.program_name}</Text>
      </View>
    </View>
    <View style={styles.cardFoot}>
      <Text style={styles.cardProg}>
        {checkedIn ? 'Checked in today' : 'Not checked in yet'}
      </Text>
      <View style={[styles.cardBtn, styles.cardBtnProgram]}>
        <Ionicons name={checkedIn ? 'checkmark' : 'play'} size={14} color={Colors.white} />
        <Text style={styles.cardBtnText}>{checkedIn ? 'View' : 'Check in'}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const LinkRow: React.FC<{ icon: string; name: string; desc: string; onPress: () => void; last?: boolean }> = ({
  icon,
  name,
  desc,
  onPress,
  last,
}) => (
  <TouchableOpacity style={[styles.link, last && styles.linkLast]} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.linkIcon}>
      <Ionicons name={icon as any} size={19} color={Colors.primary} />
    </View>
    <View style={styles.linkText}>
      <Text style={styles.linkName}>{name}</Text>
      <Text style={styles.linkDesc}>{desc}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerText: { flex: 1 },
  headerInfo: { paddingLeft: Spacing.md, paddingTop: Spacing.xs },
  h1: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  h1em: { color: Colors.secondary },
  h2: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: Spacing.sm, lineHeight: 20 },

  sectionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },

  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardExt: { borderLeftColor: EXTENDED_COLOR },
  cardProgram: { borderLeftColor: Colors.primary },
  cardIconProgram: { backgroundColor: Colors.primary + '1F' },
  cardTagProgram: { color: Colors.primary },
  cardBtnProgram: { backgroundColor: Colors.primary },
  lockProgram: { alignSelf: 'stretch', marginTop: Spacing.xl },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconExt: { backgroundColor: EXTENDED_COLOR + '1F' },
  cardMeta: { flex: 1 },
  cardTag: {
    fontFamily: Fonts.primaryBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.secondary,
  },
  cardTagExt: { color: EXTENDED_COLOR },
  cardName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginTop: 2 },
  cardDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 3, lineHeight: 17 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  cardProg: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  cardBtnExt: { backgroundColor: EXTENDED_COLOR },
  cardBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },

  links: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  linkLast: { borderBottomWidth: 0 },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { flex: 1 },
  linkName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  linkDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },

  emptyHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.xl,
    lineHeight: 20,
  },

  // Locked state
  lockContent: { alignItems: 'center', padding: Spacing.xl, paddingTop: Spacing.xxl },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.secondary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  lockTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  lockText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  dots: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  dotCount: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.secondary, marginTop: Spacing.sm },
  lockCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  lockCtaText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { CravingOutcome } from '../../types';
import {
  CRAVING_TYPES,
  CravingTypeId,
  durationForIntensity,
  getCravingCards,
  getCravingType,
  getMissionCategory,
  CARD_ROTATION_SECONDS,
  LESSON_SETS,
  OUTCOME_COPY,
} from '../../data/cravings';
import { MIND_TAG_GROUPS } from '../../data/mindTags';
import {
  logCravingSession,
  getCravingLogs,
  summarizeCravingPatterns,
  CravingPatternSummary,
} from '../../services/cravings';
import {
  scheduleCravingPings,
  cancelCravingPings,
} from '../../services/cravingNotifications';
import { ActivityMenu, InAppActivityId } from '../../components/craving/ActivityMenu';
import { BreatheActivity } from '../../components/craving/BreatheActivity';
import { LearnActivity } from '../../components/craving/LearnActivity';
import { GroundActivity } from '../../components/craving/GroundActivity';
import { NameItActivity } from '../../components/craving/NameItActivity';
import { MissionBrief } from '../../components/craving/MissionBrief';
import { showAlert, showConfirm } from '../../utils/alert';
import { triggerRewardHaptic } from '../../utils/haptics';

type Props = HomeScreenProps<'CravingCrusher'>;

type Phase = 'setup' | 'riding' | 'reflect';
type RidingView = InAppActivityId | 'menu' | 'mission' | 'away' | 'welcome_back';

const formatClock = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** Bell-curve heights (0–1) for the wave visual — build, peak early, long tail. */
const WAVE_SHAPE = Array.from({ length: 24 }, (_, i) => {
  const x = i / 23;
  return 0.15 + 0.85 * Math.exp(-Math.pow((x - 0.3) / 0.28, 2));
});

export const CravingCrusherScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('setup');
  const [cravingType, setCravingType] = useState<CravingTypeId>('food');
  const [customLabel, setCustomLabel] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [patterns, setPatterns] = useState<CravingPatternSummary | null>(null);
  const [logsCount, setLogsCount] = useState(0);

  // Riding state — timestamps live in refs so re-renders never drift the clock.
  const startedAtRef = useRef<Date | null>(null);
  const plannedSecondsRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [activity, setActivity] = useState<RidingView>('menu');
  const activityRef = useRef<RidingView>('menu');
  activityRef.current = activity;

  // Off-app mission state
  const [missionCategoryId, setMissionCategoryId] = useState<string | null>(null);
  const usedMissionRef = useRef<string | null>(null);
  const notificationIdsRef = useRef<string[]>([]);
  const awayStartRef = useRef<number | null>(null);
  const [awaySeconds, setAwaySeconds] = useState(0);

  // Reflect state
  const [outcome, setOutcome] = useState<CravingOutcome>('passed');
  const [secondsHeld, setSecondsHeld] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [nameItText, setNameItText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCravingLogs(user.uid)
      .then((logs) => {
        setPatterns(summarizeCravingPatterns(logs));
        setLogsCount(logs.length);
      })
      .catch((err) => console.warn('Failed to load craving patterns:', err));
  }, [user]);

  // Countdown driven by wall-clock time so backgrounding stays accurate.
  useEffect(() => {
    if (phase !== 'riding' || !startedAtRef.current) return;
    const startedMs = startedAtRef.current.getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedMs) / 1000);
      setSecondsLeft(Math.max(0, plannedSecondsRef.current - elapsed));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [phase]);

  const cancelPings = useCallback(() => {
    if (notificationIdsRef.current.length === 0) return;
    cancelCravingPings(notificationIdsRef.current).catch(() => {});
    notificationIdsRef.current = [];
  }, []);

  // Coming back to the foreground mid-mission → welcome-back check-in.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && activityRef.current === 'away') {
        cancelPings();
        if (awayStartRef.current) {
          setAwaySeconds(Math.floor((Date.now() - awayStartRef.current) / 1000));
        }
        setActivity('welcome_back');
      }
    });
    return () => sub.remove();
  }, [cancelPings]);

  // Never leave pings scheduled after the screen is gone.
  useEffect(() => () => cancelPings(), [cancelPings]);

  const handleStart = () => {
    plannedSecondsRef.current = durationForIntensity(intensity);
    startedAtRef.current = new Date();
    setSecondsLeft(plannedSecondsRef.current);
    setActivity('menu');
    setPhase('riding');
  };

  const elapsedNow = () =>
    startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)
      : 0;

  const handleOutcome = (result: CravingOutcome) => {
    cancelPings();
    setSecondsHeld(Math.min(plannedSecondsRef.current, elapsedNow()));
    setOutcome(result);
    setPhase('reflect');
  };

  const handleAbandon = () => {
    showConfirm(
      'Leave without logging?',
      'This session won’t be saved. Even a gave-in log helps you spot patterns.',
      () => {
        cancelPings();
        navigation.goBack();
      },
      'Leave',
      'Keep riding'
    );
  };

  const handleGoAway = async () => {
    usedMissionRef.current = missionCategoryId;
    awayStartRef.current = Date.now();
    setActivity('away');
    const left = Math.max(0, plannedSecondsRef.current - elapsedNow());
    try {
      notificationIdsRef.current = await scheduleCravingPings(
        left,
        plannedSecondsRef.current
      );
    } catch (err) {
      console.warn('Failed to schedule craving pings:', err);
    }
  };

  const handleImBack = () => {
    cancelPings();
    if (awayStartRef.current) {
      setAwaySeconds(Math.floor((Date.now() - awayStartRef.current) / 1000));
    }
    setActivity('welcome_back');
  };

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user || !startedAtRef.current || saving) return;
    setSaving(true);
    try {
      const { pointsEarned } = await logCravingSession(user.uid, {
        cravingType,
        customLabel: cravingType === 'other' ? customLabel : undefined,
        intensity,
        outcome,
        secondsHeld,
        plannedSeconds: plannedSecondsRef.current,
        startedAt: startedAtRef.current,
        mindTags: selectedTags,
        note,
        mission: usedMissionRef.current ?? undefined,
      });
      triggerRewardHaptic().catch(() => {});
      const title = outcome === 'passed' ? `+${pointsEarned} XP` : `+${pointsEarned} XP for logging it`;
      const body =
        outcome === 'passed'
          ? 'Craving ridden out and on the record.'
          : 'On the record — that’s how the patterns get visible.';
      showAlert(title, body, () => navigation.goBack());
    } catch (err) {
      console.warn('Failed to save craving session:', err);
      showAlert('Error', 'Could not save this session. Please try again.');
      setSaving(false);
    }
  };

  const planned = plannedSecondsRef.current;
  const elapsedFraction = planned > 0 ? (planned - secondsLeft) / planned : 0;
  const timerDone = phase === 'riding' && secondsLeft === 0;

  const cards = useMemo(() => getCravingCards(cravingType), [cravingType]);
  const cardIndex =
    Math.floor((planned - secondsLeft) / CARD_ROTATION_SECONDS) % cards.length;
  const card = cards[Math.max(0, cardIndex)] ?? cards[0];

  const typeDef = getCravingType(cravingType);
  const badgeLabel =
    cravingType === 'other' && customLabel.trim() ? customLabel.trim() : typeDef.label;
  const missionCategory = missionCategoryId ? getMissionCategory(missionCategoryId) : undefined;

  // --- Setup phase ---------------------------------------------------------

  if (phase === 'setup') {
    const minutes = durationForIntensity(intensity) / 60;
    return (
      <SafeAreaView style={styles.setupContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.setupKicker}>You noticed something. Good.</Text>
          <Text style={styles.setupTitle}>What’s pulling at you right now?</Text>
          <Text style={styles.setupSub}>
            Naming it is already the first step. The urge will peak, then pass.
          </Text>

          <View style={styles.typeGrid}>
            {CRAVING_TYPES.map((t) => {
              const selected = t.id === cravingType;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeTile, selected && styles.typeTileSelected]}
                  onPress={() => setCravingType(t.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                  <Text style={styles.typeDesc}>{t.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cravingType === 'other' && (
            <View style={styles.customLabelCard}>
              <Text style={styles.intensityTitle}>What would you call it?</Text>
              <TextInput
                style={styles.customLabelInput}
                placeholder="e.g. chocolate, checking email, nail biting…"
                placeholderTextColor={Colors.gray}
                value={customLabel}
                onChangeText={setCustomLabel}
                maxLength={40}
                returnKeyType="done"
              />
            </View>
          )}

          <View style={styles.intensityCard}>
            <Text style={styles.intensityTitle}>How strong is it right now?</Text>
            <Text style={styles.intensitySub}>Stronger waves get a longer timer</Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.dotTouch}
                  onPress={() => setIntensity(n)}
                  hitSlop={{ top: 8, bottom: 8 }}
                >
                  <View
                    style={[
                      styles.dot,
                      n <= intensity && (n >= 8 ? styles.dotHigh : styles.dotFilled),
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dotLabels}>
              <Text style={styles.dotLabelText}>Mild</Text>
              <Text style={styles.dotLabelText}>Overwhelming</Text>
            </View>
          </View>

          {patterns && (
            <View style={styles.patternsCard}>
              <Text style={styles.patternsTitle}>Your patterns so far</Text>
              <Text style={styles.patternsText}>
                {patterns.total} logged · {patterns.passed} ridden out (
                {Math.round(patterns.crushRate * 100)}%)
                {patterns.peakWindow ? ` · most often ${patterns.peakWindow}` : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startButtonText}>Start the {minutes}-min ride</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.startHint}>You don’t have to fight it — just outlast it</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Riding phase --------------------------------------------------------

  if (phase === 'riding') {
    // Away mode: minimal dimmed screen — the whole point is the phone is down.
    if (activity === 'away') {
      return (
        <SafeAreaView style={styles.ridingContainer}>
          <View style={styles.awayWrap}>
            <Text style={styles.awayEmoji}>{missionCategory?.emoji ?? '🌊'}</Text>
            <Text style={styles.awayTitle}>Phone down — we’ve got the timer</Text>
            <Text style={styles.awayDigits}>{formatClock(secondsLeft)}</Text>
            <Text style={styles.awaySub}>
              A ping will land when the wave should have passed.{'\n'}Go do the mission.
            </Text>
            <TouchableOpacity style={styles.imBackButton} onPress={handleImBack}>
              <Text style={styles.imBackText}>I’m back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Welcome back: returning from a mission (early, on the ping, or via "I'm back").
    if (activity === 'welcome_back') {
      return (
        <SafeAreaView style={styles.ridingContainer}>
          <View style={styles.wbWrap}>
            <Text style={styles.awayEmoji}>👋</Text>
            <Text style={styles.wbTitle}>Welcome back.</Text>
            <Text style={styles.wbSub}>
              You took the ride out into the world — that’s the strongest version
              of this.{missionCategory ? ` The mission asked what you noticed…` : ''}
            </Text>

            <View style={styles.wbStatsCard}>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>{formatClock(awaySeconds)}</Text>
                <Text style={styles.wbStatLabel}>Time away</Text>
              </View>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>
                  {missionCategory ? `${missionCategory.emoji} ${missionCategory.label}` : '—'}
                </Text>
                <Text style={styles.wbStatLabel}>Mission</Text>
              </View>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>{intensity}/10</Text>
                <Text style={styles.wbStatLabel}>Started at</Text>
              </View>
            </View>

            <Text style={styles.wbQuestion}>Where did the craving land?</Text>
            <Text style={styles.wbQuestionSub}>Honest answer — both feed your patterns.</Text>

            <View style={styles.wbFooter}>
              <TouchableOpacity
                style={styles.passedButton}
                onPress={() => handleOutcome('passed')}
                activeOpacity={0.85}
              >
                <Text style={styles.passedButtonText}>It passed — log the ride</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stillRidingButton}
                onPress={() => setActivity('menu')}
              >
                <Text style={styles.stillRidingText}>Still riding — keep the timer going</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOutcome('gave_in')}>
                <Text style={styles.wbGaveInText}>I gave in while I was away — log it anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    const onMenu = activity === 'menu';
    const showOutcomeFooter = onMenu || activity === 'ride';

    return (
      <SafeAreaView style={styles.ridingContainer}>
        <View style={styles.headerRow}>
          {onMenu ? (
            <TouchableOpacity onPress={handleAbandon} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setActivity('menu')} style={styles.closeButton}>
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{typeDef.emoji}</Text>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badgeLabel} · {intensity}/10
            </Text>
          </View>
          <View style={styles.closeButton} />
        </View>

        {/* Compact persistent timer strip */}
        <View style={styles.stripRow}>
          <Text style={styles.stripDigits}>{formatClock(secondsLeft)}</Text>
          <Text style={styles.stripLabel}>{timerDone ? 'time’s up' : 'left'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${elapsedFraction * 100}%` }]} />
        </View>

        <View style={styles.activityArea}>
          {onMenu && (
            <ActivityMenu
              onSelectActivity={(id) => setActivity(id)}
              onSelectMission={(categoryId) => {
                setMissionCategoryId(categoryId);
                setActivity('mission');
              }}
            />
          )}

          {activity === 'ride' && (
            <View style={{ flex: 1 }}>
              <View style={styles.waveRow}>
                {WAVE_SHAPE.map((h, i) => {
                  const markerIndex = Math.min(
                    WAVE_SHAPE.length - 1,
                    Math.floor(elapsedFraction * WAVE_SHAPE.length)
                  );
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        { height: 12 + h * 48 },
                        i <= markerIndex ? styles.waveBarPast : styles.waveBarFuture,
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.waveCaption}>
                {timerDone
                  ? 'The wave has run its course'
                  : elapsedFraction > 0.3
                    ? 'Past the peak — it only fades from here'
                    : 'Building toward the peak — hold on'}
              </Text>

              <View style={styles.contentCard}>
                <Text style={styles.contentKind}>{card.title.toUpperCase()}</Text>
                <Text style={styles.contentText}>{card.text}</Text>
              </View>
            </View>
          )}

          {activity === 'breathe' && <BreatheActivity />}
          {activity === 'learn' && (
            <LearnActivity setIndex={logsCount % LESSON_SETS.length} />
          )}
          {activity === 'ground' && <GroundActivity />}
          {activity === 'name' && (
            <NameItActivity
              initialText={nameItText}
              onSave={(text) => {
                setNameItText(text);
                setNote(text);
              }}
            />
          )}
          {activity === 'mission' && missionCategory && (
            <MissionBrief
              category={missionCategory}
              timeLeftLabel={formatClock(secondsLeft)}
              onGo={handleGoAway}
            />
          )}
        </View>

        {showOutcomeFooter ? (
          <View style={styles.ridingFooter}>
            <TouchableOpacity
              style={styles.passedButton}
              onPress={() => handleOutcome('passed')}
              activeOpacity={0.85}
            >
              <Text style={styles.passedButtonText}>
                {timerDone ? 'It passed — log it' : 'It already passed'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gaveInButton} onPress={() => handleOutcome('gave_in')}>
              <Text style={styles.gaveInButtonText}>I gave in — log it anyway</Text>
            </TouchableOpacity>
          </View>
        ) : (
          timerDone &&
          activity !== 'mission' && (
            <TouchableOpacity
              style={styles.timesUpBanner}
              onPress={() => setActivity('menu')}
              activeOpacity={0.85}
            >
              <Text style={styles.timesUpText}>
                Time’s up — head back when you’re ready →
              </Text>
            </TouchableOpacity>
          )
        )}
      </SafeAreaView>
    );
  }

  // --- Reflect phase -------------------------------------------------------

  const copy = OUTCOME_COPY[outcome];
  const heldMinutes = Math.floor(secondsHeld / 60);
  const heldLabel =
    heldMinutes >= 1 ? `${heldMinutes} min` : `${secondsHeld} seconds`;

  return (
    <SafeAreaView style={styles.setupContainer}>
      <ScrollView
        contentContainerStyle={styles.setupContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.outcomeEmoji}>{copy.emoji}</Text>
        <Text style={styles.outcomeTitle}>{copy.headline}</Text>
        <Text style={styles.outcomeBody}>{copy.body}</Text>

        <View style={styles.heldCard}>
          <Text style={styles.heldValue}>{heldLabel}</Text>
          <Text style={styles.heldLabel}>
            {outcome === 'passed' ? 'riding the wave' : 'held before it broke through — that time counts'}
          </Text>
        </View>

        <Text style={styles.reflectPrompt}>What did you notice your mind doing?</Text>
        <Text style={styles.reflectHelper}>Tap anything that showed up — optional.</Text>
        {MIND_TAG_GROUPS.map((group) => (
          <View key={group.id} style={styles.tagGroup}>
            <Text style={styles.tagGroupTitle}>{group.title}</Text>
            <View style={styles.tagWrap}>
              {group.tags.map((tag) => {
                const selected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TextInput
          style={styles.noteInput}
          placeholder={
            usedMissionRef.current
              ? 'What did you notice out there? (optional)'
              : 'What was happening when it hit? (optional)'
          }
          placeholderTextColor={Colors.gray}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <TouchableOpacity
          style={[styles.startButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.startButtonText}>Log it</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const DARK_BG = '#20272B';

const styles = StyleSheet.create({
  // Shared
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: { padding: Spacing.xs, width: 36 },

  // Setup
  setupContainer: { flex: 1, backgroundColor: Colors.lightGray },
  setupContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  setupKicker: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  setupTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  setupSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeTile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F8F9',
  },
  typeEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  typeLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  typeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  customLabelCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  customLabelInput: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
  },
  intensityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  intensityTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  intensitySub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dotTouch: { flex: 1 },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  dotFilled: { backgroundColor: Colors.primary },
  dotHigh: { backgroundColor: Colors.secondary },
  dotLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  dotLabelText: { fontFamily: Fonts.secondary, fontSize: 10, color: Colors.gray },
  patternsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  patternsTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  patternsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
  },
  startButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  startHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },

  // Riding
  ridingContainer: { flex: 1, backgroundColor: DARK_BG },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
  },
  badgeEmoji: { fontSize: 13 },
  badgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  stripDigits: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.white,
    fontVariant: ['tabular-nums'],
  },
  stripLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressTrack: {
    marginHorizontal: Spacing.lg,
    height: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  activityArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: Spacing.lg,
    height: 64,
  },
  waveBar: { flex: 1, borderRadius: 2 },
  waveBarPast: { backgroundColor: Colors.primary },
  waveBarFuture: { backgroundColor: 'rgba(255,255,255,0.12)' },
  waveCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  contentCard: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  contentKind: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: '#7AB8C0',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  contentText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  ridingFooter: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  passedButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  passedButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  gaveInButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
  },
  gaveInButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.55)',
  },
  timesUpBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(33,113,128,0.25)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    alignItems: 'center',
  },
  timesUpText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  // Away mode
  awayWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  awayEmoji: { fontSize: 52, marginBottom: Spacing.md },
  awayTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    textAlign: 'center',
  },
  awayDigits: {
    fontFamily: Fonts.primaryBold,
    fontSize: 56,
    color: 'rgba(255,255,255,0.85)',
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.md,
  },
  awaySub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.md,
  },
  imBackButton: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
  },
  imBackText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
  },

  // Welcome back
  wbWrap: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  wbTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  wbSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  wbStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  wbStat: { alignItems: 'center', paddingHorizontal: Spacing.xs },
  wbStatValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: '#7AB8C0',
  },
  wbStatLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  wbQuestion: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginTop: Spacing.xl,
  },
  wbQuestionSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  },
  wbFooter: { alignSelf: 'stretch', marginTop: 'auto', marginBottom: Spacing.lg, gap: Spacing.sm },
  stillRidingButton: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
  },
  stillRidingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  wbGaveInText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },

  // Reflect
  outcomeEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.lg },
  outcomeTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  outcomeBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heldCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heldValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  heldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  reflectPrompt: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  reflectHelper: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  tagGroup: { marginBottom: Spacing.md },
  tagGroupTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tagChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F8F9',
  },
  tagChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  tagChipTextSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  noteInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
});

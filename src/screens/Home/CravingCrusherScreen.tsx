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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Copy } from '../../components/common/Copy';
import { useAuth } from '../../context/AuthContext';
import { useCopy } from '../../context/CopyContext';
import { CravingLog, CravingOutcome } from '../../types';
import {
  CRAVING_TYPES,
  CravingTypeId,
  durationForIntensity,
  getCravingCards,
  getCravingType,
  getMissionCategory,
  CARD_ROTATION_SECONDS,
  OUTCOME_COPY,
} from '../../data/cravings';
import {
  logCravingSession,
  getCravingLogs,
  saveCravingPlan,
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
import { WaveTrendChart } from '../../components/craving/WaveTrendChart';
import { showAlert, showConfirm } from '../../utils/alert';
import { copyText } from '../../services/appCopy';
import { triggerRewardHaptic } from '../../utils/haptics';

// Opened from Craving Crusher's home (root route CravingRide) and, for the
// classic look, the Home stack. It only ever goes back, so either works.
type Props = { navigation: { goBack: () => void } };

type Phase = 'setup' | 'riding' | 'reflect' | 'complete';
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

const hourWindowLabel = (d: Date): string => {
  const h = d.getHours();
  if (h >= 5 && h < 12) return copyText('craving.ride.hour.morning', 'in the morning');
  if (h >= 12 && h < 17) return copyText('craving.ride.hour.afternoon', 'in the afternoon');
  if (h >= 17 && h < 22) return copyText('craving.ride.hour.evening', 'in the evening');
  return copyText('craving.ride.hour.night', 'late at night');
};

/**
 * The savor pause — shown before any numbers after a ridden-out craving.
 * Emotionally-felt endings consolidate into memory far more strongly than
 * ones rushed past; the reward loop closes on the felt win, not the XP.
 * Continue appears after ~2 slow breaths.
 */
const SavorPause: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  const pulse = useRef(new Animated.Value(0.85)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 4000, useNativeDriver: true }),
      ])
    );
    loop.start();
    const timer = setTimeout(() => setReady(true), 8000);
    return () => {
      loop.stop();
      clearTimeout(timer);
    };
  }, [pulse]);

  return (
    <SafeAreaView style={savorStyles.container}>
      <View style={savorStyles.stage}>
        <Copy id="craving.ride.savor.kicker" style={savorStyles.kicker}>BEFORE THE NUMBERS</Copy>
        <Copy id="craving.ride.savor.title" style={savorStyles.title}>Stop for a moment.</Copy>
        <Copy id="craving.ride.savor.instruction" style={savorStyles.instruction}>Take two deep breaths.</Copy>
        <Animated.View style={[savorStyles.circle, { transform: [{ scale: pulse }] }]} />
        <Copy id="craving.ride.savor.body" style={savorStyles.body}>
          {'Notice how it feels to be on the other side of the wave.\nThat feeling is the reward — let it register.'}
        </Copy>
        <Copy id="craving.ride.savor.science" style={savorStyles.science}>
          Slow breaths activate your parasympathetic nervous system, helping your brain consolidate this win into long-term memory.
        </Copy>
        {ready ? (
          <TouchableOpacity style={savorStyles.continueButton} onPress={onContinue}>
            <Copy id="craving.ride.savor.continue" style={savorStyles.continueText}>Continue →</Copy>
          </TouchableOpacity>
        ) : (
          <View style={savorStyles.continuePlaceholder} />
        )}
      </View>
    </SafeAreaView>
  );
};

export const CravingCrusherScreen: React.FC<Props> = ({ navigation }) => {
  const t = useCopy();
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('setup');
  const [cravingType, setCravingType] = useState<CravingTypeId>('food');
  const [customLabel, setCustomLabel] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [patterns, setPatterns] = useState<CravingPatternSummary | null>(null);
  const [logsCount, setLogsCount] = useState(0);
  const [allLogs, setAllLogs] = useState<CravingLog[]>([]);

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
  const [exitIntensity, setExitIntensity] = useState<number | null>(null);
  const extensionsRef = useRef(0);
  const [note, setNote] = useState('');
  const [nameItText, setNameItText] = useState('');
  const [saving, setSaving] = useState(false);

  // Post-log completion state
  const [saveResult, setSaveResult] = useState<{
    points: number;
    logId: string;
  } | null>(null);
  const [savorDone, setSavorDone] = useState(false);
  const [chosenPlan, setChosenPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCravingLogs(user.uid)
      .then((logs) => {
        setPatterns(summarizeCravingPatterns(logs));
        setLogsCount(logs.length);
        setAllLogs(logs);
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
      t('craving.ride.abandon.title', 'Leave without logging?'),
      t('craving.ride.abandon.message', 'This session won’t be saved. Even a gave-in log helps you spot patterns.'),
      () => {
        cancelPings();
        navigation.goBack();
      },
      t('craving.ride.abandon.leave', 'Leave'),
      t('craving.ride.abandon.keep', 'Keep riding')
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

  /** "Still going" at timer end: another 5 minutes on the clock, no reset. */
  const EXTEND_SECONDS = 5 * 60;
  const handleExtend = () => {
    plannedSecondsRef.current += EXTEND_SECONDS;
    extensionsRef.current += 1;
    setSecondsLeft(Math.max(0, plannedSecondsRef.current - elapsedNow()));
  };

  const handleSave = async () => {
    if (!user || !startedAtRef.current || saving) return;
    setSaving(true);
    try {
      const { pointsEarned, logId } = await logCravingSession(user.uid, {
        cravingType,
        customLabel: cravingType === 'other' ? customLabel : undefined,
        intensity,
        outcome,
        secondsHeld,
        plannedSeconds: plannedSecondsRef.current,
        startedAt: startedAtRef.current,
        exitIntensity: exitIntensity ?? undefined,
        extensions: extensionsRef.current || undefined,
        note,
        mission: usedMissionRef.current ?? undefined,
      });
      triggerRewardHaptic().catch(() => {});
      setSaveResult({ points: pointsEarned, logId });
      setPhase('complete');
    } catch (err) {
      console.warn('Failed to save craving session:', err);
      showAlert(
        t('craving.ride.saveFailed.title', "Couldn't save that"),
        t('craving.ride.saveFailed.message', 'Check your connection and try again.')
      );
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
          <Copy id="craving.ride.setup.kicker" style={styles.setupKicker}>You noticed something. Good.</Copy>
          <Copy id="craving.ride.setup.title" style={styles.setupTitle}>What’s pulling at you right now?</Copy>
          <Copy id="craving.ride.setup.sub" style={styles.setupSub}>
            Naming it is already the first step. The urge will peak, then pass.
          </Copy>

          <View style={styles.typeGrid}>
            {CRAVING_TYPES.map((ct) => {
              const selected = ct.id === cravingType;
              return (
                <TouchableOpacity
                  key={ct.id}
                  style={[styles.typeTile, selected && styles.typeTileSelected]}
                  onPress={() => setCravingType(ct.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{ct.emoji}</Text>
                  <Copy id={`craving.type.${ct.id}.label`} style={styles.typeLabel}>{ct.label}</Copy>
                  <Copy id={`craving.type.${ct.id}.desc`} style={styles.typeDesc}>{ct.description}</Copy>
                </TouchableOpacity>
              );
            })}
          </View>

          {cravingType === 'other' && (
            <View style={styles.customLabelCard}>
              <Copy id="craving.ride.setup.callIt" style={styles.intensityTitle}>What would you call it?</Copy>
              <TextInput
                style={styles.customLabelInput}
                placeholder={t('craving.ride.setup.callItPlaceholder', 'e.g. chocolate, checking email, nail biting…')}
                placeholderTextColor={Colors.gray}
                value={customLabel}
                onChangeText={setCustomLabel}
                maxLength={40}
                returnKeyType="done"
              />
            </View>
          )}

          <View style={styles.intensityCard}>
            <Copy id="craving.ride.setup.strength" style={styles.intensityTitle}>How strong is it right now?</Copy>
            <Copy id="craving.ride.setup.strengthSub" style={styles.intensitySub}>Stronger waves get a longer timer</Copy>
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
              <Copy id="craving.ride.setup.mild" style={styles.dotLabelText}>Mild</Copy>
              <Copy id="craving.ride.setup.overwhelming" style={styles.dotLabelText}>Overwhelming</Copy>
            </View>
          </View>

          {patterns && (
            <View style={styles.patternsCard}>
              <Copy id="craving.ride.setup.patternsTitle" style={styles.patternsTitle}>Your patterns so far</Copy>
              <Copy
                id="craving.ride.setup.patternsText"
                style={styles.patternsText}
                vars={{
                  total: patterns.total,
                  passed: patterns.passed,
                  pct: Math.round(patterns.crushRate * 100),
                  peak: patterns.peakWindow
                    ? t('craving.ride.setup.patternsPeak', ' · most often {when}', { when: patterns.peakWindow })
                    : '',
                }}
              >
                {'{total} logged · {passed} ridden out ({pct}%){peak}'}
              </Copy>
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
            <Copy id="craving.ride.setup.start" style={styles.startButtonText} vars={{ minutes }}>
              {'Start the {minutes}-min ride'}
            </Copy>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
          <Copy id="craving.ride.setup.hint" style={styles.startHint}>You don’t have to fight it — just outlast it</Copy>
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
            <Copy id="craving.ride.away.title" style={styles.awayTitle}>Phone down — we’ve got the timer</Copy>
            <Text style={styles.awayDigits}>{formatClock(secondsLeft)}</Text>
            <Copy id="craving.ride.away.sub" style={styles.awaySub}>
              {'A ping will land when the wave should have passed.\nGo do the mission.'}
            </Copy>
            <TouchableOpacity style={styles.imBackButton} onPress={handleImBack}>
              <Copy id="craving.ride.away.back" style={styles.imBackText}>I’m back</Copy>
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
            <Copy
              id="craving.ride.wb.title"
              style={styles.wbTitle}
            >
              Welcome back.
            </Copy>
            <Copy
              id="craving.ride.wb.sub"
              style={styles.wbSub}
              vars={{
                mission: missionCategory
                  ? t('craving.ride.wb.subMission', ' The mission asked what you noticed…')
                  : '',
              }}
            >
              {'You took the ride out into the world — that’s the strongest version of this.{mission}'}
            </Copy>

            <View style={styles.wbStatsCard}>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>{formatClock(awaySeconds)}</Text>
                <Copy id="craving.ride.wb.timeAway" style={styles.wbStatLabel}>Time away</Copy>
              </View>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>
                  {missionCategory ? `${missionCategory.emoji} ${missionCategory.label}` : '—'}
                </Text>
                <Copy id="craving.ride.wb.mission" style={styles.wbStatLabel}>Mission</Copy>
              </View>
              <View style={styles.wbStat}>
                <Text style={styles.wbStatValue}>{intensity}/10</Text>
                <Copy id="craving.ride.wb.startedAt" style={styles.wbStatLabel}>Started at</Copy>
              </View>
            </View>

            <Copy id="craving.ride.wb.question" style={styles.wbQuestion}>Where did the craving land?</Copy>
            <Copy id="craving.ride.wb.questionSub" style={styles.wbQuestionSub}>Honest answer — both feed your patterns.</Copy>

            <View style={styles.wbFooter}>
              <TouchableOpacity
                style={styles.passedButton}
                onPress={() => handleOutcome('passed')}
                activeOpacity={0.85}
              >
                <Copy id="craving.ride.wb.passed" style={styles.passedButtonText}>It passed — log the ride</Copy>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stillRidingButton}
                onPress={() => setActivity('menu')}
              >
                <Copy id="craving.ride.wb.still" style={styles.stillRidingText}>Still riding — keep the timer going</Copy>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOutcome('gave_in')}>
                <Copy id="craving.ride.wb.gaveIn" style={styles.wbGaveInText}>I gave in while I was away — log it anyway</Copy>
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
          <Text style={styles.stripLabel}>
            {timerDone ? t('craving.ride.strip.done', 'time’s up') : t('craving.ride.strip.left', 'left')}
          </Text>
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
                  ? t('craving.ride.wave.done', 'The wave has run its course')
                  : elapsedFraction > 0.3
                    ? t('craving.ride.wave.past', 'Past the peak — it only fades from here')
                    : t('craving.ride.wave.building', 'Building toward the peak — hold on')}
              </Text>

              <View style={styles.contentCard}>
                <Text style={styles.contentKind}>{card.title.toUpperCase()}</Text>
                <Text style={styles.contentText}>{card.text}</Text>
              </View>
            </View>
          )}

          {activity === 'breathe' && <BreatheActivity />}
          {activity === 'learn' && <LearnActivity />}
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
                {timerDone
                  ? t('craving.ride.footer.passedDone', 'It passed — log it')
                  : t('craving.ride.footer.passedEarly', 'It already passed')}
              </Text>
            </TouchableOpacity>
            {timerDone && (
              <TouchableOpacity style={styles.extendButton} onPress={handleExtend}>
                <Copy id="craving.ride.footer.extend" style={styles.extendButtonText}>Still going — add 5 minutes</Copy>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.gaveInButton} onPress={() => handleOutcome('gave_in')}>
              <Copy id="craving.ride.footer.gaveIn" style={styles.gaveInButtonText}>I gave in — log it anyway</Copy>
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
              <Copy id="craving.ride.footer.timesUp" style={styles.timesUpText}>
                Time’s up — head back when you’re ready →
              </Copy>
            </TouchableOpacity>
          )
        )}
      </SafeAreaView>
    );
  }

  // --- Complete phase (post-log) -------------------------------------------

  if (phase === 'complete' && saveResult) {
    const heldMins = Math.floor(secondsHeld / 60);
    const held = heldMins >= 1 ? `${heldMins} min` : `${secondsHeld} sec`;

    if (outcome === 'passed') {
      // The felt win comes before the numbers.
      if (!savorDone) {
        return <SavorPause onContinue={() => setSavorDone(true)} />;
      }

      const typeIntensities = [
        ...allLogs
          .filter((l) => l.craving_type === cravingType)
          .sort((a, b) => a.started_at.localeCompare(b.started_at))
          .map((l) => l.intensity),
        intensity,
      ];

      return (
        <SafeAreaView style={styles.setupContainer}>
          <ScrollView contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.outcomeEmoji}>⚡</Text>
            <Copy id="craving.ride.complete.points" style={styles.completePoints} vars={{ n: saveResult.points }}>
              {'+{n} XP'}
            </Copy>
            <Text style={styles.completeSub}>
              {exitIntensity !== null
                ? t('craving.ride.complete.waveDrop', 'Wave: {from}/10 → {to}/10 · {held} ridden', {
                    from: intensity,
                    to: exitIntensity,
                    held,
                  })
                : t('craving.ride.complete.banked', '{held} ridden, banked, and on the record.', { held })}
            </Text>

            {typeIntensities.length >= 4 && (
              <View style={styles.completeChartWrap}>
                <WaveTrendChart
                  intensities={typeIntensities}
                  typeLabel={badgeLabel.toLowerCase()}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.startButton, styles.completeDone]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Copy id="craving.ride.complete.done" style={styles.startButtonText}>Done</Copy>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Gave in: compassion → held-time progress → one-tap if-then plan → the point, plainly.
    const priorGaveIns = allLogs.filter((l) => l.outcome === 'gave_in');
    const avgHeld =
      priorGaveIns.length >= 2
        ? Math.round(
            priorGaveIns.reduce((sum, l) => sum + l.seconds_held, 0) / priorGaveIns.length
          )
        : null;
    const avgLabel =
      avgHeld !== null
        ? avgHeld >= 60
          ? `${Math.floor(avgHeld / 60)} min`
          : `${avgHeld} sec`
        : null;

    const planLabel =
      cravingType === 'other' && !customLabel.trim() ? 'urge' : badgeLabel.toLowerCase();
    const window = startedAtRef.current
      ? hourWindowLabel(startedAtRef.current)
      : t('craving.ride.plan.nextTime', 'next time');
    const planOptions = [
      t('craving.ride.plan.a', "When the {label} pull hits {when}, I'll start a ride before acting on it", {
        label: planLabel,
        when: window,
      }),
      t('craving.ride.plan.b', "At the first sign of the wave, I'll do one slow breath cycle before deciding anything"),
      t('craving.ride.plan.c', "I'll make the first step harder — put distance between me and the {label} before it hits", {
        label: planLabel,
      }),
    ];

    return (
      <SafeAreaView style={styles.setupContainer}>
        <ScrollView contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.outcomeEmoji}>🌊</Text>
          <Copy id="craving.ride.gaveIn.title" style={styles.outcomeTitle}>The wave won this one.</Copy>
          <Copy id="craving.ride.gaveIn.body" style={styles.outcomeBody}>
            Waves win sometimes — that’s what makes them waves.
          </Copy>

          <View style={styles.heldCard}>
            <Text style={styles.heldValue}>{held}</Text>
            <Copy
              id="craving.ride.gaveIn.held"
              style={styles.heldLabel}
              vars={{
                avg: avgLabel
                  ? t('craving.ride.gaveIn.heldAvg', ' — your average before this was {avg}', { avg: avgLabel })
                  : '',
              }}
            >
              {'held before it broke through{avg}. Every second of holding is extinction training.'}
            </Copy>
          </View>

          <Copy id="craving.ride.gaveIn.planTitle" style={styles.planTitle}>Load a plan for the next one</Copy>
          <Copy id="craving.ride.gaveIn.planSub" style={styles.planSub}>
            One tap — a concrete if-then now roughly doubles follow-through next time.
          </Copy>
          {planOptions.map((plan) => {
            const selected = chosenPlan === plan;
            return (
              <TouchableOpacity
                key={plan}
                style={[styles.planChip, selected && styles.planChipSelected]}
                onPress={() => {
                  if (chosenPlan) return;
                  setChosenPlan(plan);
                  if (user) {
                    saveCravingPlan(user.uid, saveResult.logId, plan).catch((err) =>
                      console.warn('Failed to save craving plan:', err)
                    );
                  }
                }}
                disabled={!!chosenPlan && !selected}
                activeOpacity={0.7}
              >
                <Text style={[styles.planChipText, selected && styles.planChipTextSelected]}>
                  {plan}
                </Text>
                {selected && (
                  <Copy id="craving.ride.gaveIn.planSaved" style={styles.planSaved}>Saved for next time ✓</Copy>
                )}
              </TouchableOpacity>
            );
          })}

          <Copy id="craving.ride.gaveIn.xp" style={styles.honestyXp} vars={{ n: saveResult.points }}>
            {'+{n} XP added'}
          </Copy>

          <TouchableOpacity
            style={[styles.startButton, styles.completeDone]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Copy id="craving.ride.gaveIn.done" style={styles.startButtonText}>Done</Copy>
          </TouchableOpacity>
        </ScrollView>
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
        <Copy id={`craving.outcome.${outcome}.headline`} style={styles.outcomeTitle}>{copy.headline}</Copy>
        <Copy id={`craving.outcome.${outcome}.body`} style={styles.outcomeBody}>{copy.body}</Copy>

        <View style={styles.heldCard}>
          <Text style={styles.heldValue}>{heldLabel}</Text>
          <Text style={styles.heldLabel}>
            {outcome === 'passed'
              ? t('craving.ride.reflect.heldPassed', 'riding the wave')
              : t('craving.ride.reflect.heldGaveIn', 'held before it broke through — that time counts')}
          </Text>
        </View>

        {outcome === 'passed' && (
          <View style={styles.intensityCard}>
            <Copy id="craving.ride.reflect.where" style={styles.intensityTitle}>Where’s the wave now?</Copy>
            <Copy id="craving.ride.reflect.whereSub" style={styles.intensitySub} vars={{ n: intensity }}>
              {'You started at {n}/10 — tap where it landed'}
            </Copy>
            <View style={styles.dotsRow}>
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.dotTouch}
                  onPress={() => setExitIntensity(n)}
                  hitSlop={{ top: 8, bottom: 8 }}
                >
                  <View
                    style={[
                      styles.dot,
                      exitIntensity !== null &&
                        n <= exitIntensity &&
                        (n >= 8 ? styles.dotHigh : styles.dotFilled),
                      exitIntensity === 0 && n === 0 && styles.dotFilled,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dotLabels}>
              <Copy id="craving.ride.reflect.gone" style={styles.dotLabelText}>Gone</Copy>
              <Copy id="craving.ride.reflect.stillStrong" style={styles.dotLabelText}>Still strong</Copy>
            </View>
          </View>
        )}

        <TextInput
          style={styles.noteInput}
          placeholder={
            usedMissionRef.current
              ? t('craving.ride.reflect.noteMission', 'What did you notice out there? (optional)')
              : t('craving.ride.reflect.note', 'What was happening when it hit? (optional)')
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
            <Copy id="craving.ride.reflect.log" style={styles.startButtonText}>Log it</Copy>
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
  extendButton: {
    borderWidth: 1,
    borderColor: 'rgba(33,113,128,0.7)',
    backgroundColor: 'rgba(33,113,128,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
  },
  extendButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#7AB8C0',
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

  // Complete (post-log)
  completeContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  completePoints: {
    fontFamily: Fonts.primaryBold,
    fontSize: 44,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  completeSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  completeChartWrap: { alignSelf: 'stretch', marginTop: Spacing.lg },
  completeDone: { alignSelf: 'stretch', marginTop: Spacing.xl },
  planTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  planSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: Spacing.md,
    lineHeight: 17,
  },
  planChip: {
    alignSelf: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: Spacing.sm,
  },
  planChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F8F9',
  },
  planChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  planChipTextSelected: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  planSaved: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  honestyXp: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
  },
});

const savorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  instruction: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.primary,
    opacity: 0.9,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.xl,
  },
  science: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  continueButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
  },
  continueText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  continuePlaceholder: {
    marginTop: Spacing.xl,
    height: 41,
  },
});

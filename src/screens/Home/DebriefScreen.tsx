import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { FadeRise } from '../../components/common/FadeRise';
import { useAuth } from '../../context/AuthContext';
import { markDebriefSeen } from '../../services/users';

// ============================================================================
// THE DEBRIEF — the intellectual half of onboarding, delivered once, right
// after the user's first practice reflection (or via the home fallback card).
// Tone: onboarding argued with a skeptic; this validates someone who acted.
// Copy source: docs/onboarding-split-flow.md (Part 2)
// ============================================================================

interface Props {
  navigation: { goBack: () => void };
}

type StepKey = 'thread' | 'trap' | 'research';

interface StepDef {
  key: StepKey;
  cta: string;
  gated?: boolean;
  hint?: string;
}

const STEPS: StepDef[] = [
  { key: 'thread', cta: 'What am I up against? →' },
  { key: 'trap', cta: 'Does this actually work? →', gated: true, hint: 'Drag the slider to Now' },
  { key: 'research', cta: 'Back to the app →' },
];

// ============================================================================
// DEBRIEF 1 — WHAT YOU JUST DID: the science and the Stoics as two nodes on
// one thread, revealed in sequence
// ============================================================================

const ThreadScreen: React.FC = () => (
  <View style={styles.stageContent}>
    <Text style={styles.eyebrow}>YOUR FIRST OVERRIDE</Text>
    <FadeRise>
      <Text style={styles.screenHeadline}>That pull to quit you just felt? That was the whole method.</Text>
    </FadeRise>

    <View style={styles.threadContainer}>
      <View style={styles.threadLine} />

      <FadeRise delay={450}>
        <View style={styles.threadItem}>
          <View style={[styles.threadNode, { backgroundColor: Colors.primary }]}>
            <Ionicons name="flash" size={16} color={Colors.white} />
          </View>
          <View style={styles.threadCard}>
            <Text style={styles.threadCardLabel}>WHAT YOU JUST DID</Text>
            <Text style={styles.threadCardBody}>
              Feeling the pull to quit — and not quitting — is the entire method. The same dopamine driving
              that scroll also powers your <Text style={styles.threadBold}>prefrontal cortex</Text>: the part
              of your brain responsible for decisions, focus, and self-control.{' '}
              <Text style={styles.threadBold}>Every rep like the one you just finished trains it.</Text>
            </Text>
          </View>
        </View>
      </FadeRise>

      <FadeRise delay={1100}>
        <View style={styles.threadItem}>
          <View style={[styles.threadNode, { backgroundColor: Colors.secondary }]}>
            <Ionicons name="hourglass" size={16} color={Colors.white} />
          </View>
          <View style={styles.threadCard}>
            <Text style={[styles.threadCardLabel, { color: Colors.secondary }]}>OVER 2,000 YEARS AGO</Text>
            <Text style={styles.threadCardBody}>
              It's not a new idea. The Stoics practiced{' '}
              <Text style={styles.threadBold}>voluntary hardship</Text> on purpose — going without, sitting
              with discomfort, choosing the hard thing — so they'd never be at the mercy of either. Same
              principle. Distress tolerance builds.{' '}
              <Text style={styles.threadBold}>Over time, your baseline shifts.</Text>
            </Text>
          </View>
        </View>
      </FadeRise>
    </View>
  </View>
);

// ============================================================================
// DEBRIEF 2 — WHAT YOU'RE TRAINING AGAINST: the pleasure trap slider
// ============================================================================

const THEN_ROWS = [
  { emoji: '🏹', text: 'Food took hunting. Hours of effort for one reward.' },
  { emoji: '🔥', text: 'Connection took real presence, around a fire.' },
  { emoji: '⛰️', text: 'Pleasure was scarce — and earned.' },
];
const NOW_ROWS = [
  { emoji: '🛵', text: 'Food arrives in 20 minutes, engineered to crave.' },
  { emoji: '📱', text: '"Connection" is a like from someone you\'ve never met.' },
  { emoji: '♾️', text: 'Pleasure is abundant, effortless — and everywhere.' },
];

const THUMB = 30;
// How far (px) from the knob's center a touch may start and still grab it
const GRAB_RADIUS = 36;

const TrapScreen: React.FC<{ onUnlock: () => void; unlocked: boolean }> = ({ onUnlock, unlocked }) => {
  const [value, setValue] = useState(0); // 0 = then, 1 = now
  const [revealed, setRevealed] = useState(unlocked);
  const trackWidth = useRef(0);
  // Absolute window X of the track's left edge — gesture coords are absolute,
  // and locationX is unreliable across the thumb/track children.
  const trackLeft = useRef(0);
  const trackRef = useRef<View>(null);
  const grabOffset = useRef(0);

  // Latest state, readable from the once-created PanResponder without going stale
  const valueRef = useRef(0);
  valueRef.current = value;
  const revealedRef = useRef(unlocked);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  const measureTrack = () => {
    trackRef.current?.measureInWindow((x) => {
      trackLeft.current = x;
    });
  };

  const applyValue = (v: number) => {
    setValue(v);
    if (v > 0.92 && !revealedRef.current) {
      revealedRef.current = true;
      setRevealed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUnlockRef.current();
    }
  };
  const applyValueRef = useRef(applyValue);
  applyValueRef.current = applyValue;

  // Grab-only: the gesture is claimed only when the touch starts on the knob —
  // tapping elsewhere on the track does nothing (no jump-to-finger).
  // NOTE: gestureState.x0 is only populated on grant, so the should-set
  // callbacks must read the touch position from the event itself.
  const touchIsOnThumb = (pageX: number) =>
    Math.abs(pageX - trackLeft.current - valueRef.current * trackWidth.current) <= GRAB_RADIUS;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => touchIsOnThumb(evt.nativeEvent.pageX),
      // Once grabbed, hold the gesture so the parent ScrollView can't steal it
      onMoveShouldSetPanResponderCapture: (evt) => touchIsOnThumb(evt.nativeEvent.pageX),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        // Drag relative to where the finger landed on the knob — no jump
        grabOffset.current =
          evt.nativeEvent.pageX - trackLeft.current - valueRef.current * trackWidth.current;
        measureTrack();
      },
      onPanResponderMove: (evt) => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const x = evt.nativeEvent.pageX - trackLeft.current - grabOffset.current;
        applyValueRef.current(Math.max(0, Math.min(1, x / w)));
      },
    })
  ).current;

  return (
    <View style={styles.stageContent}>
      <Text style={styles.eyebrow}>WHAT YOU'RE TRAINING AGAINST</Text>
      <Text style={styles.screenHeadline}>Your reward system was built for a different world.</Text>

      <View style={styles.worldsBox}>
        <View style={[styles.world, styles.worldThen, { opacity: 1 - value }]}>
          <Text style={[styles.worldEra, { color: Colors.primary }]}>≈ 50,000 YEARS AGO</Text>
          {THEN_ROWS.map((r) => (
            <View key={r.text} style={styles.worldRow}>
              <Text style={styles.worldEmoji}>{r.emoji}</Text>
              <Text style={[styles.worldText, { color: '#17525d' }]}>{r.text}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.world, styles.worldNow, { opacity: value }]} pointerEvents="none">
          <Text style={[styles.worldEra, { color: '#FF8B4D' }]}>TODAY</Text>
          {NOW_ROWS.map((r) => (
            <View key={r.text} style={styles.worldRow}>
              <Text style={styles.worldEmoji}>{r.emoji}</Text>
              <Text style={[styles.worldText, { color: '#EEEEEE' }]}>{r.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        ref={trackRef}
        style={styles.sliderTouchArea}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
          measureTrack();
        }}
        {...pan.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
        </View>
        <View
          style={[
            styles.sliderThumb,
            { left: Math.max(0, value * (trackWidth.current || 1) - THUMB / 2) },
          ]}
          pointerEvents="none"
        />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabelText}>THEN</Text>
        <Text style={styles.sliderLabelText}>NOW</Text>
      </View>
      {!revealed && <Text style={styles.dragHint}>Drag the slider forward in time →</Text>}

      {revealed && (
        <FadeRise>
          <Text style={styles.trapName}>Researchers call this the pleasure trap.</Text>
          <Text style={styles.trapBody}>
            A world of abundant, effortless, engineered pleasure that your reward system was never built to
            handle. This isn't laziness. It's not a character flaw. Your brain adapted perfectly to the
            environment it evolved in — it's just not the one you're living in now.
          </Text>
        </FadeRise>
      )}
    </View>
  );
};

// ============================================================================
// DEBRIEF 3 — THE RECEIPTS: research stats with a live count-up
// ============================================================================

const CountUpStat: React.FC<{ to: number }> = ({ to }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setV((prev) => {
        const next = prev + 10;
        if (next >= to) {
          clearInterval(id);
          return to;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <Text style={[styles.statBig, { color: Colors.secondary }]}>+{v}%</Text>;
};

const ResearchScreen: React.FC = () => (
  <View style={styles.stageContent}>
    <Text style={styles.eyebrow}>THE RESEARCH</Text>
    <Text style={styles.screenHeadline}>What you just did, according to the science.</Text>

    <FadeRise delay={300}>
      <View style={styles.statCard}>
        <View style={styles.statBigWrap}>
          <CountUpStat to={250} />
        </View>
        <Text style={styles.statDesc}>
          <Text style={styles.statDescBold}>Plasma dopamine after cold water immersion</Text> in controlled
          studies — a real, sustained increase, not a spike-and-crash.
        </Text>
      </View>
    </FadeRise>
    <FadeRise delay={700}>
      <View style={styles.statCard}>
        <View style={styles.statBigWrap}>
          <Text style={styles.statBig}>
            2<Text style={styles.statBigSmall}> paths</Text>
          </Text>
        </View>
        <Text style={styles.statDesc}>
          <Text style={styles.statDescBold}>Meditation and cold exposure work through different pathways</Text>{' '}
          — but both are linked to better regulation between the brain's impulse-driven and decision-making
          systems.
        </Text>
      </View>
    </FadeRise>
    <FadeRise delay={1100}>
      <View style={styles.statCard}>
        <View style={styles.statBigWrap}>
          <Text style={[styles.statBig, styles.statBigStacked]}>train-{'\n'}able</Text>
        </View>
        <Text style={styles.statDesc}>
          <Text style={styles.statDescBold}>Regular meditators show differences in brain connectivity</Text>{' '}
          between regions tied to emotional reactivity and executive control — patterns that appear
          trainable, not fixed.
        </Text>
      </View>
    </FadeRise>
    <FadeRise delay={1500}>
      <View style={styles.statCard}>
        <View style={styles.statBigWrap}>
          <Text style={[styles.statBig, styles.statBigStacked, { color: Colors.secondary }]}>
            weeks,{'\n'}not years
          </Text>
        </View>
        <Text style={styles.statDesc}>
          <Text style={styles.statDescBold}>Many people who stick with practices like these</Text> report
          improvements in mood stability, focus, and motivation within a few weeks.
        </Text>
      </View>
    </FadeRise>

    <FadeRise delay={1900}>
      <Text style={styles.closingLine}>
        One down. The research says the ones who keep going feel it in weeks.{' '}
        <Text style={styles.closingBold}>Same time tomorrow.</Text>
      </Text>
    </FadeRise>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DebriefScreen: React.FC<Props> = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const ctaLocked = !!step.gated && !unlocked[step.key];

  const goToIndex = (i: number) => {
    setStepIndex(Math.max(0, Math.min(i, STEPS.length - 1)));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      if (user) {
        await markDebriefSeen(user.uid);
        await refreshProfile();
      }
    } catch (err) {
      // Best-effort — worst case the home card reappears and clears next time
      console.warn('Failed to mark debrief seen:', err);
    }
    navigation.goBack();
  };

  const renderStep = () => {
    switch (step.key) {
      case 'thread':
        return <ThreadScreen />;
      case 'trap':
        return <TrapScreen onUnlock={() => setUnlocked((p) => ({ ...p, trap: true }))} unlocked={!!unlocked.trap} />;
      case 'research':
        return <ResearchScreen />;
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.progressRow, { paddingTop: insets.top + Spacing.sm }]}>
        {STEPS.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.progressSeg,
              i < stepIndex && styles.progressSegDone,
              i === stepIndex && styles.progressSegActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeRise key={step.key} duration={300} distance={0} horizontalDistance={56} style={{ flex: 1 }}>
          {renderStep()}
        </FadeRise>
      </ScrollView>

      <View style={[styles.navWrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}>
        {ctaLocked && !!step.hint && <Text style={styles.ctaHint}>{step.hint}</Text>}
        <View style={styles.navBar}>
          {stepIndex > 0 ? (
            <TouchableOpacity onPress={() => goToIndex(stepIndex - 1)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Button
            title={step.cta}
            onPress={isLast ? handleFinish : () => goToIndex(stepIndex + 1)}
            disabled={ctaLocked || finishing}
            loading={isLast && finishing}
            style={styles.ctaButton}
          />
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
  stageContent: { flex: 1 },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressSegDone: { backgroundColor: Colors.primary },
  progressSegActive: { backgroundColor: Colors.secondary },

  // Shared type
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 2.5,
    marginBottom: Spacing.md,
  },
  screenHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 36,
    marginBottom: Spacing.md,
  },

  // Bottom nav
  navWrap: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  ctaButton: { minWidth: 180 },
  ctaHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  // Debrief 1: thread
  threadContainer: { marginTop: Spacing.md, position: 'relative' },
  threadLine: {
    position: 'absolute',
    left: 15,
    top: 20,
    bottom: 30,
    width: 2,
    backgroundColor: Colors.border,
  },
  threadItem: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  threadNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  threadCard: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  threadCardLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  threadCardBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 21,
  },
  threadBold: { fontFamily: Fonts.secondaryBold, color: Colors.dark },

  // Debrief 2: pleasure trap
  worldsBox: {
    height: 230,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  world: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
  },
  worldThen: { backgroundColor: '#DFEDEF' },
  worldNow: { backgroundColor: Colors.dark },
  worldEra: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  worldRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'flex-start' },
  worldEmoji: { fontSize: 20 },
  worldText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, lineHeight: 20 },
  sliderTouchArea: {
    marginTop: Spacing.lg,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  sliderFill: { height: 6, backgroundColor: Colors.secondary },
  sliderThumb: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.dark,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderLabelText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  dragHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  trapName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.secondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  trapBody: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 21 },

  // Debrief 3: research
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statBigWrap: { width: 100 },
  statBig: {
    fontFamily: Fonts.primaryBold,
    fontSize: 26,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  statBigSmall: { fontSize: FontSizes.md },
  statBigStacked: { fontSize: FontSizes.lg, lineHeight: 22 },
  statDesc: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
  },
  statDescBold: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  closingLine: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginTop: Spacing.md,
  },
  closingBold: { fontFamily: Fonts.secondaryBold, color: Colors.secondary },
});

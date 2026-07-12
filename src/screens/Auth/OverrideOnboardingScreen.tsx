import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { FadeRise } from '../../components/common/FadeRise';
import { HoldToCommitButton } from '../../components/common/HoldToCommitButton';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingComplete, setStartingPractice } from '../../services/users';
import { createHabit, getActiveHabits, ensureCuratedPractices } from '../../services/practices';
import { getAllPractices, DEFAULT_PRACTICE_COLOR } from '../../data/practices';

const { width } = Dimensions.get('window');

// ============================================================================
// FLOW — the emotional half of the story only: get hooked → feel the mechanism
// in your thumb → feel it in your body → here's the answer → commit → go.
// The intellectual payoff (recovery science, pleasure trap, research) moved to
// the post-first-practice Debrief (see DebriefScreen).
// Copy source: docs/onboarding-split-flow.md
// ============================================================================

type StepKey = 'hook' | 'dopamine' | 'sit' | 'override' | 'picker' | 'reveal';

interface StepDef {
  key: StepKey;
  cta: string;
  gated?: boolean;
  hint?: string;
}

const STEPS: StepDef[] = [
  { key: 'hook', cta: 'Learn more →' },
  { key: 'dopamine', cta: 'Feel it for yourself →', gated: true, hint: 'Keep tapping…' },
  { key: 'sit', cta: "There's a way out →", gated: true },
  { key: 'override', cta: 'Pick your starting point →' },
  { key: 'picker', cta: 'This is my starting point →', gated: true, hint: 'Choose a practice' },
  { key: 'reveal', cta: "Let's go →" },
];

// ============================================================================
// SCREEN 1 — HOOK: fake notifications interrupt the headline as it's read
// ============================================================================

interface FakeNotif {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
}

const FAKE_NOTIFS: Omit<FakeNotif, 'id'>[] = [
  { icon: 'camera', color: '#E1306C', title: 'socialgram', body: 'jess_k and 14 others liked your post' },
  { icon: 'play', color: '#5865F2', title: 'streamly', body: 'New episode just dropped. Watch now?' },
  { icon: 'fast-food', color: '#FF5B02', title: 'snackdash', body: '🔥 30% off your usual order — 1 hour only' },
  { icon: 'chatbubbles', color: '#25A244', title: 'chatter', body: 'You have 3 unread messages' },
  { icon: 'game-controller', color: '#9B59B6', title: 'tapquest', body: 'Your streak expires in 2 hours!' },
];

const NotifBanner: React.FC<{ notif: FakeNotif; onGone: (id: number) => void }> = ({ notif, onGone }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const exit = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onGone(notif.id));
    }, 2400);
    return () => clearTimeout(exit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.notifBanner,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
        },
      ]}
    >
      <View style={[styles.notifIcon, { backgroundColor: notif.color }]}>
        <Ionicons name={notif.icon} size={18} color={Colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifBody}>{notif.body}</Text>
      </View>
    </Animated.View>
  );
};

const HookScreen: React.FC = () => {
  const [notifs, setNotifs] = useState<FakeNotif[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timers = FAKE_NOTIFS.map((n, i) =>
      setTimeout(() => {
        setNotifs((prev) => [...prev, { ...n, id: i }]);
        setCount((c) => c + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 1400 + i * 1600)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const removeNotif = (id: number) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  return (
    <View style={styles.hookContainer}>
      <View style={styles.notifZone} pointerEvents="none">
        {notifs.map((n) => (
          <NotifBanner key={n.id} notif={n} onGone={removeNotif} />
        ))}
      </View>
      <FadeRise>
        <Text style={styles.hookHeadline}>
          Every app, every product, every bite of hyperpalatable food is engineered to hook you.
        </Text>
      </FadeRise>
      <FadeRise delay={600}>
        <Text style={styles.hookSub}>Not to help you. Not to make you better. To keep you coming back for more.</Text>
      </FadeRise>
      <FadeRise delay={1200}>
        <Text style={[styles.hookSub, { marginTop: Spacing.md }]}>
          This app is the opposite. It's designed to help you{' '}
          <Text style={styles.hookSubBold}>take back control of your mind.</Text>
        </Text>
      </FadeRise>
      <FadeRise delay={1800}>
        <Text style={styles.hookCounter}>
          Notifications that interrupted this sentence:{' '}
          <Text style={styles.hookCounterNum}>{count}</Text>
        </Text>
      </FadeRise>
    </View>
  );
};

// ============================================================================
// SCREEN 2 — DOPAMINE: tap to "scroll" — likes burst on screen while the
// graph's spikes shrink and the baseline sinks. 4 taps unlocks.
// ============================================================================

const GRAPH_LOGICAL_W = 330;
const GRAPH_LOGICAL_H = 150;
const GRAPH_BASELINE_Y = 55;
const TAPS_NEEDED = 4;
const TAPS_MAX = TAPS_NEEDED + 2;

const BURST_EMOJI = ['❤️', '👍', '✨', '🔥', '😍', '💬'];
const REWARDS = ['+18 likes ❤️', 'New follower! 🎉', '+7 comments 💬', 'Streak +1 🔥', '+42 views ✨'];

interface Particle {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
}

const BurstParticle: React.FC<{ particle: Particle; onDone: (id: number) => void }> = ({ particle, onDone }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 950,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDone(particle.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.Text
      style={[
        styles.burstParticle,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.6, 0] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dy] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.35] }) },
          ],
        },
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
};

const RewardPill: React.FC<{ text: string; onDone: () => void }> = ({ text, onDone }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={[
        styles.rewardPill,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, -38] }) },
          ],
        },
      ]}
    >
      <Text style={styles.rewardPillText}>{text}</Text>
    </Animated.View>
  );
};

/** Polyline drawn as rotated segments — no SVG dependency needed. */
const GraphLine: React.FC<{ pts: [number, number][]; w: number; h: number }> = ({ pts, w, h }) => {
  const sx = w / GRAPH_LOGICAL_W;
  const sy = h / GRAPH_LOGICAL_H;
  const scaled = pts.map(([x, y]) => [x * sx, y * sy]);
  const segments = scaled.slice(1).map((p2, i) => {
    const p1 = scaled[i];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    return {
      key: i,
      left: (p1[0] + p2[0]) / 2 - len / 2,
      top: (p1[1] + p2[1]) / 2 - 1.25,
      len,
      angle,
    };
  });
  const last = scaled[scaled.length - 1];
  return (
    <>
      {segments.map((s) => (
        <View
          key={s.key}
          style={[
            styles.graphSegment,
            { left: s.left, top: s.top, width: s.len, transform: [{ rotate: `${s.angle}rad` }] },
          ]}
        />
      ))}
      <View style={[styles.graphDot, { left: last[0] - 4, top: last[1] - 4 }]} />
    </>
  );
};

const DopamineScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [taps, setTaps] = useState(0);
  const [pts, setPts] = useState<[number, number][]>([[0, GRAPH_BASELINE_Y]]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pills, setPills] = useState<{ id: number; text: string }[]>([]);
  const [graphSize, setGraphSize] = useState({ w: 0, h: 0 });
  const particleId = useRef(0);
  const stateRef = useRef({ x: 0, base: GRAPH_BASELINE_Y });

  const onGraphLayout = (e: LayoutChangeEvent) =>
    setGraphSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const handleTap = () => {
    if (taps >= TAPS_MAX) return;
    const tapNum = taps + 1;
    setTaps(tapNum);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Celebration on screen…
    const burst: Particle[] = Array.from({ length: 7 }, () => ({
      id: particleId.current++,
      emoji: BURST_EMOJI[Math.floor(Math.random() * BURST_EMOJI.length)],
      dx: Math.random() * 130 - 65,
      dy: -45 - Math.random() * 75,
    }));
    setParticles((prev) => [...prev, ...burst]);
    setPills((prev) => [...prev, { id: particleId.current++, text: REWARDS[(tapNum - 1) % REWARDS.length] }]);

    // …while the chart sinks
    const s = stateRef.current;
    const spike = Math.max(10, 62 - tapNum * 13);
    s.base = Math.min(126, s.base + 15);
    const x1 = s.x + 26;
    const x2 = s.x + 52;
    setPts((prev) => [...prev, [x1, Math.max(8, s.base - spike)], [x2, s.base]]);
    s.x = x2;

    if (tapNum === TAPS_NEEDED) onUnlock();
  };

  const removeParticle = (id: number) => setParticles((prev) => prev.filter((p) => p.id !== id));
  const removePill = (id: number) => setPills((prev) => prev.filter((p) => p.id !== id));

  const stateLabel =
    taps === 0 ? 'baseline' : taps === 1 ? 'nice hit ✨' : taps === 2 ? 'smaller hit…' : taps === 3 ? 'barely anything' : 'flat.';
  const buttonLabel = taps === 0 ? 'TAP TO SCROLL' : taps < 3 ? 'AGAIN' : taps < TAPS_NEEDED ? 'ONE MORE' : "THAT'S THE POINT";

  return (
    <View style={styles.stageContent}>
      <Text style={styles.eyebrow}>THE MECHANISM</Text>
      <Text style={styles.screenHeadline}>Here's how it works.</Text>
      <Text style={styles.screenBody}>
        Your brain's drive system runs on dopamine. Every scroll delivers a hit — fast, easy, engineered. Try it:
      </Text>

      <View style={styles.graphCard}>
        <View style={styles.graphLabelsRow}>
          <Text style={styles.graphLabel}>YOUR DOPAMINE</Text>
          <Text style={styles.graphLabel}>{stateLabel}</Text>
        </View>
        <View style={styles.graphArea} onLayout={onGraphLayout}>
          {graphSize.w > 0 && (
            <>
              {/* dashed "how good things used to feel" reference line */}
              <View style={[styles.graphDashRow, { top: (GRAPH_BASELINE_Y / GRAPH_LOGICAL_H) * graphSize.h }]}>
                {Array.from({ length: 32 }, (_, i) => (
                  <View key={i} style={styles.graphDash} />
                ))}
              </View>
              <Text
                style={[
                  styles.graphRefLabel,
                  { top: (GRAPH_BASELINE_Y / GRAPH_LOGICAL_H) * graphSize.h - 16 },
                ]}
              >
                how good things used to feel
              </Text>
              <GraphLine pts={pts} w={graphSize.w} h={graphSize.h} />
            </>
          )}
        </View>
      </View>

      <View style={styles.scrollBtnWrap}>
        {particles.map((p) => (
          <BurstParticle key={p.id} particle={p} onDone={removeParticle} />
        ))}
        {pills.map((p) => (
          <RewardPill key={p.id} text={p.text} onDone={() => removePill(p.id)} />
        ))}
        <TouchableOpacity style={styles.scrollThumb} onPress={handleTap} activeOpacity={0.8}>
          <Text style={styles.scrollThumbEmoji}>👆</Text>
        </TouchableOpacity>
        <Text style={styles.scrollBtnLabel}>{buttonLabel}</Text>
      </View>

      {taps >= TAPS_NEEDED && (
        <FadeRise>
          <Text style={styles.flatMsg}>
            Feel that? Each hit lands a little flatter. Your brain{' '}
            <Text style={styles.flatMsgBold}>downregulates</Text> — fewer receptors, weaker response. This
            doesn't just make social media less fun, it rewires your brain and makes small tasks seem
            daunting.
          </Text>
        </FadeRise>
      )}
    </View>
  );
};

// ============================================================================
// SCREEN 3 — THE 60-SECOND MOMENT
// ============================================================================

const SIT_SECONDS = 60;

const SitScreen: React.FC<{
  done: boolean;
  onComplete: () => void;
  onSkipOnboarding: () => void;
}> = ({ done, onComplete, onSkipOnboarding }) => {
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SIT_SECONDS);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft]);

  if (running) {
    return (
      <View style={styles.sitOverlay}>
        <Text style={styles.sitOverlayWord}>BREATHE</Text>
        <Text style={styles.sitOverlayNum}>{secondsLeft}</Text>
        <TouchableOpacity onPress={() => { setRunning(false); onComplete(); }} style={styles.sitOverlaySkip}>
          <Text style={styles.sitSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.stageContent}>
        <Text style={styles.eyebrow}>WHAT YOU JUST FELT</Text>
        <FadeRise>
          <Text style={styles.sitPostBody}>
            That urge to grab your phone? That restlessness? That's a nervous system that's used to constant
            input. It's a sign that your brain has been primed for short term pleasure over long term
            rewards.
          </Text>
        </FadeRise>
        <FadeRise delay={500}>
          <Text style={styles.sitGoodNews}>Now here's the good news.</Text>
        </FadeRise>
      </View>
    );
  }

  return (
    <View style={styles.stageContent}>
      <Text style={styles.eyebrow}>FEEL IT FOR YOURSELF</Text>
      <Text style={styles.screenHeadline}>Don't take our word for it. Try this.</Text>
      <Text style={styles.screenBody}>
        Close your eyes. Don't check anything. Don't do anything. Just breathe for 60 seconds.
        {'\n\n'}Notice what happens.
      </Text>
      <Button title="Start 60 seconds" onPress={() => { setSecondsLeft(SIT_SECONDS); setRunning(true); }} variant="secondary" style={styles.sitStartButton} />
      {/* Skipping still shows the post-sit copy — the point lands either way */}
      <TouchableOpacity onPress={onComplete} style={styles.sitSkipButton}>
        <Text style={styles.sitSkipText}>Skip</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkipOnboarding} style={styles.skipOnboardingButton}>
        <Text style={styles.skipOnboardingText}>Just take me to the app</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// SCREEN 4 — THE OVERRIDE: dark, cinematic, pulsing core
// ============================================================================

const PulseRing: React.FC<{ delay: number }> = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const start = setTimeout(() => {
      loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(start);
      loop?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }],
        },
      ]}
    />
  );
};

const OverrideScreen: React.FC = () => {
  const core = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(core, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(core, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overrideContainer}>
      <View style={styles.pulseStage}>
        <PulseRing delay={0} />
        <PulseRing delay={1200} />
        <Animated.View
          style={[
            styles.pulseCore,
            { transform: [{ scale: core.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
          ]}
        />
      </View>
      <FadeRise delay={300}>
        <Text style={styles.overrideHeadline}>
          Practice <Text style={styles.overrideHeadlineOrange}>deliberate discomfort</Text>
        </Text>
      </FadeRise>
      <FadeRise delay={1100}>
        <Text style={styles.overrideBody}>
          The same brain that adapted to constant stimulation can adapt back. You train it by doing hard
          things — on purpose.
          {'\n\n'}We've selected 7 key practices designed to train you to{' '}
          <Text style={styles.overrideBodyBold}>override</Text> the moment your brain says stop. This is how
          you rebuild what overstimulation has eroded.
          {'\n\n'}You don't have to do all of them. We recommend a minimum of{' '}
          <Text style={styles.overrideBodyBold}>one per day</Text>. After each one, a quick reflection locks
          in what you noticed.
        </Text>
      </FadeRise>
    </View>
  );
};

// ============================================================================
// SCREEN 5 — PICK A PRACTICE
// ============================================================================

const PickerScreen: React.FC<{
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ selectedId, onSelect }) => {
  const available = getAllPractices()
    .filter((p) => p.active !== false && p.group !== 'custom')
    .sort((a, b) => a.order - b.order);

  return (
    <View style={styles.stageContent}>
      <Text style={styles.eyebrow}>YOUR STARTING POINT</Text>
      <Text style={styles.screenHeadline}>Pick one. Just one.</Text>

      {available.map((practice, index) => {
        const isSelected = selectedId === practice.id;
        const accent = practice.color ?? DEFAULT_PRACTICE_COLOR;
        return (
          <FadeRise key={practice.id} delay={200 + index * 60}>
            <TouchableOpacity
              style={[styles.practiceRow, isSelected && styles.practiceRowSelected]}
              onPress={() => onSelect(practice.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.practiceRowIcon, { backgroundColor: accent + '18' }]}>
                <Ionicons name={practice.icon as any} size={20} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.practiceRowName, isSelected && { color: Colors.primary }]}>
                  {practice.name}
                </Text>
                <Text style={styles.practiceRowDesc}>{practice.description}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
            </TouchableOpacity>
          </FadeRise>
        );
      })}

      <FadeRise delay={200 + available.length * 60}>
        <View style={styles.practiceCaution}>
          <Ionicons name="warning" size={15} color={Colors.secondary} style={{ marginTop: 1 }} />
          <Text style={styles.practiceCautionText}>
            <Text style={styles.practiceCautionBold}>Cold and heat exposure</Text> put real stress on the
            body. Check with your doctor before starting — especially if you have a heart, blood pressure, or
            other medical condition.
          </Text>
        </View>
      </FadeRise>
    </View>
  );
};

// ============================================================================
// SCREEN 6 — SEND THEM IN
// ============================================================================

const RevealScreen: React.FC<{ selectedPracticeName: string | null }> = ({ selectedPracticeName }) => {
  const items = [
    { icon: 'checkmark' as const, title: 'You sat still for 60 seconds', sub: 'and felt what constant input has done' },
    { icon: 'checkmark' as const, title: "You learned what's happening in your brain", sub: "dopamine, downregulation, and what it's costing you" },
    {
      icon: 'checkmark' as const,
      title: selectedPracticeName ? `You picked ${selectedPracticeName}` : 'You picked a direction',
      sub: 'your first practice is waiting',
    },
  ];

  return (
    <View style={[styles.stageContent, styles.revealContainer]}>
      <Text style={styles.eyebrow}>READY</Text>
      {items.map((item, i) => (
        <FadeRise key={item.title} delay={300 + i * 450}>
          <View style={styles.revealRow}>
            <View style={styles.revealBadge}>
              <Ionicons name={item.icon} size={16} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.revealRowTitle}>{item.title}</Text>
              <Text style={styles.revealRowSub}>{item.sub}</Text>
            </View>
          </View>
        </FadeRise>
      ))}
      <FadeRise delay={1800}>
        <Text style={styles.revealGoLine}>
          Now go <Text style={styles.revealGoOrange}>do the thing.</Text>
        </Text>
      </FadeRise>
      <FadeRise delay={2300}>
        {/* Plants the Debrief — it should feel like a promise kept, not an interruption */}
        <Text style={styles.revealTeaser}>
          After your first practice, we'll show you exactly what it did to your brain.
        </Text>
      </FadeRise>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OverrideOnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [sitDone, setSitDone] = useState(false);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isDark = step.key === 'override';

  const unlock = (key: StepKey) => setUnlocked((prev) => ({ ...prev, [key]: true }));

  const isUnlocked = (s: StepDef) => {
    if (!s.gated) return true;
    if (s.key === 'picker') return !!selectedPracticeId;
    return !!unlocked[s.key];
  };

  const navDirectionRef = useRef<1 | -1>(1);
  const goToIndex = (i: number) => {
    navDirectionRef.current = i >= stepIndex ? 1 : -1;
    setStepIndex(Math.max(0, Math.min(i, STEPS.length - 1)));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const goNext = () => goToIndex(stepIndex + 1);
  const goBack = () => stepIndex > 0 && goToIndex(stepIndex - 1);

  // --------------------------------------------------------------------------
  // Completion — starting practice, default seeding, then the completion flag
  // that flips navigation into the app.
  // --------------------------------------------------------------------------

  const handleSkipOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      try {
        await ensureCuratedPractices(user.uid);
      } catch (seedErr) {
        console.warn('Failed to seed default practices on skip:', seedErr);
      }
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Starting practice — created before the (idempotent) default seeding so
      // the seed skips it, then flagged so the home surfaces it front & center.
      if (selectedPracticeId) {
        const practice = getAllPractices().find((p) => p.id === selectedPracticeId);
        if (practice) {
          const existing = await getActiveHabits(user.uid);
          if (!existing.some((h) => h.practice_id === practice.id)) {
            await createHabit(user.uid, {
              name: practice.name,
              target_count_per_week: 0,
              practice_id: practice.id,
              group: practice.group,
              created_by_user: false,
            });
          }
          await setStartingPractice(user.uid, practice.id);
        }
      }

      try {
        await ensureCuratedPractices(user.uid);
      } catch (seedErr) {
        console.warn('Failed to seed default practices on complete:', seedErr);
      }

      await markOnboardingComplete(user.uid, true);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
      setSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const renderStep = () => {
    switch (step.key) {
      case 'hook':
        return <HookScreen />;
      case 'dopamine':
        return <DopamineScreen onUnlock={() => unlock('dopamine')} />;
      case 'sit':
        return (
          <SitScreen
            done={sitDone}
            onComplete={() => {
              setSitDone(true);
              unlock('sit');
            }}
            onSkipOnboarding={handleSkipOnboarding}
          />
        );
      case 'override':
        return <OverrideScreen />;
      case 'picker':
        return <PickerScreen selectedId={selectedPracticeId} onSelect={setSelectedPracticeId} />;
      case 'reveal':
        return <RevealScreen selectedPracticeName={selectedPracticeNameForReveal()} />;
    }
  };

  const selectedPracticeNameForReveal = (): string | null => {
    if (!selectedPracticeId) return null;
    return getAllPractices().find((p) => p.id === selectedPracticeId)?.name ?? null;
  };

  const ctaLocked = !isUnlocked(step);
  const isLast = stepIndex === STEPS.length - 1;

  const renderBottomNav = () => {
    // The sit screen carries its own start/skip controls until it's done
    if (step.key === 'sit' && !sitDone) return null;

    const cta =
      step.key === 'picker' ? (
        <HoldToCommitButton
          title={step.cta}
          onCommit={goNext}
          disabled={ctaLocked}
          style={styles.ctaButton}
        />
      ) : (
        <Button
          title={step.cta}
          onPress={isLast ? handleComplete : goNext}
          disabled={ctaLocked || saving}
          loading={isLast && saving}
          style={styles.ctaButton}
        />
      );

    return (
      <View
        style={[
          styles.navWrap,
          isDark && styles.navWrapDark,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm },
        ]}
      >
        {ctaLocked && !!step.hint && <Text style={styles.ctaHint}>{step.hint}</Text>}
        {!ctaLocked && step.key === 'picker' && <Text style={styles.ctaHint}>Press and hold</Text>}
        <View style={styles.navBar}>
          {stepIndex > 0 ? (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={isDark ? '#7FD0DE' : Colors.primary} />
              <Text style={[styles.backText, isDark && { color: '#7FD0DE' }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          {cta}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, isDark && styles.screenDark]}>
      <View style={[styles.progressRow, { paddingTop: insets.top + Spacing.sm }]}>
        {STEPS.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.progressSeg,
              isDark && styles.progressSegDark,
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
        {/* Keyed by step: each change remounts, sliding in from the travel
            direction and replaying the FadeRise staggers inside */}
        <FadeRise
          key={step.key}
          duration={300}
          distance={0}
          horizontalDistance={56 * navDirectionRef.current}
          style={{ flex: 1 }}
        >
          {renderStep()}
        </FadeRise>
      </ScrollView>

      {renderBottomNav()}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  screenDark: { backgroundColor: Colors.dark },
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
  progressSegDark: { backgroundColor: '#4A4A4A' },
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
  screenBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },

  // Bottom nav
  navWrap: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  navWrapDark: {
    borderTopColor: '#3A3A3A',
    backgroundColor: Colors.dark,
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
  skipOnboardingButton: { alignItems: 'center', paddingVertical: Spacing.md },
  skipOnboardingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },

  // Screen 1: Hook
  hookContainer: { flex: 1, justifyContent: 'center', paddingBottom: Spacing.xxl },
  notifZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: Spacing.sm,
    zIndex: 10,
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  notifBody: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  hookHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 38,
    marginBottom: Spacing.lg,
  },
  hookSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.gray,
    lineHeight: 27,
  },
  hookSubBold: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  hookCounter: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xl,
  },
  hookCounterNum: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.secondary },

  // Screen 2: Dopamine graph
  graphCard: {
    backgroundColor: Colors.dark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  graphLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  graphLabel: { fontFamily: Fonts.secondaryBold, fontSize: 11, color: '#9A9A9A', letterSpacing: 0.5 },
  graphArea: { height: 150, position: 'relative', overflow: 'hidden' },
  graphDashRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
  },
  graphDash: { width: 5, height: 1, backgroundColor: '#555555' },
  graphRefLabel: { position: 'absolute', left: 2, fontFamily: Fonts.secondary, fontSize: 9, color: '#888888' },
  graphSegment: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: Colors.secondary,
  },
  graphDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  scrollBtnWrap: { alignItems: 'center', marginTop: Spacing.lg, position: 'relative' },
  scrollThumb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  scrollThumbEmoji: { fontSize: 30 },
  scrollBtnLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  burstParticle: { position: 'absolute', top: 20, fontSize: 19, zIndex: 5 },
  rewardPill: {
    position: 'absolute',
    top: -12,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    zIndex: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  rewardPillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.white },
  flatMsg: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 23,
    marginTop: Spacing.lg,
  },
  flatMsgBold: { fontFamily: Fonts.secondaryBold, color: Colors.secondary },

  // Screen 3: Sit
  sitStartButton: { marginTop: Spacing.lg },
  sitSkipButton: { alignItems: 'center', paddingVertical: Spacing.md },
  sitSkipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
  sitOverlay: {
    flex: 1,
    backgroundColor: Colors.dark,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -Spacing.lg,
    marginBottom: -Spacing.xxl,
  },
  sitOverlayWord: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#888888',
    letterSpacing: 4,
  },
  sitOverlayNum: {
    fontFamily: Fonts.primary,
    fontSize: 88,
    color: Colors.white,
    fontVariant: ['tabular-nums'],
  },
  sitOverlaySkip: { position: 'absolute', bottom: Spacing.xxl, padding: Spacing.md },
  sitPostBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    lineHeight: 28,
    marginTop: Spacing.md,
  },
  sitGoodNews: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
    marginTop: Spacing.xl,
  },

  // Screen 4: Override (dark)
  overrideContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing.xxl },
  pulseStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 91, 2, 0.5)',
  },
  pulseCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  overrideHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 38,
  },
  overrideHeadlineOrange: { color: Colors.secondary },
  overrideBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: 25,
    marginTop: Spacing.lg,
    maxWidth: width - Spacing.lg * 4,
  },
  overrideBodyBold: { fontFamily: Fonts.secondaryBold, color: Colors.white },

  // Screen 5: Picker
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  practiceRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  practiceRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceRowName: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  practiceRowDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 17,
  },
  practiceCaution: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  practiceCautionText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
  },
  practiceCautionBold: { fontFamily: Fonts.secondaryBold, color: Colors.dark },

  // Screen 6: Reveal
  revealContainer: { justifyContent: 'center' },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  revealBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealRowTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  revealRowSub: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  revealGoLine: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginTop: Spacing.xl,
  },
  revealGoOrange: { color: Colors.secondary },
  revealTeaser: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginTop: Spacing.md,
  },
});

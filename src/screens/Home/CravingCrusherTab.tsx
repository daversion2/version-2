import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FeatureInfoModal } from '../../components/common/FeatureInfoModal';

interface Props {
  onPress: () => void;
}

export const CravingCrusherTab: React.FC<Props> = ({ onPress }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
  <ScrollView style={s.scroll} contentContainerStyle={s.content}>
    <View style={s.infoRow}>
      <TouchableOpacity
        onPress={() => setShowInfo(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle-outline" size={22} color={Colors.gray} />
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={s.hero} onPress={onPress} activeOpacity={0.85}>
      <View style={s.iconWrap}>
        <Ionicons name="flash" size={28} color={Colors.white} />
      </View>
      <Text style={s.title}>Craving Crusher</Text>
      <Text style={s.body}>
        Notice a pull toward something you're trying to resist? Start the timer and ride it
        out — urges peak in about 3 minutes, then pass on their own.
      </Text>
      <View style={s.startBtn}>
        <Text style={s.startBtnText}>Start Timer →</Text>
      </View>
    </TouchableOpacity>

    <View style={s.whyCard}>
      <Text style={s.whyLabel}>Why it works</Text>
      <Text style={s.whyText}>
        Urge surfing uses acceptance rather than suppression — observing a craving without
        acting on it weakens the habit loop each time. The urge passes. You stay in control.
      </Text>
    </View>

    <FeatureInfoModal
      visible={showInfo}
      onDismiss={() => setShowInfo(false)}
      icon="flash"
      accent={Colors.secondary}
      title="Craving Crusher"
      intro="A craving showing up is not an instruction to act. It’s a wave your brain generated — it builds, peaks within a few minutes, and falls on its own if you don’t feed it."
      points={[
        {
          label: 'Name what’s pulling.',
          text: 'Start the timer, say what the craving is, and rate its strength. This isn’t bookkeeping — putting it into words is the part that takes the edge off.',
        },
        {
          label: 'Outlast the peak.',
          text: 'The wave crests early and drops from there. Breathe, move, ground yourself, or read what’s happening in your brain while it passes.',
        },
        {
          label: 'Record what really happened.',
          text: 'Rode it out or gave in — log it either way. The pattern across entries is what exposes the triggers you can’t see in the moment.',
        },
      ]}
      science={[
        {
          label: 'Naming it turns the volume down.',
          text: 'Putting an urge into words engages the prefrontal cortex and measurably dampens amygdala activity. Research on affect labeling finds the feeling weakens as soon as it’s named — you don’t have to fight the craving, you have to describe it.',
        },
        {
          label: 'The urge has a shelf life.',
          text: 'Cravings follow a fixed shape: sharp rise, brief peak, long fade. Most resolve fully within 15–20 minutes with no intervention at all — even though at peak intensity people predict they’ll last for hours.',
        },
        {
          label: 'Not acting rewrites the loop.',
          text: 'Every urge you feel without obeying weakens the link between the cue and the behavior. Acting at the peak does the reverse: it teaches the circuit that intensity works, and the next wave arrives taller.',
        },
      ]}
      footer="The craving arriving was never the failure. Obeying it is the only part you control — and the only part that trains."
    />
  </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  infoRow: { alignItems: 'flex-end', marginBottom: Spacing.sm },

  hero: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  startBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignSelf: 'stretch',
  },
  startBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
  },

  whyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  whyLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  whyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
});

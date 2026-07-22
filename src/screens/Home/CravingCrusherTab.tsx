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
      intro="A craving is a wave, not a command. It peaks in about 3 minutes, then fades on its own — as long as you don't act on it."
      points={[
        {
          label: 'Name the urge.',
          text: 'Start the timer, pick what’s pulling at you, and rate how strong it feels. The timer scales to match the wave.',
        },
        {
          label: 'Ride it out.',
          text: 'Stay busy while it passes — breathe, ground yourself, name what you feel, or learn what’s happening in your brain.',
        },
        {
          label: 'Log the outcome.',
          text: 'Rode it out or gave in, log it either way. The honest record is what reveals your triggers over time.',
        },
      ]}
      footer="Every wave you ride trains the same override circuit — it gets easier."
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

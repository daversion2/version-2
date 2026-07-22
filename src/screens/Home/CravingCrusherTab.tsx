import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  onPress: () => void;
}

export const CravingCrusherTab: React.FC<Props> = ({ onPress }) => (
  <ScrollView style={s.scroll} contentContainerStyle={s.content}>
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
  </ScrollView>
);

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

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

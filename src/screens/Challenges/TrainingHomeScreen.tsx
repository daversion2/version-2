import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { ChallengesScreenProps } from '../../types/navigation';

type Props = ChallengesScreenProps<'TrainingHome'>;

interface TrainingCard {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: 'ChallengesHome' | 'AvoidanceTraining' | 'ProgramDiscovery';
}

export const TrainingHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;

  const cards: TrainingCard[] = [
    {
      key: 'challenges',
      icon: 'flash',
      title: 'Challenges',
      subtitle: 'Set yourself a test — a deliberate push beyond your daily practices.',
      route: 'ChallengesHome',
    },
    {
      key: 'avoidance',
      icon: 'barbell',
      title: 'Avoidance Training',
      subtitle: 'Clear the things you keep putting off, one rep at a time.',
      route: 'AvoidanceTraining',
    },
    // Programs are admin-only until launch — mirrors the gating on the
    // challenges landing.
    ...(isAdmin
      ? [{
          key: 'programs',
          icon: 'calendar' as const,
          title: 'Programs',
          subtitle: 'Guided multi-day sequences that build a specific skill.',
          route: 'ProgramDiscovery' as const,
        }]
      : []),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Training</Text>
      <Text style={styles.h2}>
        Extra credit. Optional pushes beyond your daily practices — take them on when you're ready.
      </Text>

      {cards.map(card => (
        <TouchableOpacity
          key={card.key}
          style={styles.card}
          onPress={() => navigation.navigate(card.route)}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={card.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  h1: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  h2: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(33,113,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 19,
  },
});

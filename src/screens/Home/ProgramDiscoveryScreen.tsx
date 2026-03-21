import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getAllPrograms } from '../../services/programs';
import { seedPrograms } from '../../utils/seedPrograms';
import { ProgramTemplate } from '../../types';

type Props = NativeStackScreenProps<any, 'ProgramDiscovery'>;

export const ProgramDiscoveryScreen: React.FC<Props> = ({ navigation }) => {
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        let data = await getAllPrograms();
        // Auto-seed missing programs
        if (data.length < 5) {
          console.log('Seeding missing programs...');
          await seedPrograms();
          data = await getAllPrograms();
        }
        setPrograms(data);
      } catch (err) {
        console.error('Failed to load programs:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Programs</Text>
      <Text style={styles.subtitle}>
        Structured challenges designed to build lasting habits. Pick a program, choose your intensity, and commit.
      </Text>

      {programs.map((program) => {
        const hasContent = program.cold_turkey_days.length > 0 || program.gradual_build_days.length > 0;

        return (
          <Card
            key={program.id}
            style={{ ...styles.programCard, borderLeftColor: program.color }}
            onPress={hasContent ? () => navigation.navigate('ProgramDetail', { programId: program.id }) : undefined}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: program.color + '20' }]}>
                <Ionicons
                  name={program.icon as any}
                  size={28}
                  color={program.color}
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.programName}>{program.name}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.metaBadge, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
                    <Text style={styles.metaBadgeText}>{program.duration_days} days</Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: program.color + '15' }]}>
                    <Text style={[styles.metaBadgeText, { color: program.color }]}>{program.category}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={hasContent ? Colors.gray : Colors.border} />
            </View>
            <Text style={styles.programDesc} numberOfLines={2}>
              {program.description}
            </Text>
            {!hasContent && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  programCard: {
    borderLeftWidth: 4,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.xs,
  },
  programName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  metaBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  programDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  comingSoonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

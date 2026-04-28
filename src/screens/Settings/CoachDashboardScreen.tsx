import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getCoachProfile, getCoachPrograms } from '../../services/coaches';
import { CoachProfile, ProgramTemplate } from '../../types';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: Colors.secondary + '15', text: Colors.secondary, label: 'Draft' },
  published: { bg: Colors.primary + '15', text: Colors.primary, label: 'Published' },
  archived: { bg: Colors.gray + '25', text: Colors.gray, label: 'Archived' },
};

export const CoachDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [p, progs] = await Promise.all([
        getCoachProfile(user.uid),
        getCoachPrograms(user.uid),
      ]);
      setProfile(p);
      setPrograms(progs);
    } catch (err) {
      console.error('Error loading coach dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const publishedCount = programs.filter(p => p.status === 'published').length;
  const draftCount = programs.filter(p => p.status === 'draft').length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Profile Card */}
      {profile && (
        <Card style={styles.profileCard}>
          <Text style={styles.profileName}>{profile.display_name}</Text>
          {profile.credentials && (
            <Text style={styles.profileCredentials}>{profile.credentials}</Text>
          )}
          <Text style={styles.profileDate}>
            Coach since {formatDate(profile.approved_at)}
          </Text>
        </Card>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{programs.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {publishedCount}
          </Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.secondary }]}>
            {draftCount}
          </Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
      </View>

      {/* Create Program */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CoachProgramEdit', { mode: 'create' })}
      >
        <Ionicons name="add-circle" size={28} color={Colors.white} />
        <Text style={styles.createButtonText}>Create Program</Text>
      </TouchableOpacity>

      {/* Programs List */}
      <Text style={styles.sectionTitle}>Your Programs</Text>

      {programs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No programs yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "Create Program" to get started
          </Text>
        </Card>
      ) : (
        programs.map(program => {
          const statusStyle = STATUS_STYLES[program.status || 'draft'];
          return (
            <Card
              key={program.id}
              style={styles.programCard}
              onPress={() =>
                navigation.navigate('CoachProgramEdit', {
                  mode: 'edit',
                  programId: program.id,
                })
              }
            >
              <View style={styles.programHeader}>
                <View
                  style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
                >
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {statusStyle.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
              </View>
              <Text style={styles.programName}>{program.name}</Text>
              <View style={styles.programMeta}>
                <Text style={styles.metaText}>{program.category}</Text>
                <Text style={styles.metaDot}>{'\u2022'}</Text>
                <Text style={styles.metaText}>{program.duration_days} days</Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  profileCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  profileName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  profileCredentials: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  profileDate: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  createButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  programCard: {
    marginBottom: Spacing.md,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  programName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  programMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  metaDot: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

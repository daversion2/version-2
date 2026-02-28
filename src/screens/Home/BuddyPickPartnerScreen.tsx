import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { TeamMember } from '../../types';
import { getUserTeam, getTeamMembers } from '../../services/teams';
import { createBuddyChallengeInvite } from '../../services/buddyChallenge';
import { getDuoStreak } from '../../services/buddyChallenge';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'BuddyPickPartner'>;

export const BuddyPickPartnerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const challengeData = route.params?.challengeData;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [duoStreaks, setDuoStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const team = await getUserTeam(user.uid);
      if (!team) {
        setHasTeam(false);
        setLoading(false);
        return;
      }

      setTeamId(team.id);
      setHasTeam(true);

      const teamMembers = await getTeamMembers(team.id);
      const otherMembers = teamMembers.filter(m => m.user_id !== user.uid);
      setMembers(otherMembers);

      // Fetch duo streaks for each member
      const streaks: Record<string, number> = {};
      await Promise.all(
        otherMembers.map(async (m) => {
          try {
            const streak = await getDuoStreak(user.uid, m.user_id);
            if (streak) {
              streaks[m.user_id] = streak.challenges_completed;
            }
          } catch {
            // Ignore errors for individual streak fetches
          }
        })
      );
      setDuoStreaks(streaks);
    } catch (e) {
      console.error('Error loading team members:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPartner = async (member: TeamMember) => {
    if (!user || !teamId || !challengeData) return;
    setSending(member.user_id);
    try {
      await createBuddyChallengeInvite(
        user.uid,
        member.user_id,
        teamId,
        challengeData,
        userProfile?.username,
        member.username,
      );
      showAlert(
        'Invite Sent!',
        `${member.username || member.display_name} has been invited to do "${challengeData.name}" with you.`
      );
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to send invite.');
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!hasTeam) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyTitle}>No Team Yet</Text>
              <Text style={styles.emptyDesc}>
                You need to be on a team to do buddy challenges. Create or join a team first.
              </Text>
              <Button
                title="Go to Teams"
                onPress={() => navigation.navigate('Community', { screen: 'TeamScreen' })}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="person-add-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyTitle}>No Teammates</Text>
              <Text style={styles.emptyDesc}>
                Invite someone to join your team first, then you can do buddy challenges together.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.subtitle}>
          Choose a teammate to do "{challengeData?.name}" with
        </Text>

        {members.map((member) => {
          const streak = duoStreaks[member.user_id];
          const isSending = sending === member.user_id;

          return (
            <Card key={member.id} style={styles.memberCard}>
              <View style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(member.username || member.display_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.username || member.display_name}
                  </Text>
                  {streak ? (
                    <View style={styles.streakRow}>
                      <Ionicons name="people" size={14} color={Colors.primary} />
                      <Text style={styles.streakCount}>
                        {streak} challenge{streak !== 1 ? 's' : ''} together
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noStreak}>First buddy challenge!</Text>
                  )}
                </View>
                <Button
                  title="Invite"
                  variant="secondary"
                  onPress={() => handleSelectPartner(member)}
                  loading={isSending}
                  disabled={sending !== null}
                  style={styles.inviteBtn}
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  memberCard: { marginBottom: Spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  noStreak: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  inviteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  emptyDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
});

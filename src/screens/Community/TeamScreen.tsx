import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getUserTeam, getTeamMembers, leaveTeam, getTeamStats } from '../../services/teams';
import { Team, TeamMember } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';

export const TeamScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<{
    combinedStreak: number;
    longestStreak: number;
    daysActive: number;
  } | null>(null);

  const loadTeam = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userTeam = await getUserTeam(user.uid);
      setTeam(userTeam);

      if (userTeam) {
        const teamMembers = await getTeamMembers(userTeam.id);
        setMembers(teamMembers);
        const teamStats = await getTeamStats(userTeam.id);
        setStats(teamStats);
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam])
  );

  const handleLeaveTeam = async () => {
    if (!team || !user) return;

    const isCreator = team.creator_id === user.uid;
    const message = isCreator
      ? 'As the team creator, leaving will transfer ownership to another member. Are you sure?'
      : 'Are you sure you want to leave this team?';

    showConfirm('Leave Team', message, async () => {
      try {
        await leaveTeam(team.id, user.uid);
        showAlert('Left Team', 'You have left the team.');
        setTeam(null);
        setMembers([]);
        setStats(null);
        await refreshProfile();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to leave team');
      }
    });
  };

  const handleShareInvite = async () => {
    if (!team) return;
    try {
      await Share.share({
        message: `Join my team "${team.name}" on Neuro Nudge! Use invite code: ${team.invite_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // No team - show create/join options
  if (!team) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color={Colors.gray} />
          <Text style={styles.emptyTitle}>No Team Yet</Text>
          <Text style={styles.emptyDesc}>
            Join a team to stay accountable with friends. See when teammates
            complete challenges and habits, and keep each other motivated.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Create a Team</Text>
          <Text style={styles.cardDesc}>
            Start a new team and invite friends to join with a code.
          </Text>
          <Button
            title="Create Team"
            onPress={() => navigation.navigate('CreateTeam')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Join a Team</Text>
          <Text style={styles.cardDesc}>
            Have an invite code? Join an existing team.
          </Text>
          <Button
            title="Join Team"
            onPress={() => navigation.navigate('JoinTeam')}
            variant="outline"
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      </ScrollView>
    );
  }

  // Has team - show team details
  const currentMember = members.find((m) => m.user_id === user?.uid);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Team Header */}
      <Card style={styles.card} onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}>
        <View style={styles.teamHeader}>
          <View style={styles.teamIcon}>
            <Ionicons name="people" size={32} color={Colors.white} />
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.teamMeta}>
              {members.length} member{members.length !== 1 ? 's' : ''} • Tap for details
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.gray} />
        </View>
      </Card>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.combinedStreak}</Text>
            <Text style={styles.statLabel}>Team Streak</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.daysActive}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </Card>
        </View>
      )}

      {/* Invite Code */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Invite Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.inviteCode}>{team.invite_code}</Text>
        </View>
        <Text style={styles.cardDesc}>
          Share this code with friends to invite them to your team.
        </Text>
        <Button
          title="Share Invite"
          onPress={handleShareInvite}
          variant="outline"
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Members Preview */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Members</Text>
        {members.slice(0, 3).map((member) => (
          <View key={member.user_id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Ionicons name="person" size={16} color={Colors.white} />
            </View>
            <Text style={styles.memberName}>
              {member.username || member.display_name}
              {member.user_id === team.creator_id && (
                <Text style={styles.creatorBadge}> (Creator)</Text>
              )}
              {member.user_id === user?.uid && (
                <Text style={styles.youBadge}> (You)</Text>
              )}
            </Text>
          </View>
        ))}
        {members.length > 3 && (
          <Text style={styles.moreMembers}>
            +{members.length - 3} more member{members.length - 3 !== 1 ? 's' : ''}
          </Text>
        )}
      </Card>

      {/* Leave Team */}
      <Button
        title="Leave Team"
        onPress={handleLeaveTeam}
        variant="outline"
        style={styles.leaveButton}
      />
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  teamMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  codeContainer: {
    backgroundColor: Colors.lightGray,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  inviteCode: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    letterSpacing: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  memberName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  creatorBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  youBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  moreMembers: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  leaveButton: {
    marginTop: Spacing.lg,
    borderColor: Colors.fail,
  },
});

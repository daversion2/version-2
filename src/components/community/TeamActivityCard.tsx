import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { useAuth } from '../../context/AuthContext';
import { Team, TeamMemberActivitySummary } from '../../types';

interface TeamActivityCardProps {
  team: Team;
  summary: TeamMemberActivitySummary[];
}

export const TeamActivityCard: React.FC<TeamActivityCardProps> = ({ team, summary }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const activeToday = summary.filter((m) => m.has_activity_today).length;
  const totalMembers = summary.length;
  const currentUserActivity = summary.find((m) => m.user_id === user?.uid);
  const userShowedUp = currentUserActivity?.has_activity_today || false;

  const handlePress = () => {
    navigation.navigate('Settings', {
      screen: 'Team',
    });
  };

  return (
    <Card style={styles.container} onPress={handlePress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={20} color={Colors.white} />
          </View>
          <Text style={styles.teamName}>{team.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {activeToday} of {totalMembers} showed up today
        </Text>
        <View style={styles.dots}>
          {summary.map((member, index) => (
            <View
              key={member.user_id}
              style={[
                styles.dot,
                member.has_activity_today ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Member previews */}
      <View style={styles.membersList}>
        {summary.slice(0, 3).map((member) => (
          <View key={member.user_id} style={styles.memberRow}>
            <View
              style={[
                styles.checkIcon,
                member.has_activity_today
                  ? styles.checkIconActive
                  : styles.checkIconInactive,
              ]}
            >
              {member.has_activity_today ? (
                <Ionicons name="checkmark" size={12} color={Colors.white} />
              ) : (
                <Ionicons name="remove" size={12} color={Colors.white} />
              )}
            </View>
            <Text
              style={[
                styles.memberName,
                member.user_id === user?.uid && styles.memberNameYou,
              ]}
              numberOfLines={1}
            >
              {member.username || member.display_name}
              {member.user_id === user?.uid ? ' (You)' : ''}
            </Text>
            {member.has_activity_today && (
              <Text style={styles.activityPreview} numberOfLines={1}>
                {member.challenge_completed
                  ? `${member.challenge_category} challenge`
                  : `${member.habits_completed} habit${member.habits_completed !== 1 ? 's' : ''}`}
              </Text>
            )}
          </View>
        ))}
        {summary.length > 3 && (
          <Text style={styles.moreText}>
            +{summary.length - 3} more
          </Text>
        )}
      </View>

      {/* Encouragement message if user hasn't shown up */}
      {!userShowedUp && (
        <View style={styles.encouragement}>
          <Text style={styles.encouragementText}>
            Your teammates showed up. Your turn?
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  teamName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.lightGray,
  },
  membersList: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkIconActive: {
    backgroundColor: Colors.primary,
  },
  checkIconInactive: {
    backgroundColor: Colors.gray,
  },
  memberName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginRight: Spacing.sm,
  },
  memberNameYou: {
    color: Colors.primary,
  },
  activityPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    flex: 1,
  },
  moreText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  encouragement: {
    backgroundColor: Colors.secondary + '15',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  encouragementText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    textAlign: 'center',
  },
});

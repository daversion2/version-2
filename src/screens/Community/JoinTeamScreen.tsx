import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { getTeamByInviteCode, joinTeam, getUserTeam } from '../../services/teams';
import { Team } from '../../types';
import { showAlert } from '../../utils/alert';

export const JoinTeamScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();

  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundTeam, setFoundTeam] = useState<Team | null>(null);
  const [joined, setJoined] = useState(false);

  const handleLookup = async () => {
    if (!inviteCode.trim()) {
      showAlert('Missing Code', 'Please enter an invite code.');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      showAlert('Invalid Code', 'Invite codes are 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Check if user is already in a team
      if (user) {
        const existingTeam = await getUserTeam(user.uid);
        if (existingTeam) {
          showAlert(
            'Already in Team',
            'You are already in a team. Leave your current team first.'
          );
          setLoading(false);
          return;
        }
      }

      const team = await getTeamByInviteCode(inviteCode.trim().toUpperCase());
      if (!team) {
        showAlert('Not Found', 'No team found with that invite code.');
        setLoading(false);
        return;
      }

      if (team.member_ids.length >= team.settings.max_members) {
        showAlert('Team Full', 'This team has reached its maximum of 5 members.');
        setLoading(false);
        return;
      }

      setFoundTeam(team);
    } catch (error: any) {
      console.error('Error looking up team:', error);
      showAlert('Error', error.message || 'Failed to look up team');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !foundTeam) return;

    if (!displayName.trim()) {
      showAlert('Missing Info', 'Please enter your display name.');
      return;
    }

    if (displayName.trim().length > 20) {
      showAlert('Too Long', 'Display name must be 20 characters or less.');
      return;
    }

    setLoading(true);
    try {
      await joinTeam(foundTeam.id, user.uid, displayName.trim());
      setJoined(true);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error joining team:', error);
      showAlert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Success state
  if (joined && foundTeam) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>Joined Team!</Text>
          <Text style={styles.successTeamName}>{foundTeam.name}</Text>
          <Text style={styles.successDesc}>
            You're now part of the team. You'll see each other's activity and stay
            accountable together.
          </Text>
        </View>

        <Button title="Done" onPress={handleDone} style={styles.doneButton} />
      </ScrollView>
    );
  }

  // Found team - show confirmation
  if (foundTeam) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>Join Team</Text>

          <Card style={styles.card}>
            <View style={styles.teamPreview}>
              <View style={styles.teamIcon}>
                <Ionicons name="people" size={32} color={Colors.white} />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{foundTeam.name}</Text>
                <Text style={styles.teamMeta}>
                  {foundTeam.member_ids.length} member
                  {foundTeam.member_ids.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <InputField
              label="Your Display Name"
              placeholder="How teammates will see you"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={20}
            />
            <Text style={styles.hint}>
              Choose how you want to appear to your teammates.
            </Text>
          </Card>

          <Button
            title={loading ? 'Joining...' : 'Join Team'}
            onPress={handleJoin}
            disabled={loading}
            style={styles.joinButton}
          />

          <Button
            title="Back"
            onPress={() => setFoundTeam(null)}
            variant="outline"
            style={styles.backButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Enter code
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Join a Team</Text>
        <Text style={styles.subheader}>
          Enter the 6-character invite code shared by a team creator.
        </Text>

        <Card style={styles.card}>
          <InputField
            label="Invite Code"
            placeholder="ABCD12"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
        </Card>

        <Button
          title={loading ? 'Looking up...' : 'Look Up Team'}
          onPress={handleLookup}
          disabled={loading}
          style={styles.lookupButton}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens when you join?</Text>
          <Text style={styles.infoText}>
            • You'll see when teammates complete challenges{'\n'}
            • Teammates will see your activity (not details){'\n'}
            • Get optional push notifications{'\n'}
            • You can leave anytime
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  subheader: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  card: {
    marginBottom: Spacing.md,
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  lookupButton: {
    marginTop: Spacing.md,
  },
  infoCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  infoTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
  // Team preview
  teamPreview: {
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
  joinButton: {
    marginTop: Spacing.md,
  },
  backButton: {
    marginTop: Spacing.sm,
  },
  // Success state
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  successTeamName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  successDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    marginTop: Spacing.lg,
  },
});

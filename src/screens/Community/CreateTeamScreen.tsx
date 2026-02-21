import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { createTeam } from '../../services/teams';
import { showAlert } from '../../utils/alert';

export const CreateTeamScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();

  const [teamName, setTeamName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user) return;

    if (!teamName.trim()) {
      showAlert('Missing Info', 'Please enter a team name.');
      return;
    }

    if (!displayName.trim()) {
      showAlert('Missing Info', 'Please enter your display name.');
      return;
    }

    if (teamName.trim().length > 30) {
      showAlert('Too Long', 'Team name must be 30 characters or less.');
      return;
    }

    if (displayName.trim().length > 20) {
      showAlert('Too Long', 'Display name must be 20 characters or less.');
      return;
    }

    setLoading(true);
    try {
      const result = await createTeam(user.uid, teamName.trim(), displayName.trim());
      setInviteCode(result.inviteCode);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error creating team:', error);
      showAlert('Error', error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join my team "${teamName}" on Neuro Nudge! Use invite code: ${inviteCode}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Success state - show invite code
  if (inviteCode) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.successState}>
          <Text style={styles.successTitle}>Team Created!</Text>
          <Text style={styles.successDesc}>
            Share this code with friends to invite them to join.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Invite Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
          </View>
        </Card>

        <Button
          title="Share Invite Code"
          onPress={handleShare}
          style={styles.shareButton}
        />

        <Button
          title="Done"
          onPress={handleDone}
          variant="outline"
          style={styles.doneButton}
        />
      </ScrollView>
    );
  }

  // Create form
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Create a Team</Text>
        <Text style={styles.subheader}>
          Start an accountability group with friends. You'll get an invite code to
          share after creating.
        </Text>

        <Card style={styles.card}>
          <InputField
            label="Team Name"
            placeholder="e.g., Morning Warriors"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={30}
          />

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Your Display Name"
            placeholder="How teammates will see you"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={20}
          />

          <Text style={styles.hint}>
            Your display name is visible to team members. You can use your real name
            or a nickname.
          </Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Teams</Text>
          <Text style={styles.infoText}>
            • Teams have 2-5 members{'\n'}
            • See when teammates complete challenges{'\n'}
            • Get notifications for team activity{'\n'}
            • No performance details are shared
          </Text>
        </Card>

        <Button
          title={loading ? 'Creating...' : 'Create Team'}
          onPress={handleCreate}
          disabled={loading}
          style={styles.createButton}
        />
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
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.lg,
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
  createButton: {
    marginTop: Spacing.md,
  },
  // Success state
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  successDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: Colors.lightGray,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  inviteCode: {
    fontFamily: Fonts.primaryBold,
    fontSize: 36,
    color: Colors.primary,
    letterSpacing: 6,
  },
  shareButton: {
    marginTop: Spacing.lg,
  },
  doneButton: {
    marginTop: Spacing.md,
  },
});

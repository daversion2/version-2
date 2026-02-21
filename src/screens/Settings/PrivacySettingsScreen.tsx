import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getUser, updateInspirationFeedOptIn } from '../../services/users';
import {
  getUserTeam,
  getMemberNotificationSettings,
  updateMemberNotificationSetting,
} from '../../services/teams';

export const PrivacySettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inspirationFeedOptIn, setInspirationFeedOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  // Team notification settings
  const [teamId, setTeamId] = useState<string | null>(null);
  const [challengeNotifications, setChallengeNotifications] = useState(true);
  const [habitNotifications, setHabitNotifications] = useState(true);
  const [savingTeamSettings, setSavingTeamSettings] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const userData = await getUser(user.uid);
        // Default to true if not set
        setInspirationFeedOptIn(userData?.inspiration_feed_opt_in !== false);

        // Load team notification settings if user is in a team
        const team = await getUserTeam(user.uid);
        if (team) {
          setTeamId(team.id);
          const notificationSettings = await getMemberNotificationSettings(team.id, user.uid);
          if (notificationSettings) {
            setChallengeNotifications(notificationSettings.challenge_completions !== false);
            setHabitNotifications(notificationSettings.habit_completions !== false);
          }
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleInspirationFeedToggle = async (value: boolean) => {
    if (!user || saving) return;
    setSaving(true);
    setInspirationFeedOptIn(value);
    try {
      await updateInspirationFeedOptIn(user.uid, value);
    } catch (error) {
      console.error('Error updating inspiration feed setting:', error);
      // Revert on error
      setInspirationFeedOptIn(!value);
    } finally {
      setSaving(false);
    }
  };

  const handleChallengeNotificationsToggle = async (value: boolean) => {
    if (!user || !teamId || savingTeamSettings) return;
    setSavingTeamSettings(true);
    setChallengeNotifications(value);
    try {
      await updateMemberNotificationSetting(teamId, user.uid, 'challenge_completions', value);
    } catch (error) {
      console.error('Error updating challenge notifications setting:', error);
      setChallengeNotifications(!value);
    } finally {
      setSavingTeamSettings(false);
    }
  };

  const handleHabitNotificationsToggle = async (value: boolean) => {
    if (!user || !teamId || savingTeamSettings) return;
    setSavingTeamSettings(true);
    setHabitNotifications(value);
    try {
      await updateMemberNotificationSetting(teamId, user.uid, 'habit_completions', value);
    } catch (error) {
      console.error('Error updating habit notifications setting:', error);
      setHabitNotifications(!value);
    } finally {
      setSavingTeamSettings(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeader}>Community Privacy</Text>

      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Share to Inspiration Feed</Text>
            <Text style={styles.settingDesc}>
              When you complete a challenge with difficulty 3 or higher, it may appear anonymously in the community Inspiration Feed to motivate others.
            </Text>
          </View>
          <Switch
            value={inspirationFeedOptIn}
            onValueChange={handleInspirationFeedToggle}
            trackColor={{ false: Colors.lightGray, true: Colors.primary }}
            thumbColor={Colors.white}
            disabled={saving}
          />
        </View>
      </Card>

      <Text style={styles.privacyNote}>
        Your name is never shown in the Inspiration Feed. Only the challenge category, difficulty level, and a brief teaser of the challenge name are shared.
      </Text>

      {teamId && (
        <>
          <Text style={[styles.sectionHeader, styles.teamSectionHeader]}>Team Notifications</Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Challenge Completions</Text>
                <Text style={styles.settingDesc}>
                  Get notified when a teammate completes a challenge.
                </Text>
              </View>
              <Switch
                value={challengeNotifications}
                onValueChange={handleChallengeNotificationsToggle}
                trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                thumbColor={Colors.white}
                disabled={savingTeamSettings}
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Habit Completions</Text>
                <Text style={styles.settingDesc}>
                  Get notified when a teammate completes a habit.
                </Text>
              </View>
              <Switch
                value={habitNotifications}
                onValueChange={handleHabitNotificationsToggle}
                trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                thumbColor={Colors.white}
                disabled={savingTeamSettings}
              />
            </View>
          </Card>

          <Text style={styles.privacyNote}>
            These notifications help you stay connected with your team and celebrate their progress together.
          </Text>
        </>
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
  loadingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  teamSectionHeader: {
    marginTop: Spacing.xl,
  },
  card: {
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  settingDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  privacyNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
});

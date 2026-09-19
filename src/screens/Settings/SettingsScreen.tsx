import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SettingsNavigation } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../services/auth';
import { resetOnboarding, getUser, clearUserAccount, deleteAccountPermanently, clearPushToken } from '../../services/users';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { registerForPushNotifications } from '../../services/notifications';
import { showAlert, showConfirm } from '../../utils/alert';

export const SettingsScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<SettingsNavigation>();
  const [username, setUsername] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // A stored token IS the opt-in record — the same signal the server filters on,
  // so the switch shows exactly what the backend believes.
  const pushEnabled = !!userProfile?.expoPushToken;

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const userData = await getUser(user.uid);
        setUsername(userData?.username || null);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, [user]);

  const handleReplayOnboarding = async () => {
    if (!user) return;
    try {
      await resetOnboarding(user.uid);
      await refreshProfile();
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      showAlert('Error', 'Failed to reset onboarding.');
    }
  };

  /**
   * The on/off switch for SERVER pushes.
   *
   * Turning it off clears the stored token, which is what removes the user from
   * the server's recipient query — it does not touch per-habit reminders, which
   * are local and were configured habit by habit. Before this existed the only
   * way out was revoking notifications at the OS level, which took the habit
   * reminders down with it.
   */
  const handleTogglePush = async (next: boolean) => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (!next) {
        await clearPushToken(user.uid);
        await refreshProfile();
        return;
      }
      const token = await registerForPushNotifications(user.uid);
      if (!token) {
        // No token means the OS refused, or this is a simulator (which cannot
        // issue one at all). Either way the switch must stay off — showing it on
        // would promise notifications that can never arrive.
        showAlert(
          'Notifications are blocked',
          'Your phone is blocking notifications for Neuro-Nudge. You can turn them on in your device Settings, under Notifications.'
        );
        return;
      }
      await refreshProfile();
    } catch (error) {
      console.error('Error toggling notifications:', error);
      showAlert('Something went wrong', 'Could not change your notification setting. Please try again.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleClearAccount = () => {
    showConfirm(
      'Clear Account',
      'This will delete ALL your data (challenges, habits, streaks, XP, reflections, etc.) and restart from scratch. Your login stays the same. This cannot be undone.',
      async () => {
        if (!user) return;
        setClearing(true);
        try {
          const result = await clearUserAccount(user.uid);
          await refreshProfile();
          showAlert('Account Cleared', `Deleted ${result.deletedDocs} documents. You'll see onboarding again on next launch.`);
        } catch (error) {
          console.error('Error clearing account:', error);
          showAlert('Error', 'Failed to clear account. Try again.');
        } finally {
          setClearing(false);
        }
      },
      'Clear Everything'
    );
  };

  // Two confirmations, because unlike Clear Account this is irreversible and
  // takes the login with it.
  const handleDeleteAccount = () => {
    showConfirm(
      'Delete Account',
      'This permanently deletes your account and everything in it — challenges, habits, streaks, XP, reflections, and worksheets. You will not be able to sign back in, and none of it can be recovered.',
      () => {
        showConfirm(
          'Are you sure?',
          'This cannot be undone.',
          async () => {
            setDeleting(true);
            try {
              await deleteAccountPermanently();
              // Sign-out inside the service drops us back to the auth screen,
              // so there is no post-delete UI to return to.
            } catch (error) {
              console.error('Error deleting account:', error);
              showAlert('Error', 'Could not delete your account. Please try again.');
              setDeleting(false);
            }
          },
          'Delete Forever'
        );
      },
      'Continue'
    );
  };

  const handleLogout = () => {
    showConfirm('Sign Out', 'Are you sure?', logOut, 'Sign Out');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Profile */}
      <Card style={styles.card} onPress={() => navigation.navigate('EditProfile')}>
        <View style={styles.navRow}>
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Profile</Text>
            {username && <Text style={styles.username}>@{username}</Text>}
            <Text style={styles.email}>{user?.email || 'Not signed in'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* NOTE: "How It Works" was removed 2026-09-18. It described the app as
          three pillars — Challenges, Practices, Programs — none of which are
          current: two are off the tab bar and the third is now just habits.
          Explanation lives on the screens themselves, in the "i" info icons
          (FeatureInfoModal / ScreenIntro), which is where it gets read. */}

      {/* Archived habits. The screen itself lives in the Home stack, so this
          reaches across tabs the same way the reflection shortcut below does.
          Without an entry point here the archive flow was a one-way door: it
          promises "you can restore it from Archived at any time", and nothing
          in the app linked to Archived — a habit with no logged check-ins then
          appeared in no list at all and could not be got back. */}
      <Card
        style={styles.card}
        onPress={() =>
          navigation.getParent()?.navigate('Home', { screen: 'ArchivedHabits' })
        }
      >
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Archived Habits</Text>
            <Text style={styles.desc}>Habits you've put away — restore any of them</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Admin — only for flagged accounts. Lives here rather than as a fifth
          tab: it is a maintenance destination, not a daily one, and a tab that
          exists for one account crowds the bar for everyone who sees it. */}
      {userProfile?.is_admin === true && (
        <Card style={styles.card} onPress={() => navigation.navigate('Admin')}>
          <View style={styles.navRow}>
            <View>
              <Text style={styles.label}>Admin</Text>
              <Text style={styles.desc}>Catalog, tidbits, rules and seeding</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </View>
        </Card>
      )}

      {/* Send Feedback */}
      <Card style={styles.card} onPress={() => Linking.openURL('https://forms.gle/TNQCzas3JyHs3fNU9')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Send Feedback</Text>
            <Text style={styles.desc}>Share your thoughts and suggestions</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Tutorial */}
      <Card style={styles.card}>
        <Text style={styles.label}>Tutorial</Text>
        <Text style={styles.desc}>Revisit the intro of the app.</Text>
        <View style={styles.buttonRow}>
          <Button
            title="Replay Intro"
            onPress={handleReplayOnboarding}
            variant="outline"
            style={styles.halfButton}
          />
        </View>
      </Card>

      {/* Notifications */}
      <Card style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.label}>Notifications</Text>
            <Text style={styles.desc}>
              Occasional nudges when you've been away, and a recap when you've put a week
              together. At most three a week, never more than one a day.
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            disabled={pushBusy}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <Text style={styles.footnote}>
          Reminders for individual habits are set on each habit and aren't affected by this.
        </Text>
      </Card>

      {/* Dev Testing Tools — admin only, same gate as the Admin card above.
          These were shipping to every user until 2026-09-18: any account could
          wipe its own data with Clear Account or silently zero its streak with
          Simulate Streak Break. They are build tools, not features. */}
      {userProfile?.is_admin === true && (
        <>
          <Card style={{ marginTop: Spacing.lg }}>
            <Text style={{ fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.sm }}>
              Dev Testing
            </Text>
            <Button
              title="Simulate Streak Break (Comeback)"
              onPress={async () => {
                if (!user) return;
                await setDoc(doc(db, 'users', user.uid), {
                  currentStreak: 0,
                  lastActivityDate: null,
                }, { merge: true });
                showAlert('Done', 'Streak reset to 0. Go back to Home to see the comeback modal.');
              }}
              variant="outline"
              style={{ marginBottom: Spacing.sm }}
            />
            <Button
              title="Micro-Exercise: Reflection"
              onPress={() => navigation.getParent()?.navigate('Home', { screen: 'MicroExerciseFeeling', params: { trigger_context: 'reflection' } })}
              variant="outline"
              style={{ marginBottom: Spacing.sm }}
            />
            <Button
              title="Reset All Intro Flags"
              onPress={async () => {
                if (!user) return;
                const { deleteField } = await import('firebase/firestore');
                await setDoc(doc(db, 'users', user.uid), {
                  has_seen_points_intro: deleteField(),
                  has_dismissed_goal_prompt: deleteField(),
                  has_seen_debrief: deleteField(),
                  app_open_count: deleteField(),
                  // Kept in the reset list despite their features being off the
                  // tab bar: an account that still carries these flags would
                  // skip the unlock moments if Challenges is ever restored.
                  has_seen_challenges_unlock: deleteField(),
                  has_seen_training_unlock: deleteField(),
                  has_seen_craving_pointer: deleteField(),
                }, { merge: true });
                await refreshProfile();
                showAlert('Done', 'All intro flags reset.');
              }}
              variant="outline"
            />
          </Card>

          {/* Clear Account (dev tool) */}
          <Button
            title={clearing ? 'Clearing...' : 'Clear Account'}
            onPress={handleClearAccount}
            variant="outline"
            disabled={clearing}
            loading={clearing}
            style={{ marginTop: Spacing.lg }}
          />
        </>
      )}

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        style={styles.logout}
      />

      {/* Delete Account — required by the Google Play and App Store account
          deletion policies, and mirrored by the web form at
          https://version-2-4afa1.web.app/delete-account */}
      <Card style={styles.deleteCard} onPress={deleting ? undefined : handleDeleteAccount}>
        <View style={styles.navRow}>
          <View style={styles.profileInfo}>
            <Text style={[styles.label, styles.dangerLabel]}>
              {deleting ? 'Deleting Account...' : 'Delete Account'}
            </Text>
            <Text style={styles.desc}>
              Permanently erase your account and all of your data. This cannot be undone.
            </Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={Colors.danger} />
        </View>
      </Card>

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
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  card: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  email: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  username: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  profileInfo: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleText: {
    flex: 1,
  },
  footnote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  desc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  logout: { marginTop: Spacing.lg },
  deleteCard: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  dangerLabel: { color: Colors.danger },
});

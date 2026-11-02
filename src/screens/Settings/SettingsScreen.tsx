import React, { useState, useEffect, useLayoutEffect } from 'react';
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
import { registerForPushNotifications } from '../../services/notifications';
import { cancelAllHabitReminders } from '../../services/habitReminders';
import { showAlert, showConfirm } from '../../utils/alert';
import { PRIVACY_POLICY_URL } from '../../constants/links';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRedesignOn } from '../../utils/redesign';
import { LargeTitle } from '../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { TopScrim } from '../../components/common/TopScrim';
import { AppGoalsSheet } from '../../components/appSetup/AppGoalsSheet';
import { CloseOutReminderSheet } from '../../components/appSetup/CloseOutReminderSheet';
import { formatReminderTime } from '../../services/closeOutTimes';

export const SettingsScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<SettingsNavigation>();
  const [username, setUsername] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const reminderTime = userProfile?.closeout_reminder_time;
  const reminderLabel = reminderTime ? `Every day at ${formatReminderTime(reminderTime)}` : 'Off';

  // Both sheets, rendered by either layout.
  const sheets = (
    <>
      <AppGoalsSheet visible={goalsOpen} mode="edit" onClose={() => setGoalsOpen(false)} />
      <CloseOutReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
    </>
  );

  // A stored token IS the opt-in record — the same signal the server filters on,
  // so the switch shows exactly what the backend believes.
  const pushEnabled = !!userProfile?.expoPushToken;

  // The redesign (everyone's look, applied at launch) draws its own title; see the
  // grouped-list return below the handlers.
  const redesign = isRedesignOn();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  useLayoutEffect(() => {
    if (redesign) navigation.setOptions({ headerShown: false });
  }, [navigation, redesign]);

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
      showAlert('Couldn’t replay the intro', 'Please try again in a moment.');
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
      'This deletes everything in your account — sessions, ratings, streaks, XP, reflections and settings — and starts you again from the intro. Your login stays the same. This cannot be undone.',
      async () => {
        if (!user) return;
        setClearing(true);
        try {
          const result = await clearUserAccount(user.uid);
          // The evening reminder's time went with the profile; take it off the phone too.
          await cancelAllHabitReminders();
          await refreshProfile();
          showAlert('Account cleared', `Deleted ${result.deletedDocs} documents. You’re back at the start.`);
        } catch (error) {
          console.error('Error clearing account:', error);
          showAlert('Couldn’t clear the account', 'Please try again.');
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
      'This permanently deletes your account and everything in it — sessions, ratings, streaks, XP, reflections and settings. You will not be able to sign back in, and none of it can be recovered.',
      () => {
        showConfirm(
          'Are you sure?',
          'This cannot be undone.',
          async () => {
            setDeleting(true);
            try {
              await deleteAccountPermanently();
              // Only once the delete has gone through: a failed delete leaves
              // the account, so it keeps its reminders. Clearing them is a
              // device call (cancel everything scheduled), so it needs no session.
              await cancelAllHabitReminders();
              // Sign-out inside the service drops us back to the auth screen,
              // so there is no post-delete UI to return to.
            } catch (error) {
              console.error('Error deleting account:', error);
              showAlert('Couldn’t delete your account', 'Please try again in a moment.');
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
    showConfirm(
      'Sign Out',
      'Are you sure?',
      async () => {
        // Local notifications are scheduled against the device, not the account,
        // so they outlive the session. Cancel before dropping it.
        await cancelAllHabitReminders();
        // The push token is the device's, not the account's. Forget it, or this
        // account's notifications keep arriving on a phone it has left.
        if (user) await clearPushToken(user.uid).catch(() => {});
        await logOut();
      },
      'Sign Out'
    );
  };

  if (redesign) {
    // Same actions as below, as iOS-style grouped rows (canvas "Settings").
    return (
      <View style={styles.redesignRoot}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.redesignContent,
            { paddingTop: insets.top + Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg },
          ]}
        >
          <LargeTitle title="Settings" />

          <ListGroup>
            <ListRow
              title={username ? `@${username}` : 'Profile'}
              subtitle={user?.email || 'Not signed in'}
              icon={{ name: 'person', color: Colors.gray }}
              onPress={() => navigation.navigate('EditProfile')}
            />
          </ListGroup>

          <ListGroup>
            <ListRow
              title="Apps and weekly goals"
              icon={{ name: 'flag', color: Colors.primary }}
              onPress={() => setGoalsOpen(true)}
            />
            <ListRow
              title="Evening reminder"
              subtitle={reminderLabel}
              icon={{ name: 'moon', color: Colors.gray }}
              onPress={() => setReminderOpen(true)}
            />
          </ListGroup>

          <ListGroup footer="Occasional nudges when you've been away, and a recap when you've put a week together. At most three a week, never more than one a day.">
            <ListRow
              title="Notifications"
              right={
                <Switch
                  value={pushEnabled}
                  onValueChange={handleTogglePush}
                  disabled={pushBusy}
                  trackColor={{ true: Colors.primary }}
                />
              }
            />
          </ListGroup>

          <ListGroup>
            <ListRow title="Replay intro" onPress={handleReplayOnboarding} />
            <ListRow title="Send feedback" onPress={() => Linking.openURL('https://forms.gle/TNQCzas3JyHs3fNU9')} />
            <ListRow title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
          </ListGroup>

          {/* Admin only, as below: a maintenance destination, and Clear Account is a build tool. */}
          {userProfile?.is_admin === true && (
            <ListGroup title="Admin">
              <ListRow
                title="Admin"
                subtitle="Catalog, tidbits, rules and seeding"
                onPress={() => navigation.navigate('Admin')}
              />
              <ListRow
                title={clearing ? 'Clearing…' : 'Clear account'}
                tint="destructive"
                chevron={false}
                onPress={clearing ? undefined : handleClearAccount}
              />
            </ListGroup>
          )}

          <ListGroup footer="Delete account permanently erases your account and all of your data. This cannot be undone.">
            <ListRow title="Sign out" tint="accent" chevron={false} onPress={handleLogout} />
            <ListRow
              title={deleting ? 'Deleting account…' : 'Delete account'}
              tint="destructive"
              chevron={false}
              onPress={deleting ? undefined : handleDeleteAccount}
            />
          </ListGroup>
        </ScrollView>
        <TopScrim />
        {sheets}
      </View>
    );
  }

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

      {/* Apps and weekly goals (services/appSetup.ts) */}
      <Card style={styles.card} onPress={() => setGoalsOpen(true)}>
        <View style={styles.navRow}>
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Apps and Weekly Goals</Text>
            <Text style={styles.desc}>Which apps are on Today, and how often each one asks for</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* The close-out reminder (services/closeOutReminder.ts) */}
      <Card style={styles.card} onPress={() => setReminderOpen(true)}>
        <View style={styles.navRow}>
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Evening Reminder</Text>
            <Text style={styles.desc}>{reminderLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* NOTE: "How It Works" was removed 2026-09-18. It described the app as
          three pillars — Challenges, Practices, Programs — none of which are
          current: two are off the tab bar and the third is now just habits.
          Explanation lives on the screens themselves, in the "i" info icons
          (FeatureInfoModal / ScreenIntro), which is where it gets read. */}

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

      {/* Privacy Policy */}
      <Card style={styles.card} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Privacy Policy</Text>
            <Text style={styles.desc}>What we collect and how to delete it</Text>
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
      </Card>

      {/* Clear Account (dev tool) — admin only, same gate as the Admin card above.
          This was shipping to every user until 2026-09-18: any account could
          wipe its own data with it. It's a build tool, not a feature. */}
      {userProfile?.is_admin === true && (
        <Button
          title={clearing ? 'Clearing...' : 'Clear Account'}
          onPress={handleClearAccount}
          variant="outline"
          disabled={clearing}
          loading={clearing}
          style={{ marginTop: Spacing.lg }}
        />
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

      {sheets}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  redesignRoot: { flex: 1 },
  redesignContent: { paddingHorizontal: Spacing.md, gap: 24 },
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

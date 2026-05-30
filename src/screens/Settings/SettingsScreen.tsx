import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../services/auth';
import { resetOnboarding, getUser, clearUserAccount } from '../../services/users';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { registerForPushNotifications } from '../../services/notifications';
import { showAlert, showConfirm } from '../../utils/alert';

export const SettingsScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const [username, setUsername] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

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

  const handleEnableNotifications = async () => {
    try {
      console.log('Enable notifications pressed, user:', user?.uid);
      const token = await registerForPushNotifications(user?.uid);
      console.log('Token received:', token);
      if (!token) {
        showAlert('Notifications', 'Could not enable notifications. Check device settings.');
        return;
      }
      showAlert('Notifications', 'Reminders enabled! Token saved for push notifications.');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      showAlert('Error', `Failed to enable notifications: ${error}`);
    }
  };

  const handleClearAccount = () => {
    showConfirm(
      'Clear Account',
      'This will delete ALL your data (challenges, habits, streaks, points, reflections, etc.) and restart from scratch. Your login stays the same. This cannot be undone.',
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

      {/* My Why / Purpose */}
      <Card style={styles.card} onPress={() => navigation.navigate('WhyScreen')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>My Why / Purpose</Text>
            <Text style={styles.desc}>View, edit, or reflect on your personal Why statement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Reward Messages */}
      <Card style={styles.card} onPress={() => navigation.navigate('ManageRewardMessages')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Reward Messages</Text>
            <Text style={styles.desc}>Choose or create the messages you see after completing a challenge</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* How It Works */}
      <Card style={styles.card} onPress={() => navigation.navigate('HowItWorks')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>How It Works</Text>
            <Text style={styles.desc}>Learn how the Willpower Bank and points system work</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Team */}
      <Card style={styles.card} onPress={() => navigation.navigate('Team')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>My Team</Text>
            <Text style={styles.desc}>Join or create an accountability team</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* My Submissions */}
      <Card style={styles.card} onPress={() => navigation.navigate('MySubmissions')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>My Submissions</Text>
            <Text style={styles.desc}>Track challenges you've submitted to the library</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Privacy */}
      <Card style={styles.card} onPress={() => navigation.navigate('PrivacySettings')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Privacy</Text>
            <Text style={styles.desc}>Control how your activity is shared</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

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
        <Text style={styles.label}>Notifications</Text>
        <Text style={styles.desc}>
          Get a morning reminder to set your challenge and an evening nudge to complete it.
        </Text>
        <Button
          title="Enable Reminders"
          onPress={handleEnableNotifications}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Dev Testing Tools */}
      <Card style={{ marginTop: Spacing.lg }}>
        <Text style={{ fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.sm }}>
          Dev Testing
        </Text>
        <Button
          title="Simulate Day 2 (Goal Prompt)"
          onPress={async () => {
            if (!user) return;
            await setDoc(doc(db, 'users', user.uid), {
              has_seen_plan_intro: true,
              has_seen_points_intro: true,
              has_dismissed_goal_prompt: false,
              app_open_count: 2,
            }, { merge: true });
            await refreshProfile();
            showAlert('Done', 'Day 2 state set. Go back to Home to see the goal prompt.');
          }}
          variant="outline"
          style={{ marginBottom: Spacing.sm }}
        />
        <Button
          title="Simulate Day 3 (Challenge Unlock)"
          onPress={async () => {
            if (!user) return;
            await setDoc(doc(db, 'users', user.uid), {
              has_seen_plan_intro: true,
              has_seen_points_intro: true,
              has_dismissed_goal_prompt: true,
              has_seen_challenges_unlock: false,
              totalHabitsCompleted: 2,
            }, { merge: true });
            await refreshProfile();
            showAlert('Done', 'Day 3 state set. Complete one more habit on Home to trigger the unlock.');
          }}
          variant="outline"
          style={{ marginBottom: Spacing.sm }}
        />
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
          onPress={() => navigation.navigate('Home', { screen: 'MicroExerciseFeeling', params: { trigger_context: 'reflection' } })}
          variant="outline"
          style={{ marginBottom: Spacing.sm }}
        />
        <Button
          title="Reset All Intro Flags"
          onPress={async () => {
            if (!user) return;
            const { deleteField } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', user.uid), {
              has_seen_plan_intro: deleteField(),
              has_seen_points_intro: deleteField(),
              has_dismissed_goal_prompt: deleteField(),
              has_seen_challenges_unlock: deleteField(),
              app_open_count: deleteField(),
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

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        style={styles.logout}
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
});

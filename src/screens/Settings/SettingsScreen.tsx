import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../services/auth';
import { resetOnboarding, getUser } from '../../services/users';
import {
  scheduleMorningReminder,
  scheduleEveningReminder,
  registerForPushNotifications,
} from '../../services/notifications';
import { showAlert, showConfirm } from '../../utils/alert';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';
import {
  seedChallengeLibrary,
  clearChallengeLibrary,
  getChallengeLibraryCount,
} from '../../utils/seedChallengeLibrary';

export const SettingsScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough, restartWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'Settings';
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [seedingLibrary, setSeedingLibrary] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const userData = await getUser(user.uid);
        setIsAdmin(userData?.is_admin === true);
        setUsername(userData?.username || null);

        // Load library count for admin
        if (userData?.is_admin) {
          const count = await getChallengeLibraryCount();
          setLibraryCount(count);
        }
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
      await scheduleMorningReminder();
      await scheduleEveningReminder();
      showAlert('Notifications', 'Reminders enabled! Token saved for push notifications.');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      showAlert('Error', `Failed to enable notifications: ${error}`);
    }
  };

  const handleLogout = () => {
    showConfirm('Sign Out', 'Are you sure?', logOut, 'Sign Out');
  };

  const handleSeedLibrary = async () => {
    setSeedingLibrary(true);
    try {
      const count = await seedChallengeLibrary();
      setLibraryCount(await getChallengeLibraryCount());
      showAlert('Success', `Added ${count} challenges to the library.`);
    } catch (error) {
      console.error('Error seeding library:', error);
      showAlert('Error', 'Failed to seed challenge library.');
    } finally {
      setSeedingLibrary(false);
    }
  };

  const handleClearLibrary = () => {
    showConfirm(
      'Clear Library',
      'This will delete all challenges from the library. Are you sure?',
      async () => {
        setSeedingLibrary(true);
        try {
          const count = await clearChallengeLibrary();
          setLibraryCount(0);
          showAlert('Cleared', `Removed ${count} challenges from the library.`);
        } catch (error) {
          console.error('Error clearing library:', error);
          showAlert('Error', 'Failed to clear challenge library.');
        } finally {
          setSeedingLibrary(false);
        }
      },
      'Clear All'
    );
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

      {/* Categories */}
      <Card style={styles.card} onPress={() => navigation.navigate('ManageCategories')}>
        <View style={styles.navRow}>
          <View>
            <Text style={styles.label}>Categories</Text>
            <Text style={styles.desc}>Add or remove challenge and habit categories</Text>
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

      {/* Admin - only visible to admins */}
      {isAdmin && (
        <>
          <Card style={styles.card} onPress={() => navigation.navigate('AdminSubmissions')}>
            <View style={styles.navRow}>
              <View>
                <Text style={styles.label}>Review Submissions</Text>
                <Text style={styles.desc}>Approve or reject community challenge submissions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.label}>Challenge Library</Text>
            <Text style={styles.desc}>
              Manage the challenge library database.
              {libraryCount !== null ? ` Currently ${libraryCount} challenges.` : ''}
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Seed Library"
                onPress={handleSeedLibrary}
                variant="secondary"
                loading={seedingLibrary}
                disabled={seedingLibrary}
                style={styles.halfButton}
              />
              <Button
                title="Clear Library"
                onPress={handleClearLibrary}
                variant="outline"
                loading={seedingLibrary}
                disabled={seedingLibrary}
                style={styles.halfButton}
              />
            </View>
          </Card>
        </>
      )}

      {/* Tutorial */}
      <Card style={styles.card}>
        <Text style={styles.label}>Tutorial</Text>
        <Text style={styles.desc}>Revisit the intro or guided walkthrough of the app.</Text>
        <View style={styles.buttonRow}>
          <Button
            title="Replay Intro"
            onPress={handleReplayOnboarding}
            variant="outline"
            style={styles.halfButton}
          />
          <Button
            title="Replay Tutorial"
            onPress={restartWalkthrough}
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

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        style={styles.logout}
      />

      {isMyStep && (
        <WalkthroughOverlay
          visible
          stepText={currentStepConfig?.text || ''}
          stepNumber={currentStep}
          totalSteps={WALKTHROUGH_STEPS.length}
          isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
          onNext={nextStep}
          onSkip={skipWalkthrough}
        />
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

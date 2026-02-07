import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../services/auth';
import { resetOnboarding } from '../../services/users';
import {
  scheduleMorningReminder,
  scheduleEveningReminder,
  registerForPushNotifications,
} from '../../services/notifications';
import { showAlert, showConfirm } from '../../utils/alert';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';

export const SettingsScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough, restartWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'Settings';

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

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Settings</Text>

      {/* Profile */}
      <Card style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.email}>{user?.email || 'Not signed in'}</Text>
      </Card>

      {/* Categories */}
      <TouchableOpacity onPress={() => navigation.navigate('ManageCategories')} activeOpacity={0.7}>
        <Card style={styles.card}>
          <View style={styles.navRow}>
            <View>
              <Text style={styles.label}>Categories</Text>
              <Text style={styles.desc}>Add or remove challenge and habit categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </View>
        </Card>
      </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    padding: Spacing.lg,
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
    fontSize: FontSizes.md,
    color: Colors.gray,
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

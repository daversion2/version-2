import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { ManageCategoriesScreen } from '../screens/Settings/ManageCategoriesScreen';
import { HowItWorksScreen } from '../screens/Settings/HowItWorksScreen';
import { TeamScreen } from '../screens/Community/TeamScreen';
import { CreateTeamScreen } from '../screens/Community/CreateTeamScreen';
import { JoinTeamScreen } from '../screens/Community/JoinTeamScreen';
import { TeamDetailScreen } from '../screens/Community/TeamDetailScreen';
import { MySubmissionsScreen } from '../screens/Community/MySubmissionsScreen';
import { PrivacySettingsScreen } from '../screens/Settings/PrivacySettingsScreen';
import { AdminSubmissionsScreen } from '../screens/Settings/AdminSubmissionsScreen';
import { EditProfileScreen } from '../screens/Settings/EditProfileScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator();

export const SettingsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FBFBFB' },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
      headerShadowVisible: false,
      headerTransparent: false,
      headerBlurEffect: undefined,
    }}
  >
    <Stack.Screen
      name="SettingsScreen"
      component={SettingsScreen}
      options={{
        title: 'Settings',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
      }}
    />
    <Stack.Screen
      name="ManageCategories"
      component={ManageCategoriesScreen}
      options={{ title: 'Categories' }}
    />
    <Stack.Screen
      name="HowItWorks"
      component={HowItWorksScreen}
      options={{ title: 'How It Works' }}
    />
    <Stack.Screen
      name="Team"
      component={TeamScreen}
      options={{ title: 'My Team' }}
    />
    <Stack.Screen
      name="CreateTeam"
      component={CreateTeamScreen}
      options={{ title: 'Create Team' }}
    />
    <Stack.Screen
      name="JoinTeam"
      component={JoinTeamScreen}
      options={{ title: 'Join Team' }}
    />
    <Stack.Screen
      name="TeamDetail"
      component={TeamDetailScreen}
      options={{ title: 'Team Activity' }}
    />
    <Stack.Screen
      name="MySubmissions"
      component={MySubmissionsScreen}
      options={{ title: 'My Submissions' }}
    />
    <Stack.Screen
      name="PrivacySettings"
      component={PrivacySettingsScreen}
      options={{ title: 'Privacy' }}
    />
    <Stack.Screen
      name="AdminSubmissions"
      component={AdminSubmissionsScreen}
      options={{ title: 'Review Submissions' }}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
  },
});

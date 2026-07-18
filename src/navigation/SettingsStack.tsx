import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types/navigation';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { HowItWorksScreen } from '../screens/Settings/HowItWorksScreen';
import { EditProfileScreen } from '../screens/Settings/EditProfileScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator<SettingsStackParamList>();

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
      name="HowItWorks"
      component={HowItWorksScreen}
      options={{ title: 'How It Works' }}
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

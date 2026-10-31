import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types/navigation';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { EditProfileScreen } from '../screens/Settings/EditProfileScreen';
import { AdminStack } from './AdminStack';
import { stackHeaderOptions } from './headerOptions';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={stackHeaderOptions}
  >
    <Stack.Screen
      name="SettingsScreen"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
    <Stack.Screen
      name="Admin"
      component={AdminStack}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
  </Stack.Navigator>
);

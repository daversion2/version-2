import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { ManageCategoriesScreen } from '../screens/Settings/ManageCategoriesScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator();

export const SettingsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.white },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
    }}
  >
    <Stack.Screen
      name="SettingsScreen"
      component={SettingsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ManageCategories"
      component={ManageCategoriesScreen}
      options={{ title: 'Categories' }}
    />
  </Stack.Navigator>
);

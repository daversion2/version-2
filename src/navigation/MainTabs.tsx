import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { LibraryStack } from './LibraryStack';
import { ProgressStack } from './ProgressStack';
// ---- Archived tabs ---------------------------------------------------------
// Challenges/Training and Tools are no longer registered as tabs. The app is a
// habit tracker built on resistance; these belong to the previous direction.
// Nothing is deleted — the stacks, screens and param types all still exist, so
// re-adding a <Tab.Screen> below brings either one straight back.
// import { ChallengesStack } from './ChallengesStack';
// import { WorksheetsStack } from './WorksheetsStack';
import { SettingsStack } from './SettingsStack';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'today' : 'today-outline';
          else if (route.name === 'Library')
            iconName = focused ? 'library' : 'library-outline';
          else if (route.name === 'Progress')
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          else if (route.name === 'Settings')
            iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: {
          fontFamily: Fonts.secondary,
          fontSize: FontSizes.xs,
        },
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Today' }} />
      <Tab.Screen name="Library" component={LibraryStack} />
      <Tab.Screen name="Progress" component={ProgressStack} />
      {/* Archived — see the import block above for how to restore either tab.
      <Tab.Screen name="Challenges" component={ChallengesStack} options={{ tabBarLabel: 'Training' }} />
      <Tab.Screen name="Tools" component={WorksheetsStack} /> */}
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { ChallengesStack } from './ChallengesStack';
import { ProgressStack } from './ProgressStack';
import { CommunityStack } from './CommunityStack';
import { SettingsStack } from './SettingsStack';
import { AdminStack } from './AdminStack';
import { useAuth } from '../context/AuthContext';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Tab = createBottomTabNavigator();

export const MainTabs: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Challenges')
            iconName = focused ? 'trophy' : 'trophy-outline';
          else if (route.name === 'Community')
            iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Progress')
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Settings')
            iconName = focused ? 'settings' : 'settings-outline';
          else if (route.name === 'Admin')
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
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
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Challenges" component={ChallengesStack} />
      <Tab.Screen name="Community" component={CommunityStack} />
      <Tab.Screen name="Progress" component={ProgressStack} />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{ headerShown: false }}
        />
      )}
    </Tab.Navigator>
  );
};

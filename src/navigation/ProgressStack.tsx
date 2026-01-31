import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProgressScreen } from '../screens/Progress/ProgressScreen';
import { DayDetailScreen } from '../screens/Progress/DayDetailScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator();

export const ProgressStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.white },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
    }}
  >
    <Stack.Screen
      name="ProgressScreen"
      component={ProgressScreen}
      options={{ title: 'Progress' }}
    />
    <Stack.Screen
      name="DayDetail"
      component={DayDetailScreen}
      options={{ title: 'Day Detail' }}
    />
    <Stack.Screen
      name="ChallengeDetail"
      component={ChallengeDetailScreen}
      options={{ title: 'Challenge' }}
    />
  </Stack.Navigator>
);

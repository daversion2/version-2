import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PracticesStackParamList } from '../types/navigation';
import { PracticesScreen } from '../screens/Practices/PracticesScreen';
import { PracticeDetailScreen } from '../screens/Practices/PracticeDetailScreen';
import { PracticeSessionScreen } from '../screens/Practices/PracticeSessionScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator<PracticesStackParamList>();

export const PracticesStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FBFBFB' },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="PracticesHome" component={PracticesScreen} options={{ title: 'Practices' }} />
    <Stack.Screen name="PracticeDetail" component={PracticeDetailScreen} options={{ title: '' }} />
    <Stack.Screen name="PracticeSession" component={PracticeSessionScreen} options={{ title: '' }} />
  </Stack.Navigator>
);

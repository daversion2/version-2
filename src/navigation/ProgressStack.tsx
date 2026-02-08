import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProgressScreen } from '../screens/Progress/ProgressScreen';
import { DayDetailScreen } from '../screens/Progress/DayDetailScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator();

export const ProgressStack: React.FC = () => (
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
      name="ProgressScreen"
      component={ProgressScreen}
      options={{
        title: 'Progress',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
      }}
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

const styles = StyleSheet.create({
  headerLogo: {
    width: 36,
    height: 36,
  },
});

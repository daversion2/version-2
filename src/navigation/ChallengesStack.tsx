import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChallengesScreen } from '../screens/Challenges/ChallengesScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator();

export const ChallengesStack: React.FC = () => (
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
      name="ChallengesScreen"
      component={ChallengesScreen}
      options={{
        title: 'Challenges',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
      }}
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

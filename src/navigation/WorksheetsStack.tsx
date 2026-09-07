import React from 'react';
import { Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorksheetsStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { WorksheetLibraryScreen } from '../screens/Worksheets/WorksheetLibraryScreen';
import { ToolConversationScreen } from '../screens/Tools/ToolConversationScreen';
import { WorksheetHistoryScreen } from '../screens/Worksheets/WorksheetHistoryScreen';
import { WorksheetDetailScreen } from '../screens/Worksheets/WorksheetDetailScreen';
import { YourStoryLandingScreen } from '../screens/YourStory/YourStoryLandingScreen';
import { AddProofPointScreen } from '../screens/YourStory/AddProofPointScreen';
import { ProofPointLibraryScreen } from '../screens/YourStory/ProofPointLibraryScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';
import { HEADER_BUTTON_SIZE } from '../components/common/ScreenIntro';

const logo = require('../../assets/Neuro-Nudge_Mark_Blue.png');

const Stack = createNativeStackNavigator<WorksheetsStackParamList>();

export const WorksheetsStack: React.FC = () => (
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
      name="WorksheetLibraryScreen"
      component={WorksheetLibraryScreen}
      options={({ navigation }) => ({
        title: 'Tools',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('WorksheetHistory')}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Worksheet history"
          >
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="WorksheetForm"
      component={ToolConversationScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="WorksheetHistory"
      component={WorksheetHistoryScreen}
      options={{ title: 'History' }}
    />
    <Stack.Screen
      name="WorksheetDetail"
      component={WorksheetDetailScreen}
      options={{ title: 'Entry' }}
    />
    <Stack.Screen
      name="YourStoryLanding"
      component={YourStoryLandingScreen}
      options={{ title: 'Your Story' }}
    />
    <Stack.Screen
      name="AddProofPoint"
      component={AddProofPointScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ProofPointLibrary"
      component={ProofPointLibraryScreen}
      options={{ title: 'Your Story' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  // Fixed square so the glyph sits centred inside the Liquid Glass capsule iOS
  // 26 draws behind every bar button item. See components/common/ScreenIntro.
  headerButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
});

import React from 'react';
import { Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorksheetsStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { WorksheetLibraryScreen } from '../screens/Worksheets/WorksheetLibraryScreen';
import { ToolConversationScreen } from '../screens/Tools/ToolConversationScreen';
import { WorksheetHistoryScreen } from '../screens/Worksheets/WorksheetHistoryScreen';
import { WorksheetDetailScreen } from '../screens/Worksheets/WorksheetDetailScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
  },
});

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes } from '../constants/theme';

/**
 * Every stack's header. Built when this module first loads, which is after the
 * redesign check in App.tsx, so it picks up whichever theme is active.
 */
export const stackHeaderOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: Colors.headerBg },
  headerTintColor: Colors.primary,
  headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
};

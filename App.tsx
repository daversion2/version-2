import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Platform } from 'react-native';
import { loadRedesignPref } from './src/services/redesignPref';
import { applyRedesign } from './src/utils/redesign';

SplashScreen.preventAutoHideAsync();

// The app tree loads only after the redesign check below: every screen builds
// its StyleSheet from the theme when its module first runs, so the theme has to
// be final before then (see utils/redesign.ts). Keep these as requires inside
// this function — a top-level import would load every screen too early.
const loadAppTree = () => ({
  AuthProvider: (require('./src/context/AuthContext') as typeof import('./src/context/AuthContext')).AuthProvider,
  ToolsProvider: (require('./src/context/ToolsContext') as typeof import('./src/context/ToolsContext')).ToolsProvider,
  CopyProvider: (require('./src/context/CopyContext') as typeof import('./src/context/CopyContext')).CopyProvider,
  RootNavigator: (require('./src/navigation/RootNavigator') as typeof import('./src/navigation/RootNavigator'))
    .RootNavigator,
});

const startRedesignIfOn = async () => {
  if (await loadRedesignPref()) applyRedesign();
};

// Configure Google Sign-In (native module — web uses Firebase signInWithPopup instead)
if (Platform.OS !== 'web') {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: '439501865821-fftpekgkpkblrr68uqemt0kvmih2ipkc.apps.googleusercontent.com', // Get this from Firebase Console
  });
}

export default function App() {
  const [tree, setTree] = React.useState<ReturnType<typeof loadAppTree> | null>(null);
  const fontsLoaded = tree !== null;

  React.useEffect(() => {
    async function loadFonts() {
      try {
        await startRedesignIfOn();
        // Load brand fonts — add actual font files to ./assets/fonts/
        // For now, the app will fall back to system fonts if files aren't present
        await Font.loadAsync({
          // 'Garet': require('./assets/fonts/Garet-Regular.otf'),
          // 'Garet-Bold': require('./assets/fonts/Garet-Bold.otf'),
          // 'RacingSansOne': require('./assets/fonts/RacingSansOne-Regular.ttf'),
        });
      } catch (e) {
        console.warn('Font loading skipped:', e);
      } finally {
        setTree(loadAppTree());
      }
    }
    loadFonts();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!tree) return null;
  const { AuthProvider, CopyProvider, ToolsProvider, RootNavigator } = tree;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <AuthProvider>
        <CopyProvider>
          <ToolsProvider>
            <RootNavigator />
          </ToolsProvider>
        </CopyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ToolsProvider } from './src/context/ToolsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

// Configure Google Sign-In (native module — web uses Firebase signInWithPopup instead)
if (Platform.OS !== 'web') {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: '439501865821-fftpekgkpkblrr68uqemt0kvmih2ipkc.apps.googleusercontent.com', // Get this from Firebase Console
  });
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    async function loadFonts() {
      try {
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
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <AuthProvider>
        <ToolsProvider>
          <RootNavigator />
        </ToolsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

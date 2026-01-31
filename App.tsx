import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

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
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import "../global.css";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Slot, Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { AppState, AppStateStatus, View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "./error-boundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { MemoryManager } from "@/utils/memoryUtils";
import { useSongStore } from "@/store/songStore";
import { useKeepAwake } from "@/utils/keepAwakeUtils";
import { useAuthStore } from "@/store/authStore";
import { initDatabase } from "@/db/database";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <StatusBar style="auto" />
            <LayoutContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LayoutContent() {
  const { cleanupOrphanedAudioFiles } = useSongStore();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [dbInitialized, setDbInitialized] = useState(false);

  useKeepAwake();

  // Initialize database and load user on app start
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function initialize() {
      try {
        console.log('=== App Initialization Started ===');

        console.log('Step 1: Initializing local database...');
        await initDatabase();
        console.log('✓ Local database initialized successfully');

        console.log('Step 2: Loading user session from Supabase...');
        await loadUser();
        console.log('✓ User session loaded successfully');

        setDbInitialized(true);
        console.log('=== App Initialization Complete ===');
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }

        // IMPORTANT: Always set to true to prevent black screen
        // The app can still function with some features disabled
        console.log('⚠️  Continuing app startup despite errors...');
        setDbInitialized(true);
      }
    }

    // Failsafe: If initialization takes more than 10 seconds, force continue
    timeoutId = setTimeout(() => {
      if (!dbInitialized) {
        console.warn('⚠️  Initialization timeout - forcing app to continue');
        setDbInitialized(true);
      }
    }, 10000);

    initialize();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Handle authentication routing
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and trying to access auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupOrphanedAudioFiles();
      } catch (error) {
        console.error('Error during audio cleanup:', error);
      }
    };

    const timer = setTimeout(cleanup, 2000);
    return () => clearTimeout(timer);
  }, [cleanupOrphanedAudioFiles]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          MemoryManager.cleanupAll();
        } catch (error) {
          console.error('Memory cleanup error:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Show loading screen while initializing (NEVER show black screen)
  if (isLoading || !dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#FFF', fontSize: 18, marginBottom: 10 }}>SetMaster Pro</Text>
        <Text style={{ color: '#888', fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return <Slot />;
}
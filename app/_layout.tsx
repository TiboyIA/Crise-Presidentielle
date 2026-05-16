import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { EntitlementsProvider } from "@/lib/entitlements";
import { StrategyProvider } from "@/context/StrategyContext";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0a0c0e" },
        animation: "fade",
      }}
    >
      {/* Strategy game screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="nation" />
      <Stack.Screen name="buildings" />
      <Stack.Screen name="worldmap" />
      <Stack.Screen name="operations" />
      <Stack.Screen name="ranking" />
      <Stack.Screen name="missions" />
      <Stack.Screen name="journal-crise" />
      <Stack.Screen name="strategy-research" />
      <Stack.Screen name="ranking-global" />
      <Stack.Screen name="account-link" />
      <Stack.Screen name="briefing" options={{ presentation: "modal" }} />
      <Stack.Screen name="mandate-review" options={{ presentation: "modal" }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="saves" />
      <Stack.Screen name="strategy-debug" />
      {/* Classic game screens */}
      <Stack.Screen name="tutorial" />
      <Stack.Screen name="create" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="journal" options={{ presentation: "modal" }} />
      <Stack.Screen name="game-over" />
      <Stack.Screen name="shop" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [appReady, setAppReady] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!appReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoadingScreen onComplete={() => setAppReady(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0c0e" }}>
            <KeyboardProvider>
              <AuthProvider>
                <EntitlementsProvider>
                  <StrategyProvider>
                    <GameProvider>
                      <StatusBar style="light" />
                      <RootLayoutNav />
                    </GameProvider>
                  </StrategyProvider>
                </EntitlementsProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

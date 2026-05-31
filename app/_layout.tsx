import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { track as telemetry } from "@/services/TelemetryService";
import { CrisisAlertOverlay } from "@/components/CrisisAlertOverlay";
import { SmartPauseOverlay } from "@/components/SmartPauseOverlay";
import { OneHandBar } from "@/components/OneHandBar";
import { SandboxWatermark } from "@/components/SandboxWatermark";
import { GameProvider } from "@/context/GameContext";
import { EntitlementsProvider } from "@/lib/entitlements";
import { StrategyProvider } from "@/context/StrategyContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PortraitProvider } from "@/context/PortraitContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ComfortProvider } from "@/context/ComfortContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { usePushNotifications } from "@/hooks/usePushNotifications";

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const queryClient = new QueryClient();

function PushRegistrar() {
  const auth = useAuth();
  usePushNotifications(auth.accessToken);
  return null;
}

function RootLayoutNav() {
  return (
    <View style={{ flex: 1 }}>
    <CrisisAlertOverlay />
    <SmartPauseOverlay />
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
      <Stack.Screen name="cellule-sante" />
      <Stack.Screen name="strategy-research" />
      <Stack.Screen name="ranking-global" />
      <Stack.Screen name="player-profile" />
      <Stack.Screen name="alliances" />
      <Stack.Screen name="mission-reports" />
      <Stack.Screen name="spy-ops" />
      <Stack.Screen name="cyber-ops" />
      <Stack.Screen name="entities" />
      <Stack.Screen name="ranking-pvp" />
      <Stack.Screen name="account-link" />
      <Stack.Screen name="briefing" options={{ presentation: "modal" }} />
      <Stack.Screen name="mandate-review" options={{ presentation: "modal" }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="saves" />
      <Stack.Screen name="strategy-debug" />
      <Stack.Screen name="compliance" />
      <Stack.Screen name="strategy-cabinet" />
      <Stack.Screen name="dev-sandbox" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="recovery" />
      {/* Classic game screens */}
      <Stack.Screen name="tutorial" />
      <Stack.Screen name="create" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="journal" options={{ presentation: "modal" }} />
      <Stack.Screen name="game-over" />
      <Stack.Screen name="shop" options={{ presentation: "modal" }} />
    </Stack>
    <OneHandBar />
    <SandboxWatermark />
    </View>
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

  useEffect(() => {
    void telemetry("app_open");
  }, []);

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
                <PushRegistrar />
                <ThemeProvider>
                <ComfortProvider>
                <EntitlementsProvider>
                  <StrategyProvider>
                    <GameProvider>
                      <PortraitProvider>
                        <StatusBar style="light" />
                        <RootLayoutNav />
                      </PortraitProvider>
                    </GameProvider>
                  </StrategyProvider>
                </EntitlementsProvider>
                </ComfortProvider>
                </ThemeProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

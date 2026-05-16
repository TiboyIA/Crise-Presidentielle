import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEffect } from "react";

const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const EXPO_PROJECT_ID = "8ae12bcb-3626-4971-a816-e0fd7949214f";

export function usePushNotifications(accessToken: string | null) {
  useEffect(() => {
    if (!accessToken || Platform.OS === "web") return;
    void registerToken(accessToken);
  }, [accessToken]);
}

async function registerToken(accessToken: string): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    await fetch(`${BASE_URL}/functions/v1/push-register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({ pushToken }),
    });
  } catch {
    // Non-fatal: push notifications are best-effort
  }
}

import { Platform } from "react-native";

function required(name: string, value: string | undefined): string {
  if (
    !value ||
    value.includes("PLACEHOLDER") ||
    value.includes("CHANGE_ME") ||
    value.includes("REMPLACER")
  ) {
    throw new Error(`[ENV] Variable manquante ou invalide : ${name}`);
  }
  return value;
}

function optional(value: string | undefined, fallback = ""): string {
  return value ?? fallback;
}

export const ENV = {
  revenueCatApiKey:
    Platform.OS === "ios"
      ? required(
          "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
          process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
        )
      : required(
          "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
          process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        ),

  supabaseUrl: required(
    "EXPO_PUBLIC_SUPABASE_URL",
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),

  supabaseAnonKey: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),

  apiBaseUrl: optional(process.env.EXPO_PUBLIC_API_BASE_URL),
};

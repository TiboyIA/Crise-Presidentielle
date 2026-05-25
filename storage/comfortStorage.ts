import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProfileId } from "@/constants/accessibilityProfiles";

const KEY = "@comfort_v1";

export interface ComfortStorage {
  enabled: boolean;
  oneHand: boolean;
  lowLoad: boolean;
  profileId: ProfileId;
}

const DEFAULT: ComfortStorage = { enabled: false, oneHand: false, lowLoad: false, profileId: "standard" };

export async function loadComfortStorage(): Promise<ComfortStorage> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ComfortStorage>;
    return {
      enabled:   parsed.enabled   ?? false,
      oneHand:   parsed.oneHand   ?? false,
      lowLoad:   parsed.lowLoad   ?? false,
      profileId: parsed.profileId ?? "standard",
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveComfortStorage(data: ComfortStorage): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

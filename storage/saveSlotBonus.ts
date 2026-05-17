import AsyncStorage from "@react-native-async-storage/async-storage";

// UI cache only — source of truth is RevenueCat/server entitlements.
// Never trust this value to unlock server-side features.
const KEY = "@bonus_save_slots_v1";

// SECURITY NOTE: this reads AsyncStorage (unencrypted). On a rooted/jailbroken device
// anyone can write "true" here without paying. Impact is limited (extra save slots =
// zero gameplay or PvP advantage). When the product goes on sale, gate actual slot
// access on the server-side entitlement (player-entitlements Edge Function) instead.
export async function hasBonusSlots(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

export async function grantBonusSlots(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}

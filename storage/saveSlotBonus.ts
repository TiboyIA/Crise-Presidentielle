import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@bonus_save_slots_v1";

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

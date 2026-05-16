import AsyncStorage from "@react-native-async-storage/async-storage";
import { FREE_PORTRAIT_ID, type PortraitId } from "@/data/portraits";

const KEY = "@president_cosmetics_v1";

export interface PortraitStorage {
  selectedPortraitId: PortraitId;
  ownedPortraitIds: PortraitId[];
}

const DEFAULT_STORAGE: PortraitStorage = {
  selectedPortraitId: FREE_PORTRAIT_ID,
  ownedPortraitIds: [FREE_PORTRAIT_ID],
};

export async function loadPortraitStorage(): Promise<PortraitStorage> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STORAGE;
    const parsed = JSON.parse(raw) as Partial<PortraitStorage>;
    return {
      selectedPortraitId: parsed.selectedPortraitId ?? FREE_PORTRAIT_ID,
      ownedPortraitIds: Array.isArray(parsed.ownedPortraitIds)
        ? parsed.ownedPortraitIds
        : [FREE_PORTRAIT_ID],
    };
  } catch {
    return DEFAULT_STORAGE;
  }
}

export async function savePortraitStorage(data: PortraitStorage): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

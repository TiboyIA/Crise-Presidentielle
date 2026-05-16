import AsyncStorage from "@react-native-async-storage/async-storage";
import { FREE_THEME_ID, type ThemeId } from "@/data/themes";

const KEY = "@ui_theme_v1";

export interface ThemeStorage {
  selectedThemeId: ThemeId;
  ownedThemeIds: ThemeId[];
}

const DEFAULT_STORAGE: ThemeStorage = {
  selectedThemeId: FREE_THEME_ID,
  ownedThemeIds: [FREE_THEME_ID],
};

export async function loadThemeStorage(): Promise<ThemeStorage> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STORAGE;
    const parsed = JSON.parse(raw) as Partial<ThemeStorage>;
    return {
      selectedThemeId: parsed.selectedThemeId ?? FREE_THEME_ID,
      ownedThemeIds: Array.isArray(parsed.ownedThemeIds)
        ? parsed.ownedThemeIds
        : [FREE_THEME_ID],
    };
  } catch {
    return DEFAULT_STORAGE;
  }
}

export async function saveThemeStorage(data: ThemeStorage): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
